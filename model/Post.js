const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Liên kết với User
  status: { type: String, required: true },
  image: { type: String },
  time: { type: String, unique: true },
  type: { type: String,default: 'none' },
  reaction: { type: String, default: '0' },
  comment: { type: String, default: '0' },
  privacy: { type: String }, 
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);
