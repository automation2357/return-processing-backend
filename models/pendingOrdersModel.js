const mongoose = require('mongoose');

const pendingOrderSchema = new mongoose.Schema(
  {
    style_number: {
      type: Number,
      required: true,
      index: true,
    },
    order_id: {
      type: Number,
      required: true,
      unique: true,
    },
    size: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    channel: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    order_date: {
      type: Date,
      required: true,
      index: true,
    },
    isProcessed: {
      type: Boolean,
      default: false,
      index: true,
    },
    employee_id: {
      type: Number,
      required: true,
      index: true,
    },
    employee_name: {
      type: String,
      required: true,
      trim: true,
    },
    isCancelApproval: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Set once a Cancel Request is actually finalized (see the Cancelled
    // page) — distinct from isCancelApproval, which only flags an order for
    // review. Wins over isCancelApproval in resolveOrderStage so the order
    // moves out of Cancel Requests into Cancelled.
    isCancelled: {
      type: Boolean,
      default: false,
      index: true,
    },
    reason: {
      type: String,
      default: 'No Fabric',
    },
    isShipped: {
      type: Boolean,
      default: false,
    },
    // Set once a Ready for Process order is marked done (see the Processed
    // page) — distinct from isProcessed, which is already used elsewhere to
    // mean "manually routed out of Pending". Ignored once isShipped is set,
    // since shipping is the more terminal state.
    isProcessComplete: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Automatically delete documents 30 days after createdAt
pendingOrderSchema.index(
  { createdAt: 1 },

  { expireAfterSeconds: 30 * 24 * 60 * 60 }
);

const PendingOrders = mongoose.model('PendingOrders', pendingOrderSchema);

module.exports = { PendingOrders };
