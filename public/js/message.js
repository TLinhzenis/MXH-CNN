// Kết nối socket
const socket = io('http://localhost:5000');
const userId = localStorage.getItem('userId');
let currentChatUserId = null;
let friends = [];

// DOM elements
const friendList = document.getElementById('friend-list');
const chatBody = document.getElementById('chat-body');
const chatHeader = document.getElementById('chat-header');
const chatAvatar = document.getElementById('chat-avatar');
const chatUsername = document.getElementById('chat-username');
const infoAvatar = document.getElementById('info-avatar');
const infoUsername = document.getElementById('info-username');
const infoStatus = document.getElementById('info-status');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const imageUploadBtn = document.getElementById('image-upload-btn');
const chatImageInput = document.getElementById('chat-image-input');
const imagePreviewWrapper = document.getElementById('image-preview-wrapper');
const imagePreview = document.getElementById('image-preview');
const removeImageBtn = document.getElementById('remove-image-btn');
const searchFriendInput = document.getElementById('search-friend');

// Đăng ký user với socket server
socket.emit('register', userId);

// Lấy danh sách bạn bè
async function loadFriends() {
    const res = await fetch(`http://localhost:5000/api/friend/list/${userId}`);
    const data = await res.json();
    friends = data.friends || [];
    renderFriendList(friends);
}

function renderFriendList(list) {
    friendList.innerHTML = '';
    if (list.length === 0) {
        friendList.innerHTML = '<li style="text-align:center;color:#888;padding:24px 0;">Chưa có bạn bè nào</li>';
        return;
    }
    list.forEach(friend => {
        const li = document.createElement('li');
        li.classList.add('friend-item');
        li.dataset.userid = friend._id;
        li.innerHTML = `
            <img src="../img/${friend.avatar || 'default-avatar.jpg'}" class="friend-avatar">
            <div class="friend-info">
                <div class="friend-name">${friend.fullName}</div>
                <div class="friend-last-message" id="last-msg-${friend._id}"></div>
            </div>
        `;
        li.onclick = () => selectChatUser(friend);
        friendList.appendChild(li);
    });
}

function selectChatUser(friend) {
    currentChatUserId = friend._id;
    document.querySelectorAll('.friend-item').forEach(item => item.classList.remove('active'));
    const activeLi = Array.from(document.querySelectorAll('.friend-item')).find(li => li.dataset.userid === friend._id);
    if (activeLi) activeLi.classList.add('active');
    chatAvatar.src = `../img/${friend.avatar || 'default-avatar.jpg'}`;
    chatUsername.textContent = friend.fullName;
    infoAvatar.src = `../img/${friend.avatar || 'default-avatar.jpg'}`;
    infoUsername.textContent = friend.fullName;
    infoStatus.textContent = `Trạng thái: ${friend.status || '...'}`;
    loadMessages(friend._id);
}

async function loadMessages(friendId) {
    chatBody.innerHTML = '<div class="chat-placeholder">Đang tải tin nhắn...</div>';
    const res = await fetch(`http://localhost:5000/api/message/history/${userId}/${friendId}`);
    const data = await res.json();
    renderMessages(data.messages || []);
}

function renderMessages(messages) {
    chatBody.innerHTML = '';
    if (messages.length === 0) {
        chatBody.innerHTML = '<div class="chat-placeholder">Chưa có tin nhắn nào.</div>';
        return;
    }
    messages.forEach(msg => {
        addMessageToDOM(msg, msg.sender === userId);
    });
    chatBody.scrollTop = chatBody.scrollHeight;
}

function addMessageToDOM(msg, isOwn) {
    const row = document.createElement('div');
    row.className = 'message-row' + (isOwn ? ' own' : '');
    row.innerHTML = `
        <img src="../img/${msg.senderAvatar || 'default-avatar.jpg'}" class="message-avatar">
        <div>
            <div class="message-bubble">
                ${msg.text ? `<span>${escapeHTML(msg.text)}</span>` : ''}
                ${msg.image ? `<img src="../img/${msg.image}" class="message-image">` : ''}
            </div>
            <div class="message-time">${formatTime(msg.time)}</div>
        </div>
    `;
    chatBody.appendChild(row);
    chatBody.scrollTop = chatBody.scrollHeight;
}

// Đăng ký sự kiện gửi tin nhắn qua nút gửi
document.getElementById('send-btn').addEventListener('click', async function(e) {
    e.preventDefault();
    try {
        if (!currentChatUserId) return;
        const text = messageInput.value.trim();
        const imageFile = chatImageInput.files[0];
        if (!text && !imageFile) return;

        let imageName = null;
        if (imageFile) {
            const formData = new FormData();
            formData.append('image', imageFile);
            const res = await fetch('http://localhost:5000/api/message/upload-image', {
                method: 'POST',
                body: formData
            });
            if (!res.ok) {
                alert('Lỗi upload ảnh!');
                return;
            }
            const data = await res.json();
            imageName = data.filename;
        }

        const msg = {
            sender: userId,
            receiver: currentChatUserId,
            text,
            image: imageName,
            time: new Date().toISOString(),
            senderAvatar: localStorage.getItem('avatar') || 'default-avatar.jpg'
        };

        socket.emit('privateMessage', msg);
        addMessageToDOM(msg, true);
        messageInput.value = '';
        chatImageInput.value = '';
        imagePreviewWrapper.style.display = 'none';
    } catch (err) {
        console.error('Lỗi gửi tin nhắn:', err);
        alert('Đã xảy ra lỗi khi gửi tin nhắn!');
    }
});

// Thêm lắng nghe phím Enter trên input để gửi tin nhắn
messageInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        document.getElementById('send-btn').click();
    }
});

// Đăng ký sự kiện chọn ảnh
imageUploadBtn.onclick = function(e) {
    e.preventDefault();
    chatImageInput.click();
};

chatImageInput.onchange = function() {
    const file = this.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            imagePreview.src = e.target.result;
            imagePreviewWrapper.style.display = 'flex';
        };
        reader.readAsDataURL(file);
    } else {
        imagePreviewWrapper.style.display = 'none';
        imagePreview.src = '';
    }
};

removeImageBtn.onclick = function(e) {
    e.preventDefault();
    chatImageInput.value = '';
    imagePreviewWrapper.style.display = 'none';
    imagePreview.src = '';
};

socket.on('privateMessage', function(msg) {
    if (msg.sender === currentChatUserId || (msg.sender === userId && msg.receiver === currentChatUserId)) {
        addMessageToDOM(msg, msg.sender === userId);
    }
    const lastMsgDiv = document.getElementById('last-msg-' + (msg.sender === userId ? msg.receiver : msg.sender));
    if (lastMsgDiv) {
        lastMsgDiv.textContent = msg.text ? msg.text : (msg.image ? '[Ảnh]' : '');
    }
});

searchFriendInput.oninput = function() {
    const q = this.value.toLowerCase();
    renderFriendList(friends.filter(f => f.fullName.toLowerCase().includes(q)));
};

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, function(tag) {
        const charsToReplace = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        };
        return charsToReplace[tag] || tag;
    });
}

function formatTime(time) {
    const d = new Date(time);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

loadFriends();