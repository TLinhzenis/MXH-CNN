document.getElementById('adminLoginForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const username = document.getElementById('adminUsername').value;
  const password = document.getElementById('adminPassword').value;
  const errorDiv = document.getElementById('adminLoginError');
  errorDiv.textContent = '';
  try {
    const res = await fetch('http://localhost:5000/api/auth/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      window.location.href = '/UI/admin-dashboard.html';
    } else {
      errorDiv.textContent = data.message || 'Đăng nhập thất bại!';
    }
  } catch (err) {
    errorDiv.textContent = 'Lỗi kết nối máy chủ!';
  }
}); 