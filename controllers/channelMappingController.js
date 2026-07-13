const ChannelPrefixMapping = require('../models/channelPrefixMappingModel');
const Channel = require('../models/channelModel');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

exports.listMappings = asyncHandler(async (req, res) => {
  const mappings = await ChannelPrefixMapping.find().sort({ prefix: 1 });
  res.status(200).json(new ApiResponse(200, mappings, 'Channel mappings fetched successfully'));
});

exports.bulkUpsertMappings = asyncHandler(async (req, res) => {
  const payload = req.body;
  const records = Array.isArray(payload) ? payload : payload?.records;

  if (!Array.isArray(records) || records.length === 0) {
    throw new ApiError(400, 'Expected a non-empty array of { prefix, channel } records');
  }

  const validRecords = records.filter((record) => record && record.prefix && record.channel);
  if (validRecords.length === 0) {
    throw new ApiError(400, 'No valid records with a prefix and channel were provided');
  }

  const bulkOps = validRecords.map((record) => ({
    updateOne: {
      filter: { prefix: String(record.prefix).trim().toUpperCase() },
      update: { $set: { channel: String(record.channel).trim() } },
      upsert: true,
    },
  }));

  const result = await ChannelPrefixMapping.bulkWrite(bulkOps);

  const distinctChannels = [...new Set(validRecords.map((record) => String(record.channel).trim()))];
  await Channel.bulkWrite(
    distinctChannels.map((name) => ({
      updateOne: {
        filter: { name: { $regex: `^${name}$`, $options: 'i' } },
        update: { $setOnInsert: { name } },
        upsert: true,
      },
    }))
  );

  res.status(200).json(
    new ApiResponse(
      200,
      { matched: result.matchedCount, upserted: result.upsertedCount, mappingCount: bulkOps.length },
      'Channel mappings synced successfully'
    )
  );
});

exports.updateMapping = asyncHandler(async (req, res) => {
  const mapping = await ChannelPrefixMapping.findById(req.params.id);
  if (!mapping) {
    throw new ApiError(404, 'Mapping not found');
  }

  const { prefix, channel } = req.body;

  if (prefix) {
    const normalizedPrefix = String(prefix).trim().toUpperCase();
    if (!normalizedPrefix) {
      throw new ApiError(400, 'Prefix cannot be empty');
    }
    if (normalizedPrefix !== mapping.prefix) {
      const existing = await ChannelPrefixMapping.findOne({ prefix: normalizedPrefix });
      if (existing) {
        throw new ApiError(409, `Prefix "${normalizedPrefix}" is already mapped to another channel`);
      }
      mapping.prefix = normalizedPrefix;
    }
  }

  if (channel) {
    const normalizedChannel = String(channel).trim();
    if (!normalizedChannel) {
      throw new ApiError(400, 'Channel cannot be empty');
    }
    mapping.channel = normalizedChannel;

    const existingChannel = await Channel.findOne({ name: { $regex: `^${normalizedChannel}$`, $options: 'i' } });
    if (!existingChannel) {
      await Channel.create({ name: normalizedChannel });
    }
  }

  await mapping.save();

  res.status(200).json(new ApiResponse(200, mapping, 'Mapping updated successfully'));
});

exports.deleteMapping = asyncHandler(async (req, res) => {
  const mapping = await ChannelPrefixMapping.findById(req.params.id);
  if (!mapping) {
    throw new ApiError(404, 'Mapping not found');
  }

  await mapping.deleteOne();
  res.status(200).json(new ApiResponse(200, null, 'Mapping deleted successfully'));
});
