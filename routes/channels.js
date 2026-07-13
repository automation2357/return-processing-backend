const express = require('express');
const { listChannels, createChannel } = require('../controllers/channelController');

const router = express.Router();

router.get('/', listChannels);
router.post('/', createChannel);

module.exports = router;
