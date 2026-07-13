const express = require('express');
const { getHealth } = require('../controllers/healthController');
const authMiddleware = require('../middleware/authMiddleware');
const authRouter = require('./auth');
const usersRouter = require('./users');
const returnsRouter = require('./returns');
const productStylesRouter = require('./productStyles');
const returnSessionsRouter = require('./returnSessions');
const channelsRouter = require('./channels');
const channelMappingsRouter = require('./channelMappings');
const unmatchedScansRouter = require('./unmatchedScans');

const router = express.Router();
router.use('/public/product-styles', productStylesRouter);
router.get('/health', getHealth);

// Public: login must work before any token exists.
router.use('/auth', authRouter);

// Everything below requires a valid session.
router.use(authMiddleware);

router.use('/users', usersRouter);
router.use('/returns', returnsRouter);
router.use('/product-styles', productStylesRouter);
router.use('/return-sessions', returnSessionsRouter);
router.use('/channels', channelsRouter);
router.use('/channel-mappings', channelMappingsRouter);
router.use('/unmatched-scans', unmatchedScansRouter);

module.exports = router;
