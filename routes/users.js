const express = require('express');
const requireAdmin = require('../middleware/requireAdmin');
const { listUsers, createUser, updateUser, deleteUser } = require('../controllers/userController');

const router = express.Router();

router.use(requireAdmin);

router.get('/', listUsers);
router.post('/', createUser);
router.patch('/:id', updateUser);
router.delete('/:id', deleteUser);

module.exports = router;
