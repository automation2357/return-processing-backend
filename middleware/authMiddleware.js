const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');
const ApiError = require('../utils/ApiError');

module.exports = (req, res, next) => {
  const authHeader = req.header('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return next(new ApiError(401, 'Authentication required'));
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    next(new ApiError(401, 'Invalid or expired session'));
  }
};
