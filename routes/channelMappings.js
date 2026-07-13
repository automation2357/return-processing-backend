const express = require('express');
const {
  listMappings,
  bulkUpsertMappings,
  updateMapping,
  deleteMapping,
} = require('../controllers/channelMappingController');

const router = express.Router();

router.get('/', listMappings);
router.post('/bulk', bulkUpsertMappings);
router.patch('/:id', updateMapping);
router.delete('/:id', deleteMapping);

module.exports = router;
