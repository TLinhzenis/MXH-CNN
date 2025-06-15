const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const http = require('http'); 

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

global.onlineUsers = {};

io.on('connection', (socket) => {
    socket.on('register', (userId) => {
        global.onlineUsers[userId] = socket.id;
    });

    socket.on('disconnect', () => {
        for (const [userId, id] of Object.entries(global.onlineUsers)) {
            if (id === socket.id) delete global.onlineUsers[userId];
        }
    });
});

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Kết nối MongoDB thành công'))
  .catch(err => console.error('❌ Lỗi kết nối MongoDB:', err));

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);
const postRoutes = require('./routes/post');
app.use('/api/posts', postRoutes);
const friendRoutes = require('./routes/friend');
app.use('/api/friend', friendRoutes);
const commentRoutes = require('./routes/comment');
app.use('/api/comment', commentRoutes);
app.set('io', io);

server.listen(PORT, () => {
  console.log(`🚀 Server đang chạy ở cổng ${PORT}`);
});