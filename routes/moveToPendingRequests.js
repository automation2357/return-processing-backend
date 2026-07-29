const express = require('express');
const {
  listMoveToPendingRequests,
  createMoveToPendingRequest,
  approveMoveToPendingRequest,
  rejectMoveToPendingRequest,
} = require('../controllers/moveToPendingRequestController');

const router = express.Router();

router.get('/', listMoveToPendingRequests);
router.post('/', createMoveToPendingRequest);
router.post('/:id/approve', approveMoveToPendingRequest);
router.delete('/:id', rejectMoveToPendingRequest);

module.exports = router;
