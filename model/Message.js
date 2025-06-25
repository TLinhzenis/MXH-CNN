const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, default: '' },
    image: { type: String, default: '' }, // tên file ảnh lưu trong /public/img
    time: { type: Date, default: Date.now },
    type: { type: String, default: null } // loại ảnh nếu có
});

module.exports = mongoose.model('Message', MessageSchema); 