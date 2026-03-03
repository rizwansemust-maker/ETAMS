const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const auth = require('../middleware/auth');

// GET all tasks
router.get('/', auth, taskController.getTasks);

// POST create task
router.post('/', auth, taskController.createTask);

// PUT update task
router.put('/:id', auth, taskController.updateTask);

// DELETE task
router.delete('/:id', auth, taskController.deleteTask);

module.exports = router;