const mongoose = require("mongoose");

const listFriendSchema = new mongoose.Schema({
    userId1: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Người gửi
    userId2: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Người nhận
    notification: { type: String, default: null },
    status: { type: String, enum: ["waiting", "friend"], default: "waiting" }
});

const ListFriend = mongoose.model("ListFriend", listFriendSchema);
module.exports = ListFriend;