const ProductStyle = require('../models/productStyleModel');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

exports.getProductStylesByCodes = asyncHandler(async (req, res) => {
  const codes = String(req.query.codes || '')
    .split(',')
    .map((code) => code.trim())
    .filter(Boolean);

  if (codes.length === 0) {
    throw new ApiError(400, 'codes query parameter is required');
  }

  const styles = await ProductStyle.find({ style_number: { $in: codes } });

  res.status(200).json(new ApiResponse(200, styles, 'Product styles fetched successfully'));
});

exports.bulkUpsertProductStyles = asyncHandler(async (req, res) => {
  const payload = req.body;
  const records = Array.isArray(payload) ? payload : payload?.records;

  if (!Array.isArray(records) || records.length === 0) {
    throw new ApiError(400, 'Expected a non-empty array of { style_number, images } records');
  }

  const bulkOps = records
    .filter((record) => record && record.style_number)
    .map((record) => ({
      updateOne: {
        filter: { style_number: String(record.style_number).trim() },
        update: { $addToSet: { images: { $each: (record.images || []).filter(Boolean) } } },
        upsert: true,
      },
    }));

  if (bulkOps.length === 0) {
    throw new ApiError(400, 'No valid records with a style_number were provided');
  }

  const result = await ProductStyle.bulkWrite(bulkOps);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        matched: result.matchedCount,
        upserted: result.upsertedCount,
        styleCount: bulkOps.length,
      },
      'Product styles synced successfully'
    )
  );
});
