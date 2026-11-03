const express = require('express');
const requireAdmin = require('../middleware/requireAdmin');
const {
  getActiveSession,
  endActiveSession,
  acceptReturn,
  listClosedSessions,
  getSessionDetail,
  downloadSessionCsv,
  deleteSession,
  getReturnAcceptanceByInvoiceNumber,
} = require('../controllers/returnSessionController');

const router = express.Router();

router.get('/active', getActiveSession);
router.post('/active/end', endActiveSession);
router.post('/active/accept', acceptReturn);
router.get('/', listClosedSessions);
router.get('/invoice/:invoiceNumber', getReturnAcceptanceByInvoiceNumber);
router.get('/:id/csv', downloadSessionCsv);
router.get('/:id', getSessionDetail);
router.delete('/:id', requireAdmin, deleteSession);

module.exports = router;
