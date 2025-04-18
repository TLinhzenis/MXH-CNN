const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');


// Thông số cấu hình tích hợp trực tiếp
const PORT = 5000;
const MONGODB_URI = 'mongodb+srv://btuanlinh715:Btuanlinh715@cluster0.krja2.mongodb.net/MXH?retryWrites=true&w=majority&appName=Cluster0';

// Khởi tạo app
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));


// Kết nối MongoDB Atlas
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Kết nối MongoDB thành công'))
  .catch(err => console.error('❌ Lỗi kết nối MongoDB:', err));


// Routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);
const postRoutes = require('./routes/post');
app.use('/api/posts', postRoutes);

// Khởi chạy server
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy ở cổng ${PORT}`);
});
