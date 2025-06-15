const express = require('express');
const router = express.Router();
const Comment = require('../model/Comment');
const Post = require('../model/Post');
const User = require('../model/User');

async function updateUserTag(userId) {
    const posts = await Post.find({ userId });
    const comments = await Comment.find({ userId }).populate('postId', 'type');

    const typeCount = {};
    posts.forEach(p => {
        if (p.type) typeCount[p.type] = (typeCount[p.type] || 0) + 1;
    });
    comments.forEach(c => {
        if (c.postId && c.postId.type) typeCount[c.postId.type] = (typeCount[c.postId.type] || 0) + 1;
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

// Lấy comment theo postId
router.get('/:postId', async (req, res) => {
    const comments = await Comment.find({ postId: req.params.postId })
        .populate('userId', 'fullName avatar')
        .sort({ timetime: 1 });
    res.json({ comments });
});

// Thêm comment mới
router.post('/', async (req, res) => {
    const { userId, postId, content } = req.body;
    if (!userId || !postId || !content) return res.status(400).json({ error: 'Thiếu dữ liệu' });
    const newComment = new Comment({ userId, postId, comment: content });
    await newComment.save();

    // Tăng số lượng comment trong Post
    const Post = require('../model/Post');
    await Post.findByIdAndUpdate(postId, { $inc: { comment: 1 } });

    // Cập nhật tag cho user
    updateUserTag(userId);

    res.json({ success: true, comment: newComment });
});

module.exports = router;