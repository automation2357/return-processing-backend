const mongoose = require('mongoose');

// A "Move to Pending" request submitted from the Scan Order page's Stock
// Available column — the actual order creation + fabric stock reset only
// happen once an admin approves it from the OTP console's "Move to Pending
// Approval" tab (see moveToPendingRequestController.approveMoveToPendingRequest).
const moveToPendingRequestSchema = new mongoose.Schema(
  {
    // The pending-order payload to create on approval (style_number,
    // order_id, size, channel, order_date, employee_id, employee_name,
    // reason) — kept as Mixed rather than duplicating pendingOrdersModel's
    // schema here.
    order: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    // Fabric numbers the submitter checked off to reset to 0 stock on approval.
    fabricNumbers: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    requested_by_employee_id: Number,
    requested_by_employee_name: String,
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Auto-expire unapproved requests after 30 days, matching pendingOrdersModel.
moveToPendingRequestSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

const MoveToPendingRequest = mongoose.model('MoveToPendingRequest', moveToPendingRequestSchema);

module.exports = { MoveToPendingRequest };
