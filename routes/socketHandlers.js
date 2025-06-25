const { sendMessage } = require('./message');

function setupSocketHandlers(io) {
    io.on('connection', (socket) => {
        socket.on('register', (userId) => {
            global.onlineUsers[userId] = socket.id;
        });

        socket.on('privateMessage', async (msg) => {
            try {
                const savedMsg = await sendMessage(msg);
                // Gửi realtime cho người nhận nếu online
                if (global.onlineUsers[msg.receiver]) {
                    io.to(global.onlineUsers[msg.receiver]).emit('privateMessage', savedMsg);
                }
            } catch (err) {
                console.error('Lỗi gửi tin nhắn:', err.message);
            }
        });

        socket.on('disconnect', () => {
            for (const [userId, id] of Object.entries(global.onlineUsers)) {
                if (id === socket.id) delete global.onlineUsers[userId];
            }
        });
    });
}

module.exports = { setupSocketHandlers }; 