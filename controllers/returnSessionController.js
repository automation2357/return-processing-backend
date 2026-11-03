const ReturnSession = require('../models/returnSessionModel');
const ReturnAcceptance = require('../models/returnAcceptanceModel');
const ReturnRecord = require('../models/returnModel');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

const RETURN_TYPE_CSV_CODE = { courier: 'Courier Return', customer: 'Customer Return' };

const csvEscape = (value) => {
  const str = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

const formatCsvDate = (date) => {
  if (!date) return '';
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
};

const getOrCreateActiveSession = async () => {
  const existing = await ReturnSession.findOne({ endedAt: null }).sort({ createdAt: -1 });
  return existing || ReturnSession.create({});
};

exports.getActiveSession = asyncHandler(async (req, res) => {
  const session = await getOrCreateActiveSession();
  const acceptances = await ReturnAcceptance.find({ session: session._id }).sort({ createdAt: -1 });

  res
    .status(200)
    .json(new ApiResponse(200, { session, acceptances }, 'Active session fetched successfully'));
});

exports.endActiveSession = asyncHandler(async (req, res) => {
  const session = await ReturnSession.findOne({ endedAt: null }).sort({ createdAt: -1 });

  if (!session) {
    throw new ApiError(404, 'No active session to end');
  }

  session.endedAt = new Date();
  await session.save();

  res.status(200).json(new ApiResponse(200, session, 'Session ended successfully'));
});

exports.acceptReturn = asyncHandler(async (req, res) => {
  const { return_record_id, good_qty, bad_qty, return_type, return_comments } = req.body;

  if (!return_record_id) {
    throw new ApiError(400, 'return_record_id is required');
  }

  if (!['courier', 'customer'].includes(return_type)) {
    throw new ApiError(400, 'return_type must be "courier" or "customer"');
  }

  const good = Number(good_qty);
  const bad = Number(bad_qty);

  if (!Number.isFinite(good) || !Number.isFinite(bad) || good < 0 || bad < 0) {
    throw new ApiError(400, 'Good and bad quantities must be zero or a positive number');
  }

  const returnRecord = await ReturnRecord.findById(return_record_id);
  if (!returnRecord) {
    throw new ApiError(404, 'Return record not found');
  }

  const sentQty = returnRecord.qty || 0;
  if (good + bad > sentQty) {
    throw new ApiError(
      400,
      `Good + bad quantity (${good + bad}) cannot exceed the sent quantity (${sentQty})`
    );
  }

  const session = await getOrCreateActiveSession();

  const alreadyAccepted = await ReturnAcceptance.findOne({
    session: session._id,
    return_record: returnRecord._id,
  });
  if (alreadyAccepted) {
    throw new ApiError(409, 'This return has already been accepted in the current session');
  }

  const acceptance = await ReturnAcceptance.create({
    session: session._id,
    return_record: returnRecord._id,
    channel_id: returnRecord.channel_id,
    invoice_number: returnRecord.invoice_number,
    porduct_sku_code: returnRecord.porduct_sku_code,
    return_date: returnRecord.return_date,
    sent_qty: sentQty,
    good_qty: good,
    bad_qty: bad,
    return_type,
    return_comments: (return_comments || '').trim(),
    accepted_timestamp: session.createdAt || new Date(),
  });

  res.status(201).json(new ApiResponse(201, acceptance, 'Return accepted successfully'));
});

exports.listClosedSessions = asyncHandler(async (req, res) => {
  const sessions = await ReturnSession.find({ endedAt: { $ne: null } }).sort({ endedAt: -1 });
  const sessionIds = sessions.map((session) => session._id);

  const counts = await ReturnAcceptance.aggregate([
    { $match: { session: { $in: sessionIds } } },
    { $group: { _id: '$session', count: { $sum: 1 } } },
  ]);
  const countBySessionId = new Map(counts.map((entry) => [String(entry._id), entry.count]));

  const result = sessions.map((session) => ({
    ...session.toObject(),
    recordCount: countBySessionId.get(String(session._id)) || 0,
  }));

  res.status(200).json(new ApiResponse(200, result, 'Return session logs fetched successfully'));
});

exports.getSessionDetail = asyncHandler(async (req, res) => {
  const session = await ReturnSession.findById(req.params.id);
  if (!session) {
    throw new ApiError(404, 'Session not found');
  }

  const acceptances = await ReturnAcceptance.find({ session: session._id }).sort({ createdAt: -1 });

  res
    .status(200)
    .json(new ApiResponse(200, { session, acceptances }, 'Session detail fetched successfully'));
});

exports.deleteSession = asyncHandler(async (req, res) => {
  const session = await ReturnSession.findById(req.params.id);
  if (!session) {
    throw new ApiError(404, 'Session not found');
  }

  await ReturnAcceptance.deleteMany({ session: session._id });
  await session.deleteOne();

  res.status(200).json(new ApiResponse(200, null, 'Session deleted successfully'));
});

exports.downloadSessionCsv = asyncHandler(async (req, res) => {
  const session = await ReturnSession.findById(req.params.id);
  if (!session) {
    throw new ApiError(404, 'Session not found');
  }

  const acceptances = await ReturnAcceptance.find({ session: session._id }).sort({ createdAt: 1 });

  const header = [
    'Channel Id',
    'Invoice Number',
    'Return Type',
    'Credit Note Number',
    'Credit Note Date',
    'SKU Code',
    'Good Qty',
    'Bad Qty',
    'Return Comments',
  ];

  const lines = [header.join(',')];
  const returnDate = new Date().toISOString().split('T')[0];

  acceptances.forEach((acceptance) => {
    lines.push(
      [
        csvEscape(acceptance.channel_id),
        csvEscape(acceptance.invoice_number),
        csvEscape(RETURN_TYPE_CSV_CODE[acceptance.return_type] || ''),
        '',
        csvEscape(formatCsvDate(acceptance.return_date) || returnDate),
        csvEscape(acceptance.porduct_sku_code),
        csvEscape(acceptance.good_qty),
        csvEscape(acceptance.bad_qty),
        csvEscape(acceptance.return_comments),
      ].join(',')
    );
  });

  const csvContent = lines.join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="BulkAcceptReturns&CreateCreditNotes.csv"'
  );
  res.status(200).send(csvContent);
});
