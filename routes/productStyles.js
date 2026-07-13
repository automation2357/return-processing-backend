const express = require('express');
const { getProductStylesByCodes, bulkUpsertProductStyles } = require('../controllers/productStyleController');

const router = express.Router();

router.get('/', getProductStylesByCodes);
router.post('/bulk', bulkUpsertProductStyles);

module.exports = router;
