const { WhitelistedNumber } = require('../models/whitelistedNumberModel');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { normalizePhone } = require('../utils/normalizePhone');

/**
 * @desc List whitelisted numbers (Admin page)
 * @route GET /whitelist
 */
const listWhitelist = asyncHandler(async (req, res) => {
  const entries = await WhitelistedNumber.find().sort({ createdAt: -1 });
  res.status(200).json(new ApiResponse(200, entries, 'Whitelisted numbers fetched successfully'));
});

/**
 * @desc Add a name + phone number to the cancel-order OTP whitelist
 * @route POST /whitelist
 */
const createWhitelistEntry = asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const phone = normalizePhone(req.body.phone);

  if (!name) {
    throw new ApiError(400, 'Name is required');
  }
  if (phone.length !== 10) {
    throw new ApiError(400, 'A valid 10-digit phone number is required');
  }

  const existing = await WhitelistedNumber.findOne({ phone });
  if (existing) {
    throw new ApiError(409, 'This phone number is already whitelisted');
  }

  const entry = await WhitelistedNumber.create({ name, phone });
  res.status(201).json(new ApiResponse(201, entry, 'Number whitelisted successfully'));
});

/**
 * @desc Remove a whitelist entry
 * @route DELETE /whitelist/:id
 */
const deleteWhitelistEntry = asyncHandler(async (req, res) => {
  const entry = await WhitelistedNumber.findById(req.params.id);
  if (!entry) {
    throw new ApiError(404, 'Whitelist entry not found');
  }

  await entry.deleteOne();
  res.status(200).json(new ApiResponse(200, null, 'Whitelist entry removed'));
});

module.exports = { listWhitelist, createWhitelistEntry, deleteWhitelistEntry };
