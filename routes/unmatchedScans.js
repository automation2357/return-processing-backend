const express = require('express');
const requireAdmin = require('../middleware/requireAdmin');
const {
  createUnmatchedScan,
  listUnmatchedScans,
  updateUnmatchedScanChannel,
  deleteUnmatchedScan,
  exportUnmatchedScans,
  matchScannedIds,
  downloadMatchedScanIdsCsv,
} = require('../controllers/unmatchedScanController');

const router = express.Router();

router.get('/export', exportUnmatchedScans);
router.post('/match', matchScannedIds);
router.post('/match/csv', downloadMatchedScanIdsCsv);
router.get('/', listUnmatchedScans);
router.post('/', createUnmatchedScan);
router.patch('/:id', updateUnmatchedScanChannel);
router.delete('/:id', requireAdmin, deleteUnmatchedScan);

module.exports = router;
