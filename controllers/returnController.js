const ReturnRecord = require('../models/returnModel');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

const searchableFields = [
  'order_id',
  'invoice_id',
  'shipment_tracker',
  'return_tracking_id',
  'invoice_number',
  'channel_sub_order_id',
];

// These order statuses aren't real, actionable returns yet, so imports skip them.
const EXCLUDED_ORDER_STATUSES = new Set(
  ['Cancelled Return Received', 'Packed', 'New'].map((status) => status.toLowerCase())
);

const isExcludedOrderStatus = (record) =>
  EXCLUDED_ORDER_STATUSES.has(String(record?.order_status || '').trim().toLowerCase());

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildExactMatchQuery = (value) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;

  const pattern = `^${escapeRegExp(trimmed)}$`;
  return { $or: searchableFields.map((field) => ({ [field]: { $regex: pattern, $options: 'i' } })) };
};

const buildSearchQuery = (queryParams = {}) => {
  const values = searchableFields
    .map((field) => {
      const value = queryParams[field];
      if (typeof value === 'string' && value.trim()) {
        return { [field]: { $regex: value.trim(), $options: 'i' } };
      }
      return null;
    })
    .filter(Boolean);

  if (values.length === 0) {
    return null;
  }

  return { $or: values };
};

exports.getAllReturns = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;

  const [records, total] = await Promise.all([
    ReturnRecord.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    ReturnRecord.countDocuments(),
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
      'Return records fetched successfully'
    )
  );
});

exports.getReturns = asyncHandler(async (req, res) => {
  const query = buildSearchQuery(req.query);

  if (!query) {
    throw new ApiError(404, 'No record found');
  }

  const records = await ReturnRecord.find(query).sort({ createdAt: -1 });

  if (!records || records.length === 0) {
    throw new ApiError(404, 'No record found');
  }

  res.status(200).json(new ApiResponse(200, records, 'Return records fetched successfully'));
});

exports.scanReturn = asyncHandler(async (req, res) => {
  const query = buildExactMatchQuery(req.params.value);

  if (!query) {
    throw new ApiError(400, 'A scan value is required');
  }

  const records = await ReturnRecord.find(query).sort({ createdAt: -1 });

  if (!records || records.length === 0) {
    throw new ApiError(404, 'No record found');
  }

  res.status(200).json(new ApiResponse(200, records, 'Return records fetched successfully'));
});

exports.getReturnByField = asyncHandler(async (req, res) => {
  const { field, value } = req.params;

  if (!searchableFields.includes(field)) {
    throw new ApiError(400, `Unsupported search field: ${field}`);
  }

  const record = await ReturnRecord.findOne({
    [field]: { $regex: value.trim(), $options: 'i' },
  });

  if (!record) {
    throw new ApiError(404, 'No record found');
  }

  res.status(200).json(new ApiResponse(200, record, 'Return record fetched successfully'));
});

exports.createReturn = asyncHandler(async (req, res) => {
  const payload = req.body;

  if (Array.isArray(payload)) {
    await ReturnRecord.deleteMany({});
    const records = await ReturnRecord.insertMany(payload.filter((record) => !isExcludedOrderStatus(record)));

    return res
      .status(201)
      .json(new ApiResponse(201, records, 'Bulk return records created successfully'));
  }

  if (payload && Array.isArray(payload.records)) {
    await ReturnRecord.deleteMany({});
    const records = await ReturnRecord.insertMany(
      payload.records.filter((record) => !isExcludedOrderStatus(record))
    );

    return res
      .status(201)
      .json(new ApiResponse(201, records, 'Bulk return records created successfully'));
  }

  const record = await ReturnRecord.create(payload);

  res.status(201).json(new ApiResponse(201, record, 'Return record created successfully'));
});
