const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');

// Get all users (admin only)
router.get('/', auth, userController.getAllUsers);

// Get single user
router.get('/:id', auth, userController.getUserById);

// Update user
router.put('/:id', auth, userController.updateUser);

// Delete user (admin only)
router.delete('/:id', auth, userController.deleteUser);

module.exports = router;
