const mongoose = require('mongoose');

// A single OTP request. Short-lived by design — actual validity is checked
// against OTP_VALID_MINUTES in the controller, but the TTL index here also
// hard-deletes stale/abandoned requests so they don't pile up.
const otpSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      index: true,
    },
    // Stored in plaintext — the whole point of this OTP is to be displayed
    // to the whitelisted person on the in-app "My OTP" inbox (see
    // otpController.getOtpInbox), so hashing it here would only make that
    // display impossible without adding any real protection.
    otp: {
      type: String,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

otpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 10 * 60 });

const Otp = mongoose.model('Otp', otpSchema);

module.exports = { Otp };
