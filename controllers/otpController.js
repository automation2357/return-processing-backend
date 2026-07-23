const crypto = require('crypto');
const { WhitelistedNumber } = require('../models/whitelistedNumberModel');
const { Otp } = require('../models/otpModel');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { normalizePhone } = require('../utils/normalizePhone');

const OTP_VALID_MINUTES = 5;
const MAX_ATTEMPTS = 5;

/**
 * @desc Request an OTP for cancelling an order — only whitelisted numbers
 *       are allowed through. There's no SMS/email provider: the code is
 *       delivered entirely in-app, via the whitelisted person's own "My OTP"
 *       inbox (see getOtpInbox below), which they check on their own device.
 * @route POST /otp/request
 */
const requestOtp = asyncHandler(async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  if (phone.length !== 10) {
    throw new ApiError(400, 'A valid 10-digit phone number is required');
  }

  const whitelisted = await WhitelistedNumber.findOne({ phone });
  if (!whitelisted) {
    throw new ApiError(403, 'You are not authorized to cancel orders.');
  }

  const otp = String(crypto.randomInt(100000, 1000000));

  // Drop any earlier unverified codes for this number before issuing a new one.
  await Otp.deleteMany({ phone });
  await Otp.create({ phone, otp });

  res.status(200).json(
    new ApiResponse(
      200,
      { name: whitelisted.name },
      `OTP generated — ask ${whitelisted.name} to check their My OTP inbox.`
    )
  );
});

/**
 * @desc Fetch the currently pending OTP for a whitelisted number — this is
 *       the "My OTP" inbox the whitelisted person checks on their own phone
 *       instead of receiving an SMS/email.
 * @route GET /otp/inbox?phone=...
 */
const getOtpInbox = asyncHandler(async (req, res) => {
  const phone = normalizePhone(req.query.phone);
  if (phone.length !== 10) {
    throw new ApiError(400, 'A valid 10-digit phone number is required');
  }

  const whitelisted = await WhitelistedNumber.findOne({ phone });
  if (!whitelisted) {
    throw new ApiError(403, 'You are not authorized to cancel orders.');
  }

  const record = await Otp.findOne({ phone }).sort({ createdAt: -1 });
  const isExpired =
    record && (Date.now() - record.createdAt.getTime()) / (60 * 1000) > OTP_VALID_MINUTES;

  res.status(200).json(
    new ApiResponse(
      200,
      {
        name: whitelisted.name,
        otp: record && !isExpired ? record.otp : null,
        requestedAt: record && !isExpired ? record.createdAt : null,
        validForMinutes: OTP_VALID_MINUTES,
      },
      'OTP inbox fetched successfully'
    )
  );
});

/**
 * @desc Verify a submitted OTP
 * @route POST /otp/verify
 */
const verifyOtp = asyncHandler(async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  const otp = String(req.body.otp || '').trim();

  if (phone.length !== 10 || !otp) {
    throw new ApiError(400, 'Phone number and OTP are required');
  }

  const record = await Otp.findOne({ phone }).sort({ createdAt: -1 });
  if (!record) {
    throw new ApiError(400, 'No OTP request found for this number — request a new OTP.');
  }

  const ageMinutes = (Date.now() - record.createdAt.getTime()) / (60 * 1000);
  if (ageMinutes > OTP_VALID_MINUTES) {
    await record.deleteOne();
    throw new ApiError(400, 'This OTP has expired — request a new one.');
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    await record.deleteOne();
    throw new ApiError(429, 'Too many incorrect attempts — request a new OTP.');
  }

  if (otp !== record.otp) {
    record.attempts += 1;
    await record.save();
    throw new ApiError(400, 'Incorrect OTP.');
  }

  await record.deleteOne();
  res.status(200).json(new ApiResponse(200, { verified: true }, 'OTP verified successfully'));
});

module.exports = { requestOtp, verifyOtp, getOtpInbox };
