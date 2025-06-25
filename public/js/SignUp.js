document.getElementById("saveCustomerBtn").addEventListener("click", async function (e) {
  e.preventDefault();

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const RPpass = document.getElementById("RPpassword").value;
  const fullName = document.getElementById("fullName").value;
  const email = document.getElementById("email").value;
  const phone = document.getElementById("phone").value;

  const response = await fetch("http://localhost:5000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, RPpass, fullName, email, phone })
  });

  const data = await response.json();

  if (response.ok) {
      // Hiển thị thông báo thành công
      document.querySelector(".success-message").textContent = data.message;
      document.querySelector(".success-message").style.display = "block";

      // Sau khi đăng ký thành công, chuyển hướng đến trang login
      setTimeout(function() {
          window.location.href = '/UI/loginUser.html';  // Đổi đường dẫn nếu cần
      }, 2000); // Thời gian delay 2 giây trước khi chuyển hướng
  } else {
      // Hiển thị thông báo lỗi
      document.querySelector(".error-message").textContent = data.message;
      document.querySelector(".error-message").style.display = "block";
  }
});


