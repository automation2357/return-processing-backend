const ApiError = require('../utils/ApiError');

module.exports = (err, req, res, next) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, err.errors || []);
  }

  const response = {
    success: false,
    message: error.message,
    errors: error.errors || [],
  };

  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
  }

  res.status(error.statusCode).json(response);
};
