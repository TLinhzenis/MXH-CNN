const socket = io('http://localhost:5000');
const userId = localStorage.getItem('userId');
socket.emit('register', userId);

socket.on('friendRequest', (data) => {
    // Hiển thị thông báo realtime, ví dụ:
    alert(data.notification);
    // Hoặc cập nhật giao diện notification
});