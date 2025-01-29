const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, default: 'admin' }, // Default role, can be 'admin' or 'user'
});

const User = mongoose.model('User', userSchema);

module.exports = User;
