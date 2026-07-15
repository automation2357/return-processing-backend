const express = require('express');
const {
  getPendingOrders,
  createPendingOrders,
  updatePendingOrder,
  getNocoDbRecord,
  getUser,
} = require('../controllers/pendingOrderController');
const router = express.Router();

router.get('/', getPendingOrders);
router.post('/', createPendingOrders);
router.get('/nocodb/:order_id', getNocoDbRecord);
router.get('/nocodb/user/:employee_id', getUser);
router.put('/:id', updatePendingOrder);

module.exports = router;
