const express = require('express');
const router = express.Router();
const User = require('../model/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
// Đăng ký người dùng mới
router.post('/register', async (req, res) => {
  const { username, password, RPpass, fullName, email, phone } = req.body;

  if (password !== RPpass) {
    return res.status(400).json({ message: "Mật khẩu không khớp" });
  }

  try {
    // Kiểm tra username hoặc email đã tồn tại chưa
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      return res.status(400).json({ message: "Username hoặc email đã tồn tại" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

const newUser = new User({
  username,
  password: hashedPassword, // ✅ đã mã hóa
  fullName,
  email,
  phone,
});


    await newUser.save();
    res.status(201).json({ message: "Đăng ký thành công" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server", error });
  }
});
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
  
    try {
      const user = await User.findOne({ username });
  
      if (!user) {
        return res.status(400).json({ message: "Username không tồn tại" });
      }
  
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Mật khẩu không đúng" });
      }
  
      const token = jwt.sign({ userId: user._id }, 'secretkey', { expiresIn: '1h' });
  
      res.json({
        message: "Đăng nhập thành công",
        token,
        user: {
          _id: user._id,
          fullName: user.fullName,
          phone: user.phone,
          status: user.status,
          avatar: user.avatar
        }
      });
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Lỗi server", error });
    }
  });
  // Cập nhật status người dùng
router.patch('/update-status', async (req, res) => {
  const { status } = req.body;

  // Lấy userId từ token
  const token = req.headers['authorization']?.split(' ')[1]; // Lấy token từ header
  if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
  }

  try {
      const decoded = jwt.verify(token, 'secretkey');
      const userId = decoded.userId;

      // Cập nhật status người dùng trong cơ sở dữ liệu
      const user = await User.findById(userId);
      if (!user) {
          return res.status(404).json({ message: "User not found" });
      }

      user.status = status; // Cập nhật status
      await user.save();

      res.status(200).json({ message: "Status updated successfully" });
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Lỗi server", error });
  }
});
// Tìm kiếm người dùng theo tên hoặc số điện thoại
router.get('/search', async (req, res) => {
  const query = req.query.q;

  try {
    const users = await User.find({
      $or: [
        { fullName: { $regex: query, $options: 'i' } },
        { phone: { $regex: query, $options: 'i' } }
      ]
    }).select('fullName phone avatar status'); // chỉ lấy thông tin cần thiết

    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

  
module.exports = router;
