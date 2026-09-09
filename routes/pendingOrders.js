const express = require('express');
const {
  getPendingOrders,
  createPendingOrders,
  updatePendingOrder,
  getNocoDbRecord,
  getScanTrackingRecord,
  getUser,
  getPendingOrdersByDateRange,
} = require('../controllers/pendingOrderController');
const router = express.Router();

router.get('/', getPendingOrders);
router.get('/date-range', getPendingOrdersByDateRange);
router.post('/', createPendingOrders);
router.get('/nocodb/scan-tracking/:order_id', getScanTrackingRecord);
router.get('/nocodb/:order_id', getNocoDbRecord);
router.get('/nocodb/user/:employee_id', getUser);
router.put('/:id', updatePendingOrder);

module.exports = router;
