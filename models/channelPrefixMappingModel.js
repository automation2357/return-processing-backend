const mongoose = require('mongoose');

const channelPrefixMappingSchema = new mongoose.Schema(
  {
    prefix: { type: String, required: true, unique: true, trim: true, uppercase: true },
    channel: { type: String, required: true, trim: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model('ChannelPrefixMapping', channelPrefixMappingSchema);
