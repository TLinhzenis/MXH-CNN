# MXH-CNN

# Ứng dụng Mạng xã hội

## Tính năng mới: Quản lý bài viết trong Admin Dashboard

### Chức năng quản lý bài viết
- **Xem tất cả bài viết**: Hiển thị danh sách tất cả bài viết trong hệ thống
- **Lọc bài viết bị report**: Chỉ hiển thị bài viết có số lượng report > 0
- **Xóa bài viết**: Admin có thể xóa bài viết vi phạm
- **Thông tin chi tiết**: Hiển thị đầy đủ thông tin về bài viết bao gồm:
  - Người đăng
  - Nội dung bài viết
  - Hình ảnh
  - Loại bài viết
  - Địa điểm
  - Số lượng reaction
  - Số lượng comment
  - Số lượng report (hiển thị màu đỏ nếu > 0)
  - Ngày tạo

### 🔒 Tính năng bảo mật tự động
- **Tự động xóa nội dung nguy hiểm**: Bài viết có type "knife" hoặc "gun" sẽ bị xóa ngay lập tức
- **Xóa file ảnh**: File ảnh vi phạm cũng được xóa khỏi server
- **Lọc feed**: Nội dung nguy hiểm không xuất hiện trong feed người dùng
- **Thông báo admin**: Admin được thông báo khi có bài viết bị tự động xóa

### Cách sử dụng
1. Đăng nhập vào Admin Dashboard
2. Chọn menu "Quản lý bài viết"
3. Sử dụng các nút filter:
   - **"Tất cả bài viết"**: Hiển thị tất cả bài viết
   - **"Chỉ hiển thị bài viết bị report"**: Chỉ hiển thị bài viết có report > 0
4. Nhấn nút "Xóa" để xóa bài viết vi phạm

### API Endpoints mới
- `GET /api/admin/posts` - Lấy danh sách tất cả bài viết
- `DELETE /api/admin/posts/:id` - Xóa bài viết theo ID
- `GET /api/admin/deleted-posts` - Lấy danh sách bài viết đã bị tự động xóa

### Giao diện
- Bảng hiển thị thông tin bài viết với responsive design
- Nút filter với styling đẹp mắt
- Hiển thị số report với màu đỏ để dễ nhận biết
- Hình ảnh bài viết được hiển thị thu nhỏ
- Thông báo cảnh báo khi có bài viết bị tự động xóa

## Các tính năng khác

### Thống kê
- Thống kê type bài viết phổ biến nhất
- Thống kê location phổ biến nhất  
- Thống kê tag phổ biến nhất
- Số bài đăng trong ngày
- Số người dùng đăng ký mới trong ngày

### Quản lý tài khoản
- Xem danh sách tất cả người dùng
- Thêm người dùng mới
- Sửa thông tin người dùng
- Xóa người dùng

## Cài đặt và chạy

1. Cài đặt dependencies:
```bash
npm install
```

2. Tạo tài khoản admin (chỉ chạy 1 lần):
```bash
node create-admin.js
```

3. Chạy server:
```bash
node server.js
```

4. Truy cập ứng dụng tại: `http://localhost:5000`

5. **Đăng nhập admin tại**: `http://localhost:5000/UI/admin-login.html`
   - Username: `admin`
   - Password: `admin123`

## Trang Admin

### Đăng nhập Admin
- **URL**: `http://localhost:5000/UI/admin-login.html`
- **Tài khoản mặc định**:
  - Username: `admin`
  - Password: `admin123`

### Dashboard Admin
- **URL**: `http://localhost:5000/UI/admin-dashboard.html`
- **Tính năng**:
  - Thống kê tổng quan
  - Quản lý tài khoản người dùng
  - **Quản lý bài viết** (tính năng mới)
    - Xem tất cả bài viết
    - Lọc bài viết bị report
    - Xóa bài viết vi phạm
    - Thông báo bài viết bị tự động xóa

## 🔒 Bảo mật và Moderation

### Tự động phát hiện và xóa nội dung nguy hiểm
- **AI phân loại**: Sử dụng AI để phân loại nội dung ảnh
- **Tự động xóa**: Bài viết có type "knife" hoặc "gun" bị xóa ngay lập tức
- **Xóa file**: File ảnh vi phạm cũng được xóa khỏi server
- **Lọc feed**: Nội dung nguy hiểm không xuất hiện trong feed

### Theo dõi và báo cáo
- **Thông báo admin**: Admin được thông báo khi có bài viết bị tự động xóa
- **Lịch sử xóa**: Có thể theo dõi các bài viết đã bị xóa
- **Report thủ công**: Người dùng có thể report bài viết vi phạm
