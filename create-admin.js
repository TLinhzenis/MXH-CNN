const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./model/User');

const MONGODB_URI = 'mongodb+srv://btuanlinh715:Btuanlinh715@cluster0.krja2.mongodb.net/MXH?retryWrites=true&w=majority&appName=Cluster0';

async function createAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Kết nối MongoDB thành công');

    // Kiểm tra xem admin đã tồn tại chưa
    const existingAdmin = await User.findOne({ username: 'admin' });
    if (existingAdmin) {
      console.log('❌ Tài khoản admin đã tồn tại!');
      return;
    }

    // Tạo mật khẩu hash
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Tạo tài khoản admin
    const admin = new User({
      username: 'admin',
      password: hashedPassword,
      fullName: 'Administrator',
      email: 'admin@example.com',
      phone: '0123456789',
      role: 'admin'
    });

    await admin.save();
    console.log('✅ Tạo tài khoản admin thành công!');
    console.log('📋 Thông tin đăng nhập:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('🔗 Truy cập: http://localhost:5000/UI/admin-login.html');

  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Đã ngắt kết nối MongoDB');
  }
}

createAdmin(); 