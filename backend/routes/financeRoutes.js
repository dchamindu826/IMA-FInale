const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getFinanceOverview, getPendingReviews, getVerificationLogs } = require('../controllers/financeController');

router.get('/admin/finance/overview', protect, getFinanceOverview);
router.get('/admin/finance/pending-reviews', protect, getPendingReviews);
router.get('/admin/finance/logs', protect, getVerificationLogs);

module.exports = router;