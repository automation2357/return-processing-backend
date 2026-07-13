const bcrypt = require('bcryptjs');
const User = require('../models/userModel');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

const toPublicUser = (user) => ({
  _id: user._id,
  username: user.username,
  role: user.role,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

exports.listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ createdAt: 1 });
  res.status(200).json(new ApiResponse(200, users.map(toPublicUser), 'Users fetched successfully'));
});

exports.createUser = asyncHandler(async (req, res) => {
  const username = String(req.body.username || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const role = req.body.role === 'admin' ? 'admin' : 'staff';

  if (!username || !password) {
    throw new ApiError(400, 'Username and password are required');
  }
  if (password.length < 6) {
    throw new ApiError(400, 'Password must be at least 6 characters');
  }

  const existing = await User.findOne({ username });
  if (existing) {
    throw new ApiError(409, `Username "${username}" is already taken`);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ username, passwordHash, role });

  res.status(201).json(new ApiResponse(201, toPublicUser(user), 'User created successfully'));
});

exports.updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const { username, password, role } = req.body;

  if (role && role !== user.role) {
    if (user.role === 'admin' && role !== 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        throw new ApiError(400, 'Cannot demote the last remaining admin');
      }
    }
    user.role = role === 'admin' ? 'admin' : 'staff';
  }

  if (username) {
    const normalized = String(username).trim().toLowerCase();
    if (normalized !== user.username) {
      const existing = await User.findOne({ username: normalized });
      if (existing) {
        throw new ApiError(409, `Username "${normalized}" is already taken`);
      }
      user.username = normalized;
    }
  }

  if (password) {
    if (password.length < 6) {
      throw new ApiError(400, 'Password must be at least 6 characters');
    }
    user.passwordHash = await bcrypt.hash(password, 10);
  }

  await user.save();

  res.status(200).json(new ApiResponse(200, toPublicUser(user), 'User updated successfully'));
});

exports.deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (String(user._id) === String(req.user.sub)) {
    throw new ApiError(400, 'You cannot delete your own account while logged in');
  }

  if (user.role === 'admin') {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount <= 1) {
      throw new ApiError(400, 'Cannot delete the last remaining admin');
    }
  }

  await user.deleteOne();

  res.status(200).json(new ApiResponse(200, null, 'User deleted successfully'));
});
