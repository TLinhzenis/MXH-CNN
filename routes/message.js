const express = require('express');
const router = express.Router();
const Message = require('../model/Message');
const User = require('../model/User');
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const { updateUserTag } = require('./post');

// Cấu hình lưu ảnh gửi đi
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../public/img'));
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + ext;
        cb(null, uniqueName);
    }
});
const upload = multer({ storage });

// Lấy lịch sử tin nhắn giữa 2 user
router.get('/history/:userId/:friendId', async (req, res) => {
    const { userId, friendId } = req.params;
    try {
        const messages = await Message.find({
            $or: [
                { sender: userId, receiver: friendId },
                { sender: friendId, receiver: userId }
            ]
        }).sort({ time: 1 });
        // Lấy avatar người gửi cho mỗi tin nhắn
        const userMap = {};
        for (const msg of messages) {
            if (!userMap[msg.sender]) {
                const user = await User.findById(msg.sender);
                userMap[msg.sender] = user ? user.avatar : 'default-avatar.jpg';
            }
            msg._doc.senderAvatar = userMap[msg.sender];
        }
        res.json({ messages });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi lấy lịch sử tin nhắn' });
    }
});

// Upload ảnh gửi đi
router.post('/upload-image', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Không có file' });
    res.json({ filename: req.file.filename });
});

// Hàm gửi tin nhắn (có phân loại ảnh nếu có)
async function sendMessage(msg) {
    try {
        const { sender, receiver, text, image, time } = msg;
        let type = null;
        if (image) {
            try {
                const imagePath = path.join(__dirname, '../public/img', image);
                if (fs.existsSync(imagePath)) {
                    const formData = new FormData();
                    formData.append('image', fs.createReadStream(imagePath));
                    const sceneResponse = await axios.post(
                        'https://4552-34-58-95-57.ngrok-free.app/predict-scene',
                        formData,
                        { headers: formData.getHeaders() }
                    );
                    if (sceneResponse.data?.scene) {
                        type = sceneResponse.data.scene;
                    }
                }
            } catch (err) {
                console.error('Lỗi phân loại ảnh tin nhắn:', err.message);
            }
        }
        const message = new Message({ sender, receiver, text, image, time, type });
        await message.save();
        // Cập nhật tag cho user nếu có type hợp lệ
        if (type && type !== 'none' && type !== 'null') {
            updateUserTag(sender);
        }
        return message;
    } catch (err) {
        console.error('Lỗi gửi tin nhắn:', err.message);
        throw err;
    }
}

// Gửi tin nhắn (có phân loại ảnh nếu có)
router.post('/send', async (req, res) => {
    try {
        const message = await sendMessage(req.body);
        res.json({ message });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi gửi tin nhắn', details: err.message });
    }
});

module.exports = { router, sendMessage }; 