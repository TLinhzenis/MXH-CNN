document.addEventListener("DOMContentLoaded", function () {
    const avatar = localStorage.getItem("avatar");
    if (avatar) {
        document.getElementById("avatar-link").src = `../img/${avatar}`;
    }

    // Mở modal tạo bài viết
    document.getElementById("status-input-area").addEventListener("click", () => {
        document.getElementById("post-modal").classList.add("show");
        document.getElementById("overlay").style.display = "block";
    });

    document.getElementById("overlay").addEventListener("click", closePostModal);

    function closePostModal() {
        document.getElementById("post-modal").classList.remove("show");
        document.getElementById("overlay").style.display = "none";
        document.getElementById("post-text").value = "";
        document.getElementById("image-upload").value = "";
        document.getElementById("image-preview").style.display = "none";
    }
    window.closePostModal = closePostModal; // Gắn hàm vào phạm vi toàn cục

    const imageUploadInput = document.getElementById("image-upload");
    const imagePreview = document.getElementById("image-preview");

    imageUploadInput.addEventListener("change", function () {
        const file = this.files[0];
        if (file) {
            const fileName = file.name;
            const filePath = `../img/${fileName}`;
            fetch(filePath)
                .then(response => {
                    if (response.ok) {
                        imagePreview.src = filePath;
                        imagePreview.style.display = "block";
                    } else {
                        console.error("File ảnh không tồn tại:", filePath);
                        alert("Ảnh không tồn tại trên server. Vui lòng kiểm tra lại.");
                    }
                })
                .catch(err => console.error("Lỗi khi tải ảnh:", err));
        }
    });

    async function createPost() {
        const status = document.getElementById("post-text").value.trim();
        const privacy = document.getElementById("privacy-select").value;
        const imageFile = document.getElementById("image-upload").files[0];

        if (!status && !imageFile) {
            alert("Vui lòng nhập nội dung hoặc chọn ảnh!");
            return;
        }

        const formData = new FormData();
        formData.append("userId", localStorage.getItem("userId")); // Lấy userId từ localStorage
        formData.append("status", status);
        formData.append("privacy", privacy);
        if (imageFile) {
            formData.append("image", imageFile); // Thêm file ảnh vào FormData
        }

        const res = await fetch("http://localhost:5000/api/posts/create", {
            method: "POST",
            body: formData // Gửi FormData
        });

        if (res.ok) {
            await loadPosts();
            closePostModal();
        } else {
            alert("Đăng bài thất bại!");
        }
    }

    document.querySelector("#post-modal button").addEventListener("click", createPost);

    async function loadPosts() {
        const res = await fetch("http://localhost:5000/api/posts");
        const data = await res.json();
        const posts = Array.isArray(data.posts) ? data.posts : data;
    
        const postList = document.getElementById("post-list");
        postList.innerHTML = "";
    
        posts.forEach((post, index) => {
            const postElement = document.createElement("div");
            postElement.classList.add("post");
    
            // Lấy avatar và fullName từ post.userId
            const userAvatar = post.userId.avatar || "default-avatar.jpg";
            const userFullName = post.userId.fullName || "Người dùng";
    
            // Tạo danh sách comment giả lập
            const fakeComments = [
                { avatar: "default-avatar.jpg", username: "Nguyễn Văn A", content: "Bài viết rất hay!", time: "10 phút trước" },
                { avatar: "default-avatar.jpg", username: "Trần Thị B", content: "Cảm ơn bạn đã chia sẻ!", time: "20 phút trước" },
                { avatar: "default-avatar.jpg", username: "Lê Văn C", content: "Tôi rất thích bài viết này.", time: "30 phút trước" }
            ];
    
            // Tạo HTML cho danh sách comment
            const commentsHTML = fakeComments.map(comment => `
                <div class="comment">
                    <img src="../img/${comment.avatar}" class="avatar">
                    <div class="comment-content">
                        <strong>${comment.username}:</strong> ${comment.content}
                        <div class="comment-time">${comment.time}</div>
                    </div>
                </div>
            `).join("");
    
            postElement.innerHTML = `
                <div class="post-header">
                    <img src="../img/${userAvatar}" class="avatar">
                    <div>
                        <p class="username">${userFullName}</p>
                        <p class="time">${post.time}</p>
                    </div>
                </div>
                <p class="status">${post.status}</p>
                ${post.image ? `<img src="../img/${post.image}" class="post-image">` : ""}
                <div class="actions">
                    <button class="like-btn" data-index="${index}">🤍 <span class="like-count">${post.reaction || 0}</span></button>
                    <button class="comment-btn" data-index="${index}">💬 ${post.comment || 0}</button>
                </div>
                <div class="comments" id="comments-${index}" style="display: none;">
                    ${commentsHTML}
                </div>
            `;
            postList.appendChild(postElement);
        });
    
        setupInteraction();
    }

    function setupInteraction() {
        document.querySelectorAll(".comment-btn").forEach(button => {
            button.addEventListener("click", function () {
                const index = this.getAttribute("data-index");
                const commentSection = document.getElementById(`comments-${index}`);
                commentSection.style.display = commentSection.style.display === "none" ? "block" : "none";
            });
        });

        document.querySelectorAll(".like-btn").forEach(button => {
            button.addEventListener("click", function () {
                const likeCountSpan = this.querySelector(".like-count");
                let likes = parseInt(likeCountSpan.textContent);
                const isLiked = this.classList.toggle("liked");

                if (isLiked) {
                    likes += 1;
                    this.innerHTML = `❤️ <span class="like-count">${likes}</span>`;
                } else {
                    likes -= 1;
                    this.innerHTML = `🤍 <span class="like-count">${likes}</span>`;
                }
            });
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

    loadPosts(); // tải bài viết khi vào trang
});