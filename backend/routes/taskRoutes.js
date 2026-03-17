const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
    createTask, completeTask, requestUnlock, approveUnlock, getMyTasks 
} = require('../controllers/taskController');

// Manager Routes
router.post('/create', protect, createTask);
router.post('/approve-unlock', protect, approveUnlock);

// Staff Routes
router.get('/my-tasks', protect, getMyTasks);
router.post('/complete', protect, completeTask);
router.post('/request-unlock', protect, requestUnlock);

module.exports = router;