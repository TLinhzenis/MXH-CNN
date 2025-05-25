const searchInput = document.querySelector('.search-bar');
const historyList = document.querySelector('.search-history-list');
const postList = document.getElementById('post-list');

// Lấy lịch sử từ localStorage
function getSearchHistory() {
    return JSON.parse(localStorage.getItem('searchHistory')) || [];
}

// Lưu lịch sử tìm kiếm mới
function saveSearchHistory(query) {
    let history = getSearchHistory();

    history = history.filter(item => item !== query); // loại trùng
    history.unshift(query); // thêm vào đầu
    if (history.length > 5) history.pop(); // chỉ giữ 5

    localStorage.setItem('searchHistory', JSON.stringify(history));
}

// Hiển thị danh sách lịch sử
function showSearchHistory() {
    const history = getSearchHistory();
    if (history.length === 0) {
        historyList.style.display = 'none';
        return;
    }

    historyList.innerHTML = history.map(item => `
        <div class="history-item">${item}</div>
    `).join('');
    historyList.style.display = 'block';
}


// Thực hiện tìm kiếm
async function triggerSearch(query) {
    if (!query) return;

    try {
        const response = await fetch(`http://localhost:5000/api/auth/search?q=${encodeURIComponent(query)}`);
        const users = await response.json();

        postList.innerHTML = ''; // Xóa feed hiện tại

        if (users.length === 0) {
            postList.innerHTML = '<p>Không tìm thấy người dùng phù hợp.</p>';
            return;
        }

        users.forEach(user => {
            const userDiv = document.createElement('div');
            userDiv.className = 'user-search-result';
            userDiv.innerHTML = `
                <div class="user-info">
                    <img src="../img/${user.avatar}" class="avatar" alt="Avatar">
                    <div>
                        <strong>${user.fullName}</strong><br>
                        <span>${user.phone}</span><br>
                        <small>Trạng thái: ${user.status}</small>
                    </div>
                </div>
                <hr>
            `;
            postList.appendChild(userDiv);
        });
    } catch (err) {
        console.error('Lỗi tìm kiếm:', err);
    }
}

// Bắt sự kiện Enter
searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
        const query = e.target.value.trim();
        if (!query) return;

        saveSearchHistory(query);
        triggerSearch(query);
        historyList.style.display = 'none';
    }
});

// Hiện lịch sử khi focus hoặc nhập vào
searchInput.addEventListener('focus', showSearchHistory);
searchInput.addEventListener('input', showSearchHistory);

// Click vào gợi ý
historyList.addEventListener('click', (e) => {
    if (e.target.classList.contains('history-item')) {
        const query = e.target.textContent;
        searchInput.value = query;
        saveSearchHistory(query);
        triggerSearch(query);
        historyList.style.display = 'none';
    }
});

// Ẩn khi click ra ngoài
document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !historyList.contains(e.target)) {
        historyList.style.display = 'none';
    }
});
