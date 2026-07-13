const Channel = require('../models/channelModel');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

const DEFAULT_CHANNELS = ['Myntra', 'Nykaa', 'Ajio', 'Shopify', 'Tatacliq'];

exports.listChannels = asyncHandler(async (req, res) => {
  const count = await Channel.countDocuments();
  if (count === 0) {
    await Channel.insertMany(
      DEFAULT_CHANNELS.map((name) => ({ name })),
      { ordered: false }
    ).catch(() => {});
  }

  const channels = await Channel.find().sort({ name: 1 });
  res.status(200).json(new ApiResponse(200, channels, 'Channels fetched successfully'));
});

exports.createChannel = asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) {
    throw new ApiError(400, 'Channel name is required');
  }

  const existing = await Channel.findOne({ name: { $regex: `^${name}$`, $options: 'i' } });
  if (existing) {
    return res.status(200).json(new ApiResponse(200, existing, 'Channel already exists'));
  }

  const channel = await Channel.create({ name });
  res.status(201).json(new ApiResponse(201, channel, 'Channel created successfully'));
});
