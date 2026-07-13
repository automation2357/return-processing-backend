const ChannelPrefixMapping = require('../models/channelPrefixMappingModel');

// Longest-prefix-wins so a more specific mapping (e.g. "MYSC") takes priority
// over a shorter, coarser one (e.g. "MY") for the same scanned id.
const resolveChannelForScannedId = async (scannedId) => {
  const value = String(scannedId || '').trim().toUpperCase();
  if (!value) return null;

  const mappings = await ChannelPrefixMapping.find().lean();
  const sorted = mappings.sort((a, b) => b.prefix.length - a.prefix.length);
  const match = sorted.find((mapping) => value.startsWith(mapping.prefix.toUpperCase()));

  return match ? match.channel : null;
};

module.exports = { resolveChannelForScannedId };
