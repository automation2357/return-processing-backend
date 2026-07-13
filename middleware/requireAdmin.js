const ApiError = require('../utils/ApiError');

// Must run after authMiddleware so req.user is populated.
module.exports = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return next(new ApiError(403, 'Admin access required'));
  }

  next();
};
