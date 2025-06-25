document.addEventListener("DOMContentLoaded", function () {
    const avatar = localStorage.getItem("avatar");
    if (avatar) {
        document.getElementById("avatar-link").src = `../img/${avatar}`;
    }
    const fullName = localStorage.getItem("fullName") || "Người dùng";
    const avatarPath = avatar ? `../img/${avatar}` : "../img/default-avatar.jpg";


    // Mở modal tạo bài viết
    document.getElementById("status-input-area").addEventListener("click", () => {
        document.getElementById("post-modal").classList.add("show");
        document.getElementById("overlay").style.display = "block";
        document.getElementById("modal-user-name").textContent = fullName;
        document.getElementById("modal-user-avatar").src = avatarPath;
    });

    document.getElementById("overlay").addEventListener("click", function () {
        // Đóng modal đăng bài nếu đang mở
        if (document.getElementById("post-modal").classList.contains("show")) {
            closePostModal();
        }
        // Đóng modal chi tiết bài viết nếu đang mở
        if (document.getElementById("post-detail-modal").classList.contains("show")) {
            document.getElementById("post-detail-modal").classList.remove("show");
            document.getElementById("overlay").style.display = "none";
        }
    });

    function closePostModal() {
        document.getElementById("post-modal").classList.remove("show");
        document.getElementById("overlay").style.display = "none";
        document.getElementById("post-text").value = "";
        document.getElementById("image-upload").value = "";
        document.getElementById("image-preview").style.display = "none";
    }
    window.closePostModal = closePostModal;

    const imageUploadInput = document.getElementById("image-upload");
    const imagePreview = document.getElementById("image-preview");
    const imagePreviewWrapper = document.getElementById("image-preview-wrapper");
    const removeImageBtn = document.getElementById("remove-image-btn");

    imageUploadInput.addEventListener("change", function () {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                imagePreview.src = e.target.result;
                imagePreviewWrapper.classList.add("active");
            };
            reader.readAsDataURL(file);
        } else {
            imagePreviewWrapper.classList.remove("active");
            imagePreview.src = "";
        }
    });

    removeImageBtn.addEventListener("click", function (e) {
        e.preventDefault();
        imageUploadInput.value = "";
        imagePreviewWrapper.classList.remove("active");
        imagePreview.src = "";
    });

    document.getElementById("submit-post-button").addEventListener("click", createPost);

    async function createPost() {
        const status = document.getElementById("post-text").value.trim();
        const privacy = document.getElementById("privacy-select").value;
        const imageFile = document.getElementById("image-upload").files[0];
        const token = localStorage.getItem("authToken");

        if (!status && !imageFile) {
            alert("Vui lòng nhập nội dung hoặc chọn ảnh!");
            return;
        }

        const formData = new FormData();
        const userId = localStorage.getItem("userId");
        formData.append("userId", userId);
        formData.append("status", status);
        formData.append("privacy", privacy);
        if (imageFile) {
            formData.append("image", imageFile);
        }

        const loadingMessage = document.createElement("p");
        loadingMessage.textContent = "Đang tải bài viết...";
        document.getElementById("post-list").prepend(loadingMessage);

        try {
            const res = await fetch("http://localhost:5000/api/posts/create", {
                method: "POST",
                headers: { 
                    "Authorization": `Bearer ${token}`
                },
                body: formData
            });

            if (!res.ok) {
                const errorData = await res.json();
                console.error("Error response:", errorData);
                alert("Đăng bài thất bại: " + (errorData.error || "Vui lòng thử lại!"));
                return;
            }

            const data = await res.json();
            const postId = data.postId;
            checkPostClassification(postId, loadingMessage);
            closePostModal();

        } catch (error) {
            console.error("Chi tiết lỗi đăng bài:", error.message || error);
            alert("Có lỗi xảy ra khi đăng bài!");
        }
    }

    async function checkPostClassification(postId, loadingMessage) {
        try {
            const interval = setInterval(async () => {
                const res = await fetch(`http://localhost:5000/api/posts/${postId}`);
                const data = await res.json();

                if (data.post && data.post.type !== 'pending') {
                    clearInterval(interval);
                    loadingMessage.remove();
                    addPostToDOM(data.post);
                    setupInteraction(); // Đảm bảo nút like hoạt động cho bài mới
                }
            }, 2000);

        } catch (error) {
            console.error("Lỗi khi kiểm tra phân loại bài viết:", error);
        }
    }

    function addPostToDOM(post) {
        const postList = document.getElementById("post-list");
        const userId = localStorage.getItem("userId");
        const userRole = localStorage.getItem("role");
        const userReactions = (post.userReactions || []).map(id => id.toString());
        const isLiked = userReactions.includes(userId);
        const likeIcon = isLiked ? "❤️" : "🤍";
        const likeBtnClass = isLiked ? "like-btn liked" : "like-btn";

        const postElement = document.createElement("div");
        postElement.classList.add("post");

        const userAvatar = post.userId.avatar || "default-avatar.jpg";
        const userFullName = post.userId.fullName || "Người dùng";
        const isOwner = post.userId._id === userId;
        const isAdmin = userRole === "admin";
        const canEditDelete = isOwner || isAdmin;

        // Three-dot menu HTML
        let menuHTML = `<div class="post-menu-wrapper">
            <button class="post-menu-btn">⋮</button>
            <div class="post-menu-list" style="display:none;position:absolute;right:0;z-index:10;background:#fff;border:1px solid #eee;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,0.08);min-width:120px;">
        `;
        if (canEditDelete) {
            menuHTML += `<button class="edit-post-btn" data-id="${post._id}">Sửa</button>
                        <button class="delete-post-btn" data-id="${post._id}">Xóa</button>`;
        } else {
            menuHTML += `<button class="report-post-btn" data-id="${post._id}">Báo cáo</button>`;
        }
        menuHTML += `</div></div>`;

        const imageHTML = post.image
            ? `<img src="../img/${post.image.startsWith('data:') ? post.image : `../img/${post.image}`}" class="post-image" data-post-id="${post._id}">`
            : "";

        // Show report count if > 0
        const reportHTML = post.report && post.report > 0 ? `<span class="report-count">Báo cáo: ${post.report}</span>` : "";

        postElement.innerHTML = `
            <div class="post-header" style="position:relative;">
                <img src="../img/${userAvatar}" class="avatar">
                <div>
                    <p class="username">${userFullName}</p>
                    <p class="time">${post.time}</p>
                </div>
                <div style="margin-left:auto;position:relative;">${menuHTML}</div>
            </div>
            <p class="status">${post.status}</p>
            ${imageHTML}
            <div class="actions">
                <button class="${likeBtnClass}" data-id="${post._id}">${likeIcon} <span class="like-count">${post.reaction || 0}</span></button>
                <button class="comment-btn" data-post-id="${post._id}">💬 ${post.comment || 0}</button>
                ${reportHTML}
            </div>
            <div class="comments" style="display: none;"></div>
        `;

        postList.prepend(postElement);
    }

    async function loadPosts() {
        const userId = localStorage.getItem("userId");
        const res = await fetch(`http://localhost:5000/api/posts?userId=${userId}`);
        const data = await res.json();
        const posts = Array.isArray(data.posts) ? data.posts : data;

        const postList = document.getElementById("post-list");
        postList.innerHTML = "";

        posts.reverse().forEach((post) => {
            addPostToDOM(post);
        });

        setupInteraction();
    }

    function setupInteraction() {
        document.querySelectorAll(".like-btn").forEach(button => {
            button.onclick = async function (e) {
                e.stopPropagation();
                const postId = this.getAttribute("data-id");
                const userId = localStorage.getItem("userId");
                if (!userId || !postId || postId === "null") {
                    alert("Có lỗi xác thực. Vui lòng đăng nhập lại hoặc tải lại trang!");
                    return;
                }
                const res = await fetch(`http://localhost:5000/api/posts/${postId}/reaction`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId })
                });
                const data = await res.json();
                this.classList.toggle("liked", data.liked);
                this.innerHTML = `${data.liked ? "❤️" : "🤍"} <span class="like-count">${data.reaction}</span>`;
            };
        });

        // Sự kiện click ảnh bài viết
        document.querySelectorAll(".post-image").forEach(img => {
            img.onclick = function (e) {
                e.stopPropagation();
                const postId = this.getAttribute("data-post-id");
                openPostDetailModal(postId);
            };
        });

        // Sự kiện click nút comment
        document.querySelectorAll(".comment-btn").forEach(btn => {
            btn.onclick = function (e) {
                e.stopPropagation();
                const postId = this.getAttribute("data-post-id");
                openPostDetailModal(postId);
            };
        });

        // Three-dot menu logic
        document.querySelectorAll('.post-menu-btn').forEach(btn => {
            btn.onclick = function(e) {
                e.stopPropagation();
                const menu = this.nextElementSibling;
                // Hide all other menus
                document.querySelectorAll('.post-menu-list').forEach(m => { if (m !== menu) m.style.display = 'none'; });
                menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
            };
        });
        // Hide menu when clicking outside
        document.addEventListener('click', function() {
            document.querySelectorAll('.post-menu-list').forEach(m => m.style.display = 'none');
        });
        // Prevent menu from closing when clicking inside
        document.querySelectorAll('.post-menu-list').forEach(menu => {
            menu.onclick = e => e.stopPropagation();
        });
        // Edit post
        document.querySelectorAll('.edit-post-btn').forEach(btn => {
            btn.onclick = async function(e) {
                e.stopPropagation();
                const postId = this.getAttribute('data-id');
                // Simple prompt for editing status (expand as needed)
                const newStatus = prompt('Nhập nội dung mới cho bài viết:');
                if (newStatus) {
                    const userId = localStorage.getItem('userId');
                    const role = localStorage.getItem('role');
                    const res = await fetch(`http://localhost:5000/api/posts/${postId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId, role, status: newStatus })
                    });
                    if (res.ok) {
                        alert('Đã cập nhật bài viết!');
                        loadPosts();
                    } else {
                        alert('Lỗi cập nhật bài viết!');
                    }
                }
            };
        });
        // Delete post
        document.querySelectorAll('.delete-post-btn').forEach(btn => {
            btn.onclick = async function(e) {
                e.stopPropagation();
                if (!confirm('Bạn có chắc muốn xóa bài viết này?')) return;
                const postId = this.getAttribute('data-id');
                const userId = localStorage.getItem('userId');
                const role = localStorage.getItem('role');
                const res = await fetch(`http://localhost:5000/api/posts/${postId}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, role })
                });
                if (res.ok) {
                    alert('Đã xóa bài viết!');
                    loadPosts();
                } else {
                    alert('Lỗi xóa bài viết!');
                }
            };
        });
        // Report post
        document.querySelectorAll('.report-post-btn').forEach(btn => {
            btn.onclick = async function(e) {
                e.stopPropagation();
                const postId = this.getAttribute('data-id');
                const res = await fetch(`http://localhost:5000/api/posts/${postId}/report`, {
                    method: 'POST'
                });
                const data = await res.json();
                if (res.ok) {
                    alert(data.message);
                    loadPosts();
                } else {
                    alert('Lỗi báo cáo bài viết!');
                }
            };
        });
    }
    

    document.getElementById("btn-logout").addEventListener("click", async () => {
        const token = localStorage.getItem("authToken");

        if (token) {
            await fetch("http://localhost:5000/api/auth/update-status", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ status: "offline" })
            });
        }

        localStorage.clear();
        window.location.href = "loginUser.html";
    });

    loadPosts();

    // Nút Trang chủ
    const btnHome = document.getElementById('btn-home');
    const feed = document.querySelector('.feed');
    const postList = document.getElementById('post-list');

    btnHome.addEventListener('click', () => {
        feed.scrollTo({ top: 0, behavior: 'smooth' });
        postList.innerHTML = '';
        loadPosts();
    });

    // Nút Nhắn tin
    const btnMessage = document.getElementById('btn-message');
    if (btnMessage) {
        btnMessage.addEventListener('click', () => {
            window.location.href = 'message.html';
        });
    }

    // Modal chi tiết bài viết và các hàm khác giữ nguyên...
});
// ...existing code...

async function openPostDetailModal(postId) {
    const modal = document.getElementById("post-detail-modal");
    const content = document.getElementById("post-detail-content");
    const commentList = document.getElementById("comment-list");
    const commentInput = document.getElementById("comment-input");
    
    modal.classList.add("show");
    document.getElementById("overlay").style.display = "block";
    content.innerHTML = "Đang tải...";
    commentList.innerHTML = "";

    // Lấy chi tiết bài viết
    const res = await fetch(`http://localhost:5000/api/posts/${postId}`);
    const data = await res.json();
    const post = data.post || data;

    // Hiển thị chi tiết bài viết (chỉ nội dung, không render comment-list ở đây)
    content.innerHTML = `
        <div class=\"post-detail-header\">\n            <img src=\"../img/${post.userId.avatar || 'default-avatar.jpg'}\" class=\"post-detail-avatar\">\n            <div class=\"post-detail-info\">\n                <h3 class=\"post-detail-name\">${post.userId.fullName || 'Người dùng'}</h3>\n                <p class=\"post-detail-time\">${post.time}</p>\n            </div>\n        </div>\n        <p class=\"post-detail-text\">${post.status}</p>\n        ${post.image ? `<img src=\"../img/${post.image}\" class=\"post-detail-image\">` : ""}\n        <div class=\"post-actions\">\n            <button class=\"like-btn ${post.userReactions.includes(localStorage.getItem('userId')) ? 'liked' : ''}\" data-id=\"${post._id}\">\n                ${post.userReactions.includes(localStorage.getItem('userId')) ? '❤️' : '🤍'} \n                <span class=\"like-count\">${post.reaction || 0}</span>\n            </button>\n            <button class=\"comment-btn\" data-post-id=\"${post._id}\">\n                💬 ${post.comment || 0}\n            </button>\n        </div>\n    `;

    // Hiển thị danh sách comment
    await loadComments(postId);

    // Gửi comment
    document.getElementById("submit-comment").onclick = async function () {
        const content = commentInput.value.trim();
        if (!content) return;
        
        const userId = localStorage.getItem("userId");
        await fetch("http://localhost:5000/api/comment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, postId, content })
        });
        
        commentInput.value = "";
        await loadComments(postId);
    };
}

// Đóng modal
document.getElementById("close-detail-modal").onclick = function () {
    document.getElementById("post-detail-modal").classList.remove("show");
};

// Load comment cho bài viết
async function loadComments(postId) {
    const commentList = document.getElementById("comment-list");
    commentList.innerHTML = "Đang tải bình luận...";
    
    const res = await fetch(`http://localhost:5000/api/comment/${postId}`);
    const data = await res.json();
    

    
    commentList.innerHTML = data.comments.map(comment => `
        <div class=\"comment-item\">\n            <img src=\"../img/${comment.userId.avatar || 'default-avatar.jpg'}\" class=\"comment-avatar\">\n            <div class=\"comment-content\">\n                <div class=\"comment-username\">${comment.userId.fullName || "Người dùng"}</div>\n                <div class=\"comment-text\">${comment.comment}</div>\n                <div class=\"comment-time\">${new Date(comment.timetime).toLocaleString()}</div>\n            </div>\n        </div>\n    `).join('');
}
// Kết nối socket và các phần thông báo giữ nguyên...
const socket = io('http://localhost:5000');
const userId = localStorage.getItem('userId');
socket.emit('register', userId);

const bellBtn = document.querySelector('.fa-bell').closest('.btn');
const notificationDropdown = document.getElementById('notification-dropdown');
const notificationList = document.getElementById('notification-list');
let notifications = [];

socket.on('friendRequest', (data) => {
    notifications.unshift({
        text: data.notification,
        requestId: data.requestId
    });
    renderNotifications();
});

function renderNotifications() {
    if (notifications.length === 0) {
        notificationList.innerHTML = '<div style="padding:10px;">Không có thông báo nào</div>';
        return;
    }
    notificationList.innerHTML = notifications.map(n => `
        <div class="notification-item">
            ${n.text}
            <div style="margin-top:5px;">
                <button onclick="acceptRequest('${n.requestId}')">Có</button>
                <button onclick="rejectRequest('${n.requestId}')">Không</button>
            </div>
        </div>
    `).join('');
}

bellBtn.addEventListener('click', function(e) {
    notificationDropdown.style.display = notificationDropdown.style.display === 'none' ? 'block' : 'none';
    renderNotifications();
    e.stopPropagation();
});

document.addEventListener('click', function(e) {
    if (!notificationDropdown.contains(e.target) && !bellBtn.contains(e.target)) {
        notificationDropdown.style.display = 'none';
    }
});

window.acceptRequest = async function(requestId) {
    await fetch('http://localhost:5000/api/friend/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId })
    });
    notifications = notifications.filter(n => n.requestId !== requestId);
    renderNotifications();
    alert('Đã chấp nhận kết bạn');
};

window.rejectRequest = async function(requestId) {
    await fetch('http://localhost:5000/api/friend/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId })
    });
    notifications = notifications.filter(n => n.requestId !== requestId);
    renderNotifications();
    alert('Đã từ chối kết bạn');
};

async function loadFriendRequests() {
    const res = await fetch(`http://localhost:5000/api/friend/requests/${userId}`);
    const requests = await res.json();
    requests.forEach(req => {
        if (!notifications.some(n => n.requestId === req._id)) {
            notifications.unshift({
                text: req.notification,
                requestId: req._id
            });
        }
    });
    renderNotifications();
}
loadFriendRequests();
async function loadFriends() {
    const userId = localStorage.getItem("userId");
    if (!userId) return;
    const res = await fetch(`http://localhost:5000/api/friend/list/${userId}`);
    const data = await res.json();
    const friends = data.friends || [];
    const sidebarRight = document.querySelector('.sidebar.right');
    let html = `<h2>Danh sách bạn bè</h2>`;
    if (friends.length === 0) {
        html += `<p>Chưa có bạn bè nào</p>`;
    } else {
        html += `<ul style="list-style:none;padding:0;">` + friends.map(f =>
            `<li style="display:flex;align-items:center;margin-bottom:10px;">
                <img src="../img/${f.avatar || 'default-avatar.jpg'}" alt="avatar" style="width:32px;height:32px;border-radius:50%;margin-right:8px;">
                <span>${f.fullName}</span>
            </li>`
        ).join('') + `</ul>`;
    }
    // Gợi ý kết bạn theo tag
    let suggestHtml = `<h2>Gợi ý kết bạn</h2>`;
    try {
        const suggestRes = await fetch(`http://localhost:5000/api/auth/suggest/${userId}`);
        const suggestData = await suggestRes.json();
        let suggestions = suggestData.users || [];
        // Lấy ngẫu nhiên tối đa 5 người
        if (suggestions.length > 5) {
            suggestions = suggestions.sort(() => 0.5 - Math.random()).slice(0, 5);
        }
        if (suggestions.length > 0) {
            suggestHtml += `<ul style="list-style:none;padding:0;">` + suggestions.map(s =>
                `<li style="display:flex;align-items:center;margin-bottom:10px;">
                    <img src="../img/${s.avatar || 'default-avatar.jpg'}" alt="avatar" style="width:32px;height:32px;border-radius:50%;margin-right:8px;">
                    <span>${s.fullName}</span>
                    <button class="btn-add-friend" data-id="${s._id}" style="margin-left:auto;">Kết bạn</button>
                </li>`
            ).join('') + `</ul>`;
        } else {
            suggestHtml += `<p>Không có gợi ý kết bạn nào</p>`;
        }

    } catch (e) {
        suggestHtml += `<p>Không có gợi ý</p>`;
    }

    sidebarRight.innerHTML = html + suggestHtml;
// Gắn sự kiện gửi lời mời kết bạn (giống phần tìm kiếm)
setTimeout(() => {
    document.querySelectorAll('.btn-add-friend').forEach(btn => {
        btn.onclick = async function() {
            const toUserId = this.getAttribute('data-id');
            const fromUserId = localStorage.getItem("userId");
            await fetch('http://localhost:5000/api/friend/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fromUserId, toUserId })
            });
            this.textContent = "Đã gửi lời mời";
            this.disabled = true;
        };
    });
}, 0);
    
    
}

document.addEventListener("DOMContentLoaded", function () {
    // ...các hàm khác...
    loadFriends();
});
