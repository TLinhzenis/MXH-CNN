const express = require('express');
const router = express.Router();
const Post = require('../model/Post');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data'); // Import thư viện form-data

// Multer config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../public/img'));
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});
const upload = multer({ storage });

// Tạo bài viết mới
router.post('/create', upload.single('image'), async (req, res) => {
    try {
        const { userId, status, privacy } = req.body;
        const image = req.file ? req.file.filename : null;

        // Khởi tạo bài viết với trạng thái 'pending'
        const newPost = new Post({
            userId,
            status,
            image,
            privacy,
            time: new Date().toLocaleString(),
            type: 'pending' // Trạng thái "pending" khi chưa phân loại
        });

        // Lưu bài viết tạm thời
        await newPost.save();

        res.status(201).json({ message: 'Bài viết đang được tạo!', postId: newPost._id });

        // Nếu có ảnh, gửi ảnh đi phân loại
        if (image) {
            classifyImageAndUpdatePost(newPost._id, image); // Phân loại và cập nhật
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi tạo bài viết', details: err.message });
    }
});

// Hàm phân loại hình ảnh và cập nhật bài viết
async function classifyImageAndUpdatePost(postId, image) {
    try {
        const imagePath = path.join(__dirname, '../public/img', image);
        const formData = new FormData();
        formData.append('image', fs.createReadStream(imagePath));

        const response = await axios.post('https://315c-34-169-100-12.ngrok-free.app/predict', formData, {
            headers: formData.getHeaders()
        });

        let predictedType = 'none';
        if (response.data && response.data.prediction) {
            predictedType = response.data.prediction; // Gán nhãn phân loại vào type
        }

        // Cập nhật trạng thái phân loại cho bài viết
        await Post.findByIdAndUpdate(postId, { type: predictedType });
    } catch (err) {
        console.error("Lỗi phân loại hình ảnh:", err);
    }
}

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

// Lấy bài viết theo ID
router.get('/:id', async (req, res) => {
    try {
        const post = await Post.findById(req.params.id).populate('userId', 'fullName avatar');
        if (!post) {
            return res.status(404).json({ error: 'Bài viết không tìm thấy' });
        }
        res.json({ post });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi lấy bài viết' });
    }
});

module.exports = router;
