const { PendingOrders } = require('../models/pendingOrdersModel.js');
const asyncHandler = require('../utils/asyncHandler.js');
const ApiResponse = require('../utils/ApiResponse.js');
const ApiError = require('../utils/ApiError.js');
const axios = require('axios');
const { NOCODB_CONFIG, NOCODB_SCAN_TRACKING_CONFIG } = require('../config/nocodbConfig.js');

/**
 * @desc Get Pending Orders
 * @route GET /api/pending-orders
 */
const getPendingOrders = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.max(parseInt(req.query.limit) || 25, 1);
  const skip = (page - 1) * limit;

  const [orders, totalRecords] = await Promise.all([
    PendingOrders.find({}).sort({ order_date: 1 }).skip(skip).limit(limit).lean(),
    PendingOrders.countDocuments(),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        orders,
        pagination: {
          page,
          limit,
          totalRecords,
          totalPages: Math.ceil(totalRecords / limit),
        },
      },
      'Pending orders fetched successfully.'
    )
  );
});

/**
 * @desc Create Pending Orders (Single + Bulk)
 * @route POST /api/pending-orders
 */
const createPendingOrders = asyncHandler(async (req, res) => {
  const payload = req.body;

  let createdOrders;

  if (Array.isArray(payload)) {
    if (payload.length === 0) {
      return res.status(400).json(new ApiResponse(400, null, 'Request body cannot be empty.'));
    }

    createdOrders = await PendingOrders.insertMany(payload, {
      ordered: true,
    });
  } else {
    createdOrders = await PendingOrders.create(payload);
  }

  return res
    .status(201)
    .json(new ApiResponse(201, createdOrders, 'Pending order(s) created successfully.'));
});

/**
 * @desc Update Pending Order
 * @route PUT /api/pending-orders/:id
 */
const updatePendingOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const updatedOrder = await PendingOrders.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!updatedOrder) {
    return res.status(404).json(new ApiResponse(404, null, 'Pending order not found.'));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedOrder, 'Pending order updated successfully.'));
});

const getNocoDbRecord = asyncHandler(async (req, res) => {
  const { order_id } = req.params;
  if (!order_id) {
    return new ApiError(409, 'order_id is required');
  }
  const response = await axios.request(NOCODB_CONFIG(order_id));
  return res
    .status(200)
    .json(new ApiResponse(200, response.data.list, 'Nocodb record fetched successfully'));
});

/**
 * @desc Get the scan-tracking record for an order (which employee's name
 *       landed in the scan_tracking field, if any) — used by the Processed
 *       page to show who scanned each order.
 * @route GET /pending-orders/nocodb/scan-tracking/:order_id
 */
const getScanTrackingRecord = asyncHandler(async (req, res) => {
  const { order_id } = req.params;
  if (!order_id) {
    return new ApiError(409, 'order_id is required');
  }
  const response = await axios.request(NOCODB_SCAN_TRACKING_CONFIG(order_id));
  return res
    .status(200)
    .json(new ApiResponse(200, response.data.list, 'Scan tracking record fetched successfully'));
});

const getUser = asyncHandler(async (req, res) => {
  const { employee_id } = req.params;
  if (!employee_id) {
    return new ApiError(409, 'employee_id is required');
  }
  const response = await axios.get(process.env.FAST_API_URL);
  const users = response.data?.data || [];
  const user = users.filter((user) => user.id === Number(employee_id));
  return res.status(200).json(new ApiResponse(200, user, 'Employee id fetched successfully'));
});

module.exports = {
  getPendingOrders,
  createPendingOrders,
  updatePendingOrder,
  getNocoDbRecord,
  getScanTrackingRecord,
  getUser,
};
