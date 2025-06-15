const express = require('express');
const router = express.Router();
const Post = require('../model/Post');
const Comment = require('../model/Comment');
const User = require('../model/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

async function updateUserTag(userId) {
    const posts = await Post.find({ userId });
    const comments = await Comment.find({ userId }).populate('postId', 'type');
    const likedPosts = await Post.find({ userReactions: userId }).populate('userId', 'type');

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
      'https://a2d7-34-145-247-83.ngrok-free.app/predict-scene',
      formData1,
      { headers: formData1.getHeaders() }
    );

    let predictedType = 'none';
    if (sceneResponse.data?.scene) {
      predictedType = sceneResponse.data.scene;
    }
    console.log(`🔍 Scene dự đoán: ${predictedType}`);

    // === Gửi lại ảnh đến API province
    const formData2 = new FormData();
    formData2.append('image', fs.createReadStream(imagePath));
    const provinceResponse = await axios.post(
      'https://a2d7-34-145-247-83.ngrok-free.app/predict-province',
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
    const posts = await Post.find().populate('userId', 'fullName avatar').sort({ createdAt: -1 });
    res.json({ posts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Không thể lấy bài viết' });
  }
});

// 📥 API lấy bài viết theo ID
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('userId', 'fullName avatar');
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

module.exports = router;
