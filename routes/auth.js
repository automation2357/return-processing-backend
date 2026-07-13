const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { login, getCurrentUser } = require('../controllers/authController');

const router = express.Router();

router.post('/login', login);
router.get('/me', authMiddleware, getCurrentUser);

module.exports = router;
