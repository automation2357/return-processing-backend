const UnmatchedScan = require('../models/unmatchedScanModel');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { resolveChannelForScannedId } = require('../utils/resolveChannel');
const { csvEscape, formatCsvDateTime } = require('../utils/csv');

exports.createUnmatchedScan = asyncHandler(async (req, res) => {
  const scannedId = String(req.body.scanned_id || '').trim();
  if (!scannedId) {
    throw new ApiError(400, 'scanned_id is required');
  }

  const existing = await UnmatchedScan.findOne({ scanned_id: scannedId });
  if (existing) {
    return res
      .status(200)
      .json(new ApiResponse(200, existing, 'Scan already recorded as unmatched'));
  }

  const providedChannel = String(req.body.channel || '').trim();
  const channel = providedChannel || (await resolveChannelForScannedId(scannedId)) || '';

  if (!channel) {
    // No channel known yet (no mapping match, none provided) — don't persist
    // until the caller supplies one, so unmatched records always have a channel.
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { scanned_id: scannedId, channel: '', pending: true },
          'Channel required before saving'
        )
      );
  }

  const unmatched = await UnmatchedScan.create({ scanned_id: scannedId, channel });
  res.status(201).json(new ApiResponse(201, unmatched, 'Unmatched scan recorded successfully'));
});

exports.listUnmatchedScans = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;

  const [records, total] = await Promise.all([
    UnmatchedScan.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    UnmatchedScan.countDocuments(),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        records,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
      },
      'Unmatched scans fetched successfully'
    )
  );
});

exports.updateUnmatchedScanChannel = asyncHandler(async (req, res) => {
  const channel = String(req.body.channel || '').trim();
  if (!channel) {
    throw new ApiError(400, 'channel is required');
  }

  const record = await UnmatchedScan.findById(req.params.id);
  if (!record) {
    throw new ApiError(404, 'Unmatched scan not found');
  }

  record.channel = channel;
  await record.save();

  res.status(200).json(new ApiResponse(200, record, 'Channel updated successfully'));
});

exports.deleteUnmatchedScan = asyncHandler(async (req, res) => {
  const record = await UnmatchedScan.findById(req.params.id);
  if (!record) {
    throw new ApiError(404, 'Unmatched scan not found');
  }

  await record.deleteOne();
  res.status(200).json(new ApiResponse(200, null, 'Unmatched scan deleted successfully'));
});

exports.exportUnmatchedScans = asyncHandler(async (req, res) => {
  const records = await UnmatchedScan.find().sort({ createdAt: -1 });

  const header = ['Scanned ID', 'Channel', 'Return Received Date'];
  const lines = [header.join(',')];

  records.forEach((record) => {
    lines.push(
      [
        csvEscape(record.scanned_id),
        csvEscape(record.channel),
        csvEscape(formatCsvDateTime(record.createdAt)),
      ].join(',')
    );
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="UnmatchedScans.csv"');
  res.status(200).send(lines.join('\r\n'));
});

const lookupScannedIds = async (rawIds) => {
  const trimmedIds = rawIds.map((id) => String(id).trim()).filter(Boolean);
  const records = await UnmatchedScan.find({ scanned_id: { $in: trimmedIds } });
  const recordById = new Map(records.map((record) => [record.scanned_id, record]));

  return trimmedIds.map((id) => {
    const record = recordById.get(id);
    return {
      scanned_id: id,
      channel: record?.channel || '',
      scanned_at: record ? record.createdAt : null,
      matched: Boolean(record),
    };
  });
};

exports.matchScannedIds = asyncHandler(async (req, res) => {
  const ids = req.body.scanned_ids;
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new ApiError(400, 'scanned_ids array is required');
  }

  const results = await lookupScannedIds(ids);
  const matchedCount = results.filter((result) => result.matched).length;

  res.status(200).json(
    new ApiResponse(200, { results, matchedCount, total: results.length }, 'Scanned ids matched successfully')
  );
});

exports.downloadMatchedScanIdsCsv = asyncHandler(async (req, res) => {
  const ids = req.body.scanned_ids;
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new ApiError(400, 'scanned_ids array is required');
  }

  const results = await lookupScannedIds(ids);

  const header = ['Scanned ID', 'Channel', 'Return Received Date'];
  const lines = [header.join(',')];

  results.forEach((result) => {
    lines.push(
      [
        csvEscape(result.scanned_id),
        csvEscape(result.channel),
        csvEscape(result.scanned_at ? formatCsvDateTime(result.scanned_at) : ''),
      ].join(',')
    );
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="MatchedScanChannels.csv"');
  res.status(200).send(lines.join('\r\n'));
});
