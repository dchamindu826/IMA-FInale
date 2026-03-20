const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');

// අර අපි Part 1 සහ Part 2 වල හැදූ Functions ටික Import කරගන්නවා
const { 
    getPaymentsAdmin, getInstallmentPaymentsAdmin, approvePayment,  declinePayment, 
    approveInstallmentPayment, approveDiscountPayment, freePayment, deleteInstPayment, 
    deletePayment, enablePayment, getDropdownOptions, getPaymentDetailsForApproval, approvePostPay
} = require('../controllers/paymentController');

// ==========================================
// 🔥 ADMIN PAYMENT ROUTES 🔥
// ==========================================

// Data Fetching Routes
router.post('/admin/get-payments', protect, getPaymentsAdmin);
router.post('/admin/get-installments', protect, getInstallmentPaymentsAdmin);

// Action Routes
router.post('/admin/approve', protect, approvePayment);
router.post('/admin/decline', protect, declinePayment);
router.post('/admin/approve-installment', protect, approveInstallmentPayment);
router.post('/admin/approve-discount', protect, approveDiscountPayment);
router.post('/admin/free', protect, freePayment);
router.post('/admin/delete-installment', protect, deleteInstPayment);
router.post('/admin/delete', protect, deletePayment);
router.post('/admin/enable-teacher', protect, enablePayment);

router.post('/admin/get-dropdowns', protect, getDropdownOptions);
router.post('/admin/get-approval-details', protect, getPaymentDetailsForApproval);
router.post('/admin/approve-post-pay', protect, approvePostPay);

module.exports = router;