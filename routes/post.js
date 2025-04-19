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

// Tạo bài viết mới và phân loại ảnh
router.post('/create', upload.single('image'), async (req, res) => {
    try {
        const { userId, status, privacy } = req.body;
        const image = req.file ? req.file.filename : null;

        let predictedType = 'none'; // Mặc định

        // Nếu có ảnh, gửi ảnh đến API phân loại
        if (image) {
            const imagePath = path.join(__dirname, '../public/img', image);
            const formData = new FormData();
            formData.append('image', fs.createReadStream(imagePath));

            const response = await axios.post('https://fe29-104-197-122-151.ngrok-free.app/predict', formData, {
                headers: formData.getHeaders()
            });

            if (response.data && response.data.prediction) {
                predictedType = response.data.prediction; // Gán nhãn vào type
            }
        }

        const newPost = new Post({
            userId,
            status,
            image,
            privacy,
            time: new Date().toLocaleString(),
            type: predictedType // 👈 Gán nhãn phân loại vào đây
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
