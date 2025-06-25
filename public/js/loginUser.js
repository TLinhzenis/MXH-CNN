document.getElementById("loginBtn").addEventListener("click", async function (e) {
    e.preventDefault();
  
    const username = document.querySelector('input[name="username"]').value;
    const password = document.querySelector('input[name="pass"]').value;
  
    const response = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
  
    const data = await response.json();
  
    if (response.ok) {
      localStorage.setItem("authToken", data.token);
  
      // 👇 Lưu thông tin người dùng vào localStorage
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("userId", data.user._id);
      localStorage.setItem("fullName", data.user.fullName);
      localStorage.setItem("phone", data.user.phone);
      localStorage.setItem("status", data.user.status);
      localStorage.setItem("avatar", data.user.avatar);
      localStorage.setItem("role", data.user.role);

      // Gửi yêu cầu cập nhật status của người dùng thành "online"
      await fetch(`http://localhost:5000/api/auth/update-status`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${data.token}` // Gửi token cho xác thực
        },
        body: JSON.stringify({ status: "online" })
    });
  
      // 👉 Chuyển hướng tới index.html
      window.location.href = "/UI/index.html";
    } else {
      document.querySelector(".error-message").textContent = data.message;
      document.querySelector(".error-message").style.display = "block";
    }
  });