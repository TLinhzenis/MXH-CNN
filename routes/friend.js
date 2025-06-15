const express = require('express');
const router = express.Router();
const ListFriend = require('../model/ListFriend');
const User = require('../model/User');

// Gửi lời mời kết bạn
router.post('/request', async (req, res) => {
    const { fromUserId, toUserId } = req.body;
    try {
        const fromUser = await User.findById(fromUserId);
        if (!fromUser) return res.status(404).json({ message: 'Người gửi không tồn tại' });

        // Kiểm tra đã gửi chưa
        const existed = await ListFriend.findOne({
            $or: [
                { userId1: fromUserId, userId2: toUserId },
                { userId1: toUserId, userId2: fromUserId }
            ]
        });
        if (existed) return res.status(400).json({ message: 'Đã gửi lời mời hoặc đã là bạn' });

        const notification = `${fromUser.fullName} đã gửi cho bạn 1 lời mời kết bạn, bạn có chấp nhận không?`;
        const friendRequest = new ListFriend({
            userId1: fromUserId,
            userId2: toUserId,
            notification,
            status: 'waiting'
        });
        await friendRequest.save();

        // Gửi socket nếu người nhận đang online
        const io = req.app.get('io');
        if (global.onlineUsers && global.onlineUsers[toUserId]) {
            io.to(global.onlineUsers[toUserId]).emit('friendRequest', {
                fromUserId,
                notification,
                requestId: friendRequest._id
            });
        }

        res.json({ message: 'Đã gửi lời mời kết bạn' });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server' });
    }
});

// Lấy danh sách lời mời kết bạn chờ xác nhận
router.get('/requests/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const requests = await ListFriend.find({ userId2: userId, status: 'waiting', notification: { $ne: null } })
            .populate('userId1', 'fullName avatar');
        res.json(requests);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server' });
    }
});

// Chấp nhận lời mời
router.post('/accept', async (req, res) => {
    const { requestId } = req.body;
    try {
        await ListFriend.findByIdAndUpdate(requestId, { status: 'friend', notification: null });
        res.json({ message: 'Đã chấp nhận kết bạn' });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server' });
    }
});

// Từ chối lời mời
router.post('/reject', async (req, res) => {
    const { requestId } = req.body;
    try {
        await ListFriend.findByIdAndDelete(requestId);
        res.json({ message: 'Đã từ chối kết bạn' });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server' });
    }
});
// Lấy danh sách bạn bè của user
router.get('/list/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        // Tìm tất cả các mối quan hệ bạn bè đã xác nhận
        const friends = await ListFriend.find({
            status: "friend",
            $or: [
                { userId1: userId },
                { userId2: userId }
            ]
        });

        // Lấy ra id bạn bè (khác userId hiện tại)
        const friendIds = friends.map(f =>
            f.userId1.toString() === userId ? f.userId2 : f.userId1
        );

        // Lấy thông tin bạn bè
        const friendUsers = await User.find({ _id: { $in: friendIds } }, 'fullName avatar');
        res.json({ friends: friendUsers });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});
module.exports = router;