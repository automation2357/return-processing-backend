const express = require('express');
const {
  listWhitelist,
  createWhitelistEntry,
  deleteWhitelistEntry,
} = require('../controllers/whitelistController');

const router = express.Router();

router.get('/', listWhitelist);
router.post('/', createWhitelistEntry);
router.delete('/:id', deleteWhitelistEntry);

module.exports = router;
