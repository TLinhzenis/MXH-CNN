const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const http = require('http'); 
const session = require('express-session');
const bcrypt = require('bcryptjs');

const app = express();
const server = http.createServer(app); // Tạo server trước

const { Server } = require('socket.io');
const io = new Server(server, { cors: { origin: "*" } }); // Khởi tạo io sau khi có server

const PORT = 5000;
const MONGODB_URI = 'mongodb+srv://btuanlinh715:Btuanlinh715@cluster0.krja2.mongodb.net/MXH?retryWrites=true&w=majority&appName=Cluster0';

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/img', express.static(path.join(__dirname, 'public/img')));
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

global.onlineUsers = {};

const Message = require('./model/Message');
const Post = require('./model/Post');
const User = require('./model/User');

const { setupSocketHandlers } = require('./routes/socketHandlers');

// Setup socket handlers
setupSocketHandlers(io);

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Kết nối MongoDB thành công'))
  .catch(err => console.error('❌ Lỗi kết nối MongoDB:', err));

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);
const { router: postRoutes } = require('./routes/post');
app.use('/api/posts', postRoutes);
const friendRoutes = require('./routes/friend');
app.use('/api/friend', friendRoutes);
const commentRoutes = require('./routes/comment');
app.use('/api/comment', commentRoutes);
const { router: messageRoutes } = require('./routes/message');
app.use('/api/message', messageRoutes);
const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

app.set('io', io);

server.listen(PORT, () => {
  console.log(`🚀 Server đang chạy ở cổng ${PORT}`);
});