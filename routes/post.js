const express = require('express');
const router = express.Router();
const Post = require('../model/Post');
const Comment = require('../model/Comment');
const User = require('../model/User');
const ListFriend = require('../model/ListFriend');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const Message = require('../model/Message');

async function updateUserTag(userId) {
    const posts = await Post.find({ userId });
    const comments = await Comment.find({ userId }).populate('postId', 'type');
    const likedPosts = await Post.find({ userReactions: userId }).populate('userId', 'type');
    const messagesWithType = await Message.find({ sender: userId, type: { $ne: null } });

    const typeCount = {};
    
    // Count from user's posts
    posts.forEach(p => {
        if (p.type) typeCount[p.type] = (typeCount[p.type] || 0) + 1;
    });
    
    // Count from user's comments
    comments.forEach(c => {
        if (c.postId && c.postId.type) typeCount[c.postId.type] = (typeCount[c.postId.type] || 0) + 1;
    });

    // Count from user's likes
    likedPosts.forEach(p => {
        if (p.type) typeCount[p.type] = (typeCount[p.type] || 0) + 1;
    });

    // Count from user's sent messages with image type
    messagesWithType.forEach(m => {
        if (m.type && m.type !== 'none' && m.type !== 'null') typeCount[m.type] = (typeCount[m.type] || 0) + 1;
    });

    let maxType = "";
    let maxCount = 0;
    for (const [type, count] of Object.entries(typeCount)) {
        if (count > maxCount) {
            maxType = type;
            maxCount = count;
        }
    }

    await User.findByIdAndUpdate(userId, { tag: maxType });
}
// ✅ Cấu hình multer để lưu ảnh
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/img'));
  },
  filename: (req, file, cb) => {
    const originalName = file.originalname.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const cleanName = originalName.replace(/[^a-zA-Z0-9.-]/g, '-');
    const uniqueName = `${Date.now()}-${cleanName}`;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// 📸 API tạo bài viết
router.post('/create', upload.single('image'), async (req, res) => {
  try {
    const { userId, status, privacy } = req.body;
    const image = req.file ? req.file.filename : null;

    const newPost = new Post({
      userId,
      status,
      image,
      privacy,
      time: new Date().toLocaleString(),
      type: 'pending' // sẽ được update sau
    });

    await newPost.save();
    res.status(201).json({ message: 'Bài viết đang được tạo!', postId: newPost._id });

    // ⏳ Gọi phân loại nếu có ảnh
    if (image) {
      classifyImageAndUpdatePost(newPost._id, image);
    }
    // Cập nhật tag cho user
    updateUserTag(userId);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi tạo bài viết', details: err.message });
  }
});

// 🧠 Hàm phân loại ảnh và cập nhật bài viết
async function classifyImageAndUpdatePost(postId, image) {
  try {
    const imagePath = path.join(__dirname, '../public/img', image);

    // 🧱 Kiểm tra file tồn tại
    if (!fs.existsSync(imagePath)) {
      console.error("❌ Ảnh không tồn tại:", imagePath);
      return;
    }

    // === Gửi ảnh đến API scene
    const formData1 = new FormData();
    formData1.append('image', fs.createReadStream(imagePath));
    const sceneResponse = await axios.post(
      'https://7641-34-125-91-200.ngrok-free.app/predict-scene',
      formData1,
      { headers: formData1.getHeaders() }
    );

    let predictedType = 'none';
    if (sceneResponse.data?.scene) {
      predictedType = sceneResponse.data.scene;
    }
    console.log(`🔍 Scene dự đoán: ${predictedType}`);

    // 🔪 Kiểm tra và tự động xóa bài viết có nội dung nguy hiểm
    if (predictedType === 'knife' || predictedType === 'gun') {
      console.log(`🚨 Phát hiện nội dung nguy hiểm: ${predictedType} - Tự động xóa bài viết ${postId}`);
      
      // Xóa file ảnh
      try {
        fs.unlinkSync(imagePath);
        console.log(`🗑️ Đã xóa file ảnh: ${image}`);
      } catch (err) {
        console.error(`❌ Lỗi xóa file ảnh: ${err.message}`);
      }
      
      // Xóa bài viết khỏi database
      await Post.findByIdAndDelete(postId);
      console.log(`✅ Đã xóa bài viết ${postId} do chứa nội dung nguy hiểm`);
      return;
    }

    // === Gửi lại ảnh đến API province
    const formData2 = new FormData();
    formData2.append('image', fs.createReadStream(imagePath));
    const provinceResponse = await axios.post(
      'https://7641-34-125-91-200.ngrok-free.app/predict-province',
      formData2,
      { headers: formData2.getHeaders() }
    );

    let predictedProvince = '';
    if (provinceResponse.data?.province) {
      predictedProvince = provinceResponse.data.province;
    }
    console.log(`📍 Tỉnh dự đoán: ${predictedProvince}`);

    // === Cập nhật bài viết
    await Post.findByIdAndUpdate(postId, {
      type: predictedType,
      location: predictedProvince,
    });

    console.log(`✅ Đã cập nhật bài viết ${postId}`);

  } catch (err) {
    console.error("❌ Lỗi phân loại hình ảnh:", err.message);
  }
}

// 📥 API lấy tất cả bài viết
router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: 'Thiếu userId' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Lấy danh sách bạn bè
    const friends = await ListFriend.find({
      status: "friend",
      $or: [
        { userId1: userId },
        { userId2: userId }
      ]
    });
    const friendIds = friends.map(f =>
      f.userId1.toString() === userId ? f.userId2.toString() : f.userId1.toString()
    );

    // Lấy tất cả bài viết mới nhất (loại bỏ nội dung nguy hiểm)
    const allPosts = await Post.find({
      type: { $nin: ['knife', 'gun'] } // Loại bỏ bài viết có type nguy hiểm
    })
      .populate('userId', 'fullName avatar role')
      .sort({ createdAt: -1 });

    // 1. preferredPosts: bài viết có type giống tag user
    const preferredPosts = allPosts.filter(p => p.type === user.tag);
    // 2. otherPosts: các bài còn lại (không trùng type hoặc đã lấy ở preferredPosts)
    const preferredIds = new Set(preferredPosts.map(p => p._id.toString()));
    const otherPosts = allPosts.filter(p => !preferredIds.has(p._id.toString()));

    // 3. Ưu tiên bài của bạn bè trong otherPosts lên đầu
    const friendPosts = otherPosts.filter(p => {
      const uid = p.userId._id ? p.userId._id.toString() : p.userId.toString();
      return friendIds.includes(uid);
    });
    const restPosts = otherPosts.filter(p => {
      const uid = p.userId._id ? p.userId._id.toString() : p.userId.toString();
      return !friendIds.includes(uid);
    });
    const normalPosts = [...friendPosts, ...restPosts];

    // 4. Trộn: mỗi 3 bài thì 2 bài preferred, 1 bài normal
    let result = [];
    let i = 0, j = 0;
    while (i < preferredPosts.length || j < normalPosts.length) {
      // Thêm 2 bài preferred (nếu còn)
      for (let k = 0; k < 2 && i < preferredPosts.length; k++) {
        result.push(preferredPosts[i++]);
      }
      // Thêm 1 bài normal (nếu còn)
      if (j < normalPosts.length) {
        result.push(normalPosts[j++]);
      }
      // Nếu hết preferredPosts thì chỉ lấy từ normalPosts
      if (i >= preferredPosts.length && j < normalPosts.length) {
        result.push(normalPosts[j++]);
      }
    }

    res.json({ posts: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi lấy danh sách bài viết', details: err.message });
  }
});

// 📥 API lấy bài viết theo ID
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('userId', 'fullName avatar role');
    if (!post) return res.status(404).json({ error: 'Bài viết không tìm thấy' });
    res.json({ post });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi lấy bài viết' });
  }
});

// ❤️ API like/unlike bài viết
router.post('/:id/reaction', async (req, res) => {
  try {
    const { userId } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const idx = post.userReactions.findIndex(u => u.toString() === userId);
    let liked;
    if (idx === -1) {
      post.userReactions.push(userId);
      liked = true;
    } else {
      post.userReactions.splice(idx, 1);
      liked = false;
    }
    post.reaction = post.userReactions.length.toString();
    await post.save();

    // Update user tag when they like/unlike
    await updateUserTag(userId);
    
    res.json({ liked, reaction: post.reaction });

  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 🛑 API xóa bài viết
router.delete('/:id', async (req, res) => {
  try {
    const { userId, role } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.userId.toString() !== userId && role !== 'admin') {
      return res.status(403).json({ error: 'Không có quyền xóa bài viết này' });
    }
    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: 'Đã xóa bài viết' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ✏️ API sửa bài viết
router.put('/:id', async (req, res) => {
  try {
    const { userId, role, status, image, privacy } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.userId.toString() !== userId && role !== 'admin') {
      return res.status(403).json({ error: 'Không có quyền sửa bài viết này' });
    }
    if (status) post.status = status;
    if (image) post.image = image;
    if (privacy) post.privacy = privacy;
    await post.save();
    res.json({ message: 'Đã cập nhật bài viết', post });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 🚩 API report bài viết
router.post('/:id/report', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    post.report = (post.report || 0) + 1;
    if (post.report >= 10) {
      await Post.findByIdAndDelete(req.params.id);
      return res.json({ message: 'Bài viết đã bị xóa do bị report quá nhiều' });
    } else {
      await post.save();
      return res.json({ message: 'Đã report bài viết', report: post.report });
    }
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = { router, updateUserTag };
