const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config');

const toPublicUser = (user) => ({
  id: user._id,
  username: user.username,
  role: user.role,
});

exports.login = asyncHandler(async (req, res) => {
  const username = String(req.body.username || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!username || !password) {
    throw new ApiError(400, 'Username and password are required');
  }

  const user = await User.findOne({ username });
  if (!user) {
    throw new ApiError(401, 'Invalid username or password');
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw new ApiError(401, 'Invalid username or password');
  }

  const token = jwt.sign({ sub: String(user._id), username: user.username, role: user.role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  res.status(200).json(new ApiResponse(200, { token, user: toPublicUser(user) }, 'Logged in successfully'));
});

exports.getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.sub);
  if (!user) {
    throw new ApiError(401, 'User no longer exists');
  }

  res.status(200).json(new ApiResponse(200, toPublicUser(user), 'Current user fetched successfully'));
});
