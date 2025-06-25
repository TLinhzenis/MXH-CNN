// Sidebar menu switching
const menuItems = document.querySelectorAll('.menu-item');
const sections = {
  stats: document.getElementById('statsSection'),
  users: document.getElementById('usersSection'),
  posts: document.getElementById('postsSection')
};
menuItems.forEach(item => {
  item.addEventListener('click', () => {
    menuItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    Object.values(sections).forEach(sec => sec.style.display = 'none');
    if (item.dataset.section) sections[item.dataset.section].style.display = '';
    if (item.dataset.section === 'stats') loadStats();
    if (item.dataset.section === 'users') loadUsers();
    if (item.dataset.section === 'posts') loadPosts();
    if (item.id === 'adminLogout') logout();
  });
});

function logout() {
  // Gọi API logout nếu có, sau đó chuyển về trang login
  window.location.href = '/UI/admin-login.html';
}

// Thống kê
async function loadStats() {
  try {
    const res = await fetch('/api/admin/stats');
    const data = await res.json();
    document.getElementById('mostPopularType').textContent = data.type.most;
    document.getElementById('mostPopularLocation').textContent = data.location.most;
    document.getElementById('mostPopularTag').textContent = data.tag.most;
    document.getElementById('postsToday').textContent = data.postsToday;
    document.getElementById('usersToday').textContent = data.usersToday;
    renderChart('typeChart', data.type.data.map(x => x._id), data.type.data.map(x => x.count), 'Type');
    renderChart('locationChart', data.location.data.map(x => x._id), data.location.data.map(x => x.count), 'Location');
    renderChart('tagChart', data.tag.data.map(x => x._id), data.tag.data.map(x => x.count), 'Tag');
  } catch (err) {
    document.getElementById('mostPopularType').textContent = 'Lỗi';
    document.getElementById('mostPopularLocation').textContent = 'Lỗi';
    document.getElementById('mostPopularTag').textContent = 'Lỗi';
    document.getElementById('postsToday').textContent = 'Lỗi';
    document.getElementById('usersToday').textContent = 'Lỗi';
  }
}

function renderChart(canvasId, labels, data, label) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  if (window[canvasId + 'Instance']) window[canvasId + 'Instance'].destroy();
  window[canvasId + 'Instance'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{ label, data, backgroundColor: '#40739e' }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });
}

// Quản lý user
async function loadUsers() {
  try {
    const res = await fetch('/api/admin/users');
    const data = await res.json();
    const tbody = document.querySelector('#usersTable tbody');
    tbody.innerHTML = '';
    data.users.forEach(user => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${user.username}</td>
        <td>${user.email}</td>
        <td>${user.fullName}</td>
        <td>${user.phone}</td>
        <td>${user.role}</td>
        <td>
          <button onclick='editUser("${user._id}")'>Sửa</button>
          <button onclick='deleteUser("${user._id}")'>Xóa</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
    window._users = data.users;
  } catch (err) {
    document.querySelector('#usersTable tbody').innerHTML = '<tr><td colspan="4">Lỗi tải dữ liệu</td></tr>';
  }
}

window.editUser = function(id) {
  const user = window._users.find(u => u._id === id);
  openUserForm(user);
};

window.deleteUser = async function(id) {
  if (!confirm('Xóa tài khoản này?')) return;
  await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
  loadUsers();
};

document.getElementById('addUserBtn').addEventListener('click', () => {
  openUserForm();
});

function openUserForm(user = null) {
  document.getElementById('userFormModal').style.display = '';
  document.getElementById('userId').value = user ? user._id : '';
  document.getElementById('userUsername').value = user ? user.username : '';
  document.getElementById('userEmail').value = user ? user.email : '';
  document.getElementById('userName').value = user ? user.fullName : '';
  document.getElementById('userPhone').value = user ? user.phone : '';
  document.getElementById('userRole').value = user ? user.role : 'user';
  document.getElementById('userPassword').value = '';
}

document.querySelector('.close-modal').onclick = function() {
  document.getElementById('userFormModal').style.display = 'none';
};

document.getElementById('userForm').onsubmit = async function(e) {
  e.preventDefault();
  const id = document.getElementById('userId').value;
  const username = document.getElementById('userUsername').value;
  const email = document.getElementById('userEmail').value;
  const fullName = document.getElementById('userName').value;
  const phone = document.getElementById('userPhone').value;
  const role = document.getElementById('userRole').value;
  const password = document.getElementById('userPassword').value;
  const body = JSON.stringify({ username, email, fullName, phone, role, password });
  if (id) {
    await fetch(`/api/admin/users/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body });
  } else {
    await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
  }
  document.getElementById('userFormModal').style.display = 'none';
  loadUsers();
};

// Quản lý bài viết
let currentPostFilter = 'all';
let allPosts = [];

async function loadPosts() {
  try {
    const res = await fetch('/api/admin/posts');
    const data = await res.json();
    allPosts = data.posts;
    renderPosts(allPosts);
    
    // Kiểm tra và hiển thị thông báo về bài viết bị tự động xóa
    checkAutoDeletedPosts();
  } catch (err) {
    document.querySelector('#postsTable tbody').innerHTML = '<tr><td colspan="10">Lỗi tải dữ liệu</td></tr>';
  }
}

// Kiểm tra bài viết bị tự động xóa
async function checkAutoDeletedPosts() {
  try {
    const res = await fetch('/api/admin/deleted-posts');
    const data = await res.json();
    
    if (data.deletedPosts && data.deletedPosts.length > 0) {
      showAutoDeletedNotification(data.deletedPosts.length);
    }
  } catch (err) {
    console.error('Lỗi kiểm tra bài viết bị xóa:', err);
  }
}

// Hiển thị thông báo bài viết bị tự động xóa
function showAutoDeletedNotification(count) {
  // Tạo thông báo nếu chưa có
  let notification = document.getElementById('auto-delete-notification');
  if (!notification) {
    notification = document.createElement('div');
    notification.id = 'auto-delete-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #e74c3c;
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 10000;
      max-width: 300px;
      font-size: 14px;
    `;
    document.body.appendChild(notification);
  }
  
  notification.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 5px;">🚨 Cảnh báo</div>
    <div>Đã tự động xóa ${count} bài viết có nội dung nguy hiểm (knife/gun)</div>
    <button onclick="this.parentElement.remove()" style="
      background: none;
      border: none;
      color: white;
      float: right;
      cursor: pointer;
      font-size: 18px;
      margin-top: -5px;
    ">&times;</button>
  `;
  
  // Tự động ẩn sau 10 giây
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 10000);
}

function renderPosts(posts) {
  const tbody = document.querySelector('#postsTable tbody');
  tbody.innerHTML = '';
  
  if (posts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 2rem;">Không có bài viết nào</td></tr>';
    return;
  }

  posts.forEach(post => {
    const tr = document.createElement('tr');
    const imageHtml = post.image ? `<img src="/img/${post.image}" alt="Post image" style="width: 50px; height: 50px; object-fit: cover;" onclick="viewImage('/img/${post.image}')" title="Click để xem ảnh lớn">` : 'Không có';
    const createdAt = new Date(post.createdAt).toLocaleDateString('vi-VN');
    const status = post.status || 'Không có nội dung';
    const truncatedStatus = status.length > 50 ? status.substring(0, 50) + '...' : status;
    
    tr.innerHTML = `
      <td>${post.userId ? post.userId.username : 'Không xác định'}</td>
      <td title="${status}" class="post-content">${truncatedStatus}</td>
      <td>${imageHtml}</td>
      <td>${post.type || 'Không có'}</td>
      <td>${post.location || 'Không có'}</td>
      <td>${post.reaction || '0'}</td>
      <td>${post.comment || '0'}</td>
      <td style="color: ${post.report > 0 ? 'red' : 'black'}; font-weight: ${post.report > 0 ? 'bold' : 'normal'}">${post.report || '0'}</td>
      <td>${createdAt}</td>
      <td>
        <button onclick='deletePost("${post._id}")' style="background-color: #e74c3c; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">Xóa</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Xử lý filter buttons
document.getElementById('showAllPosts').addEventListener('click', function() {
  currentPostFilter = 'all';
  updateFilterButtons();
  renderPosts(allPosts);
});

document.getElementById('showReportedPosts').addEventListener('click', function() {
  currentPostFilter = 'reported';
  updateFilterButtons();
  const reportedPosts = allPosts.filter(post => post.report > 0);
  renderPosts(reportedPosts);
});

function updateFilterButtons() {
  const allBtn = document.getElementById('showAllPosts');
  const reportedBtn = document.getElementById('showReportedPosts');
  
  allBtn.classList.remove('active');
  reportedBtn.classList.remove('active');
  
  if (currentPostFilter === 'all') {
    allBtn.classList.add('active');
  } else if (currentPostFilter === 'reported') {
    reportedBtn.classList.add('active');
  }
}

window.deletePost = async function(id) {
  if (!confirm('Xóa bài viết này?')) return;
  try {
    await fetch(`/api/admin/posts/${id}`, { method: 'DELETE' });
    loadPosts(); // Reload posts after deletion
  } catch (err) {
    alert('Lỗi khi xóa bài viết');
  }
};

// Hàm xem ảnh lớn
window.viewImage = function(imageSrc) {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    cursor: pointer;
  `;
  
  const img = document.createElement('img');
  img.src = imageSrc;
  img.style.cssText = `
    max-width: 90%;
    max-height: 90%;
    object-fit: contain;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  `;
  
  modal.appendChild(img);
  document.body.appendChild(modal);
  
  modal.onclick = function() {
    document.body.removeChild(modal);
  };
};

// === Chatbot Gemini cho admin ===
const chatbotForm = document.getElementById('chatbot-form');
const chatbotInput = document.getElementById('chatbot-input');
const chatbotMessages = document.getElementById('chatbot-messages');

let chatHistory = [];

chatbotForm.addEventListener('submit', async function(e) {
  e.preventDefault();
  const question = chatbotInput.value.trim();
  if (!question) return;
  // Hiển thị câu hỏi của admin
  chatHistory.push({ sender: 'admin', text: question });
  renderChatbotMessages();
  chatbotInput.value = '';
  chatbotInput.disabled = true;
  // Hiển thị loading
  chatHistory.push({ sender: 'bot', text: '<i>Đang trả lời...</i>', loading: true });
  renderChatbotMessages();
  try {
    const res = await fetch('/api/admin/chatbot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    });
    const data = await res.json();
    // Xóa loading
    chatHistory = chatHistory.filter(m => !m.loading);
    if (data.answer) {
      chatHistory.push({ sender: 'bot', text: data.answer });
    } else {
      chatHistory.push({ sender: 'bot', text: 'Không nhận được phản hồi từ chatbot.' });
    }
  } catch (err) {
    chatHistory = chatHistory.filter(m => !m.loading);
    chatHistory.push({ sender: 'bot', text: 'Lỗi kết nối chatbot.' });
  }
  renderChatbotMessages();
  chatbotInput.disabled = false;
  chatbotInput.focus();
});

function renderChatbotMessages() {
  chatbotMessages.innerHTML = chatHistory.map(m =>
    `<div style="margin-bottom:8px;text-align:${m.sender==='admin'?'right':'left'}">
      <span style="display:inline-block;padding:8px 12px;border-radius:8px;max-width:90%;background:${m.sender==='admin'?'#40739e':'#f1f2f6'};color:${m.sender==='admin'?'#fff':'#222'};font-style:${m.loading?'italic':'normal'};">${m.text}</span>
    </div>`
  ).join('');
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

// Khởi động mặc định là thống kê
loadStats(); 