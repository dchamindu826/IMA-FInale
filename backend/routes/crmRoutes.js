const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { assignLeadsManual, updateCallLog, getStaffLeads } = require('../controllers/crmController');

// Manager Routes
router.post('/assign-bulk', protect, assignLeadsManual);

// Staff Routes
router.get('/my-leads', protect, getStaffLeads);
router.post('/log-call', protect, updateCallLog);

module.exports = router;