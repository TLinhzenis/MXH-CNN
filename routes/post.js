const express = require('express');
const router = express.Router();
const Post = require('../model/Post');
const multer = require('multer');
const path = require('path');

// Cấu hình multer để lưu file vào thư mục img
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../public/img')); // Thư mục lưu ảnh
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName); // Tên file duy nhất
    }
});

const upload = multer({ storage });

// Tạo bài viết mới
router.post('/create', upload.single('image'), async (req, res) => {
    try {
        const { userId, status, privacy } = req.body;
        const image = req.file ? req.file.filename : null; // Lấy tên file nếu có

        const newPost = new Post({
            userId,
            status,
            image,
            privacy,
            time: new Date().toLocaleString()
        });

        await newPost.save();
        res.status(201).json({ message: 'Tạo bài viết thành công!', post: newPost });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi tạo bài viết', details: err.message });
    }
});

// Lấy tất cả bài viết
router.get('/', async (req, res) => {
    try {
        // Populate để lấy thông tin user (fullName, avatar)
        const posts = await Post.find().populate('userId', 'fullName avatar').sort({ createdAt: -1 });
        res.json({ posts });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Không thể lấy bài viết' });
    }
});

module.exports = router;