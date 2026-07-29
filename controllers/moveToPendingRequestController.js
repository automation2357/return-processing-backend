const axios = require('axios');
const { MoveToPendingRequest } = require('../models/moveToPendingRequestModel');
const { PendingOrders } = require('../models/pendingOrdersModel');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

const STOCK_UPDATE_API_URL = 'https://raw-material-backend.onrender.com/api/v1/stock/update';

// Matches frontend/src/lib/orderCategories.js's MANUAL_*_REASON constants —
// which stage a request's order lands in once approved depends on which of
// the OTP console's three action buttons the admin clicked.
const REASON_BY_ACTION = {
  pending: 'Manual Move To Pending',
  cutting: 'Manual Move To Cutting',
  process: 'Manual Move To Process',
};

/**
 * @desc List all pending "Move to Pending" approval requests
 * @route GET /move-to-pending-requests
 */
const listMoveToPendingRequests = asyncHandler(async (req, res) => {
  const requests = await MoveToPendingRequest.find().sort({ createdAt: -1 });
  res
    .status(200)
    .json(new ApiResponse(200, requests, 'Move to Pending requests fetched successfully'));
});

/**
 * @desc Submit a "Move to Pending" request — called from the Scan Order
 *       page's Stock Available column. Does not create the order yet.
 * @route POST /move-to-pending-requests
 */
const createMoveToPendingRequest = asyncHandler(async (req, res) => {
  const { order, fabricNumbers, employee_id, employee_name } = req.body;
  if (!order || !order.order_id) {
    throw new ApiError(400, 'order is required');
  }

  const request = await MoveToPendingRequest.create({
    order,
    fabricNumbers: fabricNumbers || [],
    requested_by_employee_id: employee_id,
    requested_by_employee_name: employee_name,
  });

  res
    .status(201)
    .json(new ApiResponse(201, request, 'Move to Pending request submitted successfully'));
});

/**
 * @desc Approve a request — creates the order, routed to Pending, Ready for
 *       Cutting, or Ready for Process depending on req.body.action, then
 *       removes the request. Only the 'pending' action also resets every
 *       selected fabric's stock to 0 — cutting/process leave stock alone
 *       (see the comment at the reset call below). This is what the OTP
 *       console's "Move to Pending Approval" tab calls when an admin clicks
 *       one of its three action buttons.
 * @route POST /move-to-pending-requests/:id/approve
 * @body { action?: 'pending' | 'cutting' | 'process' } — defaults to 'pending'
 */
const approveMoveToPendingRequest = asyncHandler(async (req, res) => {
  const request = await MoveToPendingRequest.findById(req.params.id);
  if (!request) {
    throw new ApiError(404, 'Move to Pending request not found');
  }

  const action = REASON_BY_ACTION[req.body?.action] ? req.body.action : 'pending';

  const createdOrder = await PendingOrders.create({
    ...request.order,
    reason: REASON_BY_ACTION[action],
    isProcessed: action !== 'pending',
  });

  // Only "Move to Pending" zeros the selected fabrics' stock — that's the
  // case where the fabric was wrongly counted as available and the order is
  // going back to wait for real stock. Move to Cutting/Process send the
  // order straight into production, so the fabric stock is left untouched.
  if (action === 'pending') {
    await Promise.all(
      (request.fabricNumbers || [])
        .filter((fabricNumber) => fabricNumber !== null && fabricNumber !== '')
        .map((fabricNumber) =>
          axios.put(STOCK_UPDATE_API_URL, { fabricNumber, stockQuantity: 0 })
        )
    );
  }

  await request.deleteOne();

  const stageLabel = { pending: 'Pending', cutting: 'Ready for Cutting', process: 'Ready for Process' }[
    action
  ];
  res
    .status(200)
    .json(new ApiResponse(200, createdOrder, `Order moved to ${stageLabel} successfully`));
});

/**
 * @desc Discard a request without approving it
 * @route DELETE /move-to-pending-requests/:id
 */
const rejectMoveToPendingRequest = asyncHandler(async (req, res) => {
  const request = await MoveToPendingRequest.findById(req.params.id);
  if (!request) {
    throw new ApiError(404, 'Move to Pending request not found');
  }
  await request.deleteOne();
  res.status(200).json(new ApiResponse(200, null, 'Move to Pending request discarded'));
});

module.exports = {
  listMoveToPendingRequests,
  createMoveToPendingRequest,
  approveMoveToPendingRequest,
  rejectMoveToPendingRequest,
};
