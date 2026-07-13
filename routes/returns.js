const express = require('express');
const {
  getAllReturns,
  getReturns,
  getReturnByField,
  scanReturn,
  createReturn,
} = require('../controllers/returnController');

const router = express.Router();

router.get('/all', getAllReturns);
router.get('/scan/:value', scanReturn);
router.get('/', getReturns);
router.get('/search/:field/:value', getReturnByField);
router.get('/:field/:value', getReturnByField);
router.post('/bulk', createReturn);
router.post('/', createReturn);

module.exports = router;
