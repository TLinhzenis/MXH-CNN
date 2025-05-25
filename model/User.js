const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullName: { type: String },
  email: { type: String, unique: true },
  phone: { type: String },
  
  // 👇 Gán đường dẫn tới ảnh trong thư mục public
  avatar: { type: String, default: 'default-avatar.jpg' }, 

  status: { type: String, default: 'offline' }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
