const express = require('express');
const { requestOtp, verifyOtp, getOtpInbox } = require('../controllers/otpController');

const router = express.Router();

router.post('/request', requestOtp);
router.post('/verify', verifyOtp);
router.get('/inbox', getOtpInbox);

module.exports = router;
