const mongoose = require('mongoose');

const returnRecordSchema = new mongoose.Schema(
  {
    order_id: { type: String, trim: true, index: true },
    invoice_id: { type: String, trim: true, index: true },
    invoice_number: { type: String, trim: true, index: true },
    channel_order_id: { type: String, trim: true },
    channel_sub_order_id: { type: String, trim: true, index: true },
    buyer_name: { type: String, trim: true },
    product_name: { type: String, trim: true },
    porduct_sku_code: { type: String, trim: true },
    channel_id: { type: String, trim: true },
    channel_name: { type: String, trim: true },
    qty: { type: Number, min: 0 },
    order_type: { type: String, trim: true },
    total: { type: Number, min: 0 },
    shipment_tracker: { type: String, trim: true, index: true },
    shipping_company: { type: String, trim: true },
    order_status: { type: String, trim: true },
    return_reason: { type: String, trim: true },
    return_date: { type: Date },
    return_delivered_date: { type: Date },
    return_tracking_id: { type: String, trim: true, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

returnRecordSchema.index({ order_id: 1, invoice_id: 1, shipment_tracker: 1 });

module.exports = mongoose.model('ReturnRecord', returnRecordSchema);
