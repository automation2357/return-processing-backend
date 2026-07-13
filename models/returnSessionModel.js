const mongoose = require('mongoose');

const returnSessionSchema = new mongoose.Schema(
  {
    endedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model('ReturnSession', returnSessionSchema);
