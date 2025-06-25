const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Post = require('../model/Post');
const User = require('../model/User');
const axios = require('axios');

// Middleware kiểm tra admin (import lại từ server.js)
function requireAdmin(req, res, next) {
  if (req.session && req.session.adminId) {
    return next();
  }
  res.status(401).json({ success: false, message: 'Chưa đăng nhập admin!' });
}

// API thống kê cho admin
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    // Thống kê type bài viết
    const typeAgg = await Post.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    // Thống kê location bài viết
    const locationAgg = await Post.aggregate([
      { $group: { _id: '$location', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    // Thống kê tag user
    const tagAgg = await User.aggregate([
      { $group: { _id: '$tag', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    // Số bài đăng trong ngày
    const today = new Date();
    today.setHours(0,0,0,0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const postsToday = await Post.countDocuments({ createdAt: { $gte: today, $lt: tomorrow } });
    // Số user đăng ký mới trong ngày
    const usersToday = await User.countDocuments({ createdAt: { $gte: today, $lt: tomorrow } });
    res.json({
      type: {
        most: typeAgg[0]?._id || '',
        data: typeAgg
      },
      location: {
        most: locationAgg[0]?._id || '',
        data: locationAgg
      },
      tag: {
        most: tagAgg[0]?._id || '',
        data: tagAgg
      },
      postsToday,
      usersToday
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ!' });
  }
});

// API lấy danh sách user
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.json({ users });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ!' });
  }
});

// API thêm user
router.post('/users', requireAdmin, async (req, res) => {
  try {
    const { username, email, fullName, phone, role, password } = req.body;
    if (!username || !email || !fullName || !phone || !role || !password) return res.status(400).json({ success: false, message: 'Thiếu thông tin!' });
    const hash = await bcrypt.hash(password, 10);
    const user = new User({ username, email, fullName, phone, role, password: hash });
    await user.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ!' });
  }
});

// API sửa user
router.put('/users/:id', requireAdmin, async (req, res) => {
  try {
    const { username, email, fullName, phone, role, password } = req.body;
    const update = { username, email, fullName, phone, role };
    if (password) update.password = await bcrypt.hash(password, 10);
    await User.findByIdAndUpdate(req.params.id, update);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ!' });
  }
});

// API xóa user
router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ!' });
  }
});

// API lấy danh sách bài viết
router.get('/posts', requireAdmin, async (req, res) => {
  try {
    const posts = await Post.find({})
      .populate('userId', 'username fullName')
      .sort({ createdAt: -1 });
    res.json({ posts });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ!' });
  }
});

// API lấy danh sách bài viết đã bị xóa (để theo dõi)
router.get('/deleted-posts', requireAdmin, async (req, res) => {
  try {
    // Lưu ý: Đây chỉ là demo, trong thực tế bạn nên có một collection riêng để lưu lịch sử xóa
    const deletedPosts = await Post.find({
      type: { $in: ['knife', 'gun'] }
    })
      .populate('userId', 'username fullName')
      .sort({ createdAt: -1 });
    
    res.json({ 
      deletedPosts,
      message: 'Đây là các bài viết có nội dung nguy hiểm đã được tự động xóa'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ!' });
  }
});

// API xóa bài viết
router.delete('/posts/:id', requireAdmin, async (req, res) => {
  try {
    await Post.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ!' });
  }
});

// API chatbot thay thế Gemini: sử dụng GPT-3.5 từ OpenRouter
router.post('/chatbot', requireAdmin, async (req, res) => {
  try {
    const { question } = req.body;
    let prompt = question;

    if (question.includes('@phantich')) {
      const typeAgg = await Post.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);
      const locationAgg = await Post.aggregate([
        { $group: { _id: '$location', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);
      const tagAgg = await User.aggregate([
        { $group: { _id: '$tag', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);
      prompt = `Dữ liệu thống kê:
- Các type bài viết: ${JSON.stringify(typeAgg)}
- Các location: ${JSON.stringify(locationAgg)}
- Tag người dùng: ${JSON.stringify(tagAgg)}
Câu hỏi: ${question.replace('@phantich', '').trim()}`;
    }

    const openrouterKey = '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'; // Thay bằng API key OpenRouter thật
    const openrouterEndpoint = 'https://openrouter.ai/api/v1/chat/completions';

    const response = await axios.post(openrouterEndpoint, {
      model: 'deepseek/deepseek-r1-0528-qwen3-8b:free',

      messages: [
        { role: 'system', content: 'Bạn là một trợ lý quản trị hệ thống mạng xã hội' },
        { role: 'user', content: prompt }
      ]
    }, {
      headers: {
        'Authorization': `Bearer ${openrouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost', // hoặc URL frontend thực tế
        'X-Title': 'AdminChatbot'
      }
    });

    const answer = response.data?.choices?.[0]?.message?.content || 'Không có phản hồi từ OpenRouter.';
    res.json({ answer });

  } catch (err) {
    let msg = err.message;
    if (err.response?.data?.error?.message) {
      msg += ' | ' + err.response.data.error.message;
    }
    console.error('Lỗi chatbot OpenRouter:', msg);
    res.status(500).json({ error: 'Lỗi chatbot OpenRouter', details: msg });
  }
});


module.exports = router; 