const mongoose = require('mongoose');

const returnAcceptanceSchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReturnSession',
      required: true,
      index: true,
    },
    return_record: { type: mongoose.Schema.Types.ObjectId, ref: 'ReturnRecord' },
    // Denormalized from the return record at accept-time so this log stays
    // accurate even after a later bulk import replaces the returns collection.
    channel_id: { type: String, trim: true },
    invoice_number: { type: String, trim: true },
    porduct_sku_code: { type: String, trim: true },
    return_date: { type: Date },
    sent_qty: { type: Number, min: 0 },
    good_qty: { type: Number, min: 0, default: 0 },
    bad_qty: { type: Number, min: 0, default: 0 },
    return_type: { type: String, enum: ['courier', 'customer'], required: true },
    return_comments: { type: String, trim: true },
    accepted_timestamp: { type: Date, required: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model('ReturnAcceptance', returnAcceptanceSchema);
