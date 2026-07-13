const mongoose = require('mongoose');
const { MONGODB_URI } = require('../config/index.js');

const connectDB = async () => {
  try {
    const response = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true,
    });

    console.log(`MongoDB connected at ${response.connection.host} successfully`);
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
};

module.exports = { connectDB };
