const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');


// Auth Middleware (ඔයාගේ path එකට ගැලපෙන විදිහට හදාගන්න, සාමාන්‍යයෙන් මේක හරි)
const { protect } = require('../middleware/authMiddleware');

const { onlinePaymentSuccessNotify, courseConfirm, paymentTypeSelect, uploadSlip, updateSlip, getPaymentHash, getPaymentsApi, myPayments } = require('../controllers/paymentController');
const { index: studentIndex, classRoom, viewModule, viewZoom, viewYoutubeLive, startExam, paperComplete, addUserAnswer, updateUserAnswer, getDownloadRecording } = require('../controllers/studentController');
const { handleBankEmail, verifySlipWithAI } = require('../controllers/bankWebhookController');
const { init, sendContact, start, updateProfile, updateProfilePic, deleteProfilePic, updatePassword } = require('../controllers/homeController');

// --- Multer Configuration for Slips & Answers ---
const answerStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Payment slips සහ User answers යන දෙකටම මේක පාවිච්චි කරන්න පුළුවන්. 
        // නැත්නම් slipImages ෆෝල්ඩරේට වෙනම හදන්නත් පුළුවන්.
        cb(null, path.join(__dirname, '../public/userAnswers')); 
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const uploadAnswer = multer({ storage: answerStorage });

// User Profile Image upload config
const userImgStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../public/userImages'));
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const uploadUserImg = multer({ storage: userImgStorage });
const { getStudentDashboard } = require('../controllers/studentController');


// ====== PAYMENT ROUTES ======
router.post('/payment/payhere/notify', onlinePaymentSuccessNotify); // PayHere Webhook (No auth protect needed)
router.post('/payment/course-confirm', protect, courseConfirm);
router.post('/payment/installment-select', protect, paymentTypeSelect);
router.post('/payment/slip/upload', protect, uploadAnswer.single('slipImg'), uploadSlip); 
router.put('/payment/slip/update', protect, uploadAnswer.single('slipImg'), updateSlip);
router.post('/payment/hash', protect, getPaymentHash);
router.get('/payment/admin/all', protect, getPaymentsApi);
router.get('/student/my-payments', protect, myPayments);

// ====== STUDENT APP ROUTES ======
router.get('/student/dashboard', protect, studentIndex);
router.get('/student/classroom', protect, classRoom);
router.get('/student/module/:courseId', protect, viewModule);
router.post('/student/zoom', protect, viewZoom);
router.post('/student/youtube', protect, viewYoutubeLive);
router.get('/student/recording/download/:meetingId', protect, getDownloadRecording);

router.post('/student/exam/start', protect, startExam);
router.post('/student/exam/submit', protect, paperComplete);
router.post('/student/structured-paper/submit', protect, uploadAnswer.single('file'), addUserAnswer);
router.put('/student/structured-paper/update', protect, uploadAnswer.single('file'), updateUserAnswer);

// ====== BANK WEBHOOK & AI ROUTES ======
router.post('/bank/webhook', handleBankEmail); // No auth
router.post('/bank/ai-verify', protect, verifySlipWithAI); // Admin route

// ====== HOME & PROFILE ROUTES ======
router.get('/home/init', init); // No auth
router.post('/home/contact', sendContact); // No auth

router.get('/student/start', protect, start);
router.put('/student/profile/update', protect, updateProfile);
router.put('/student/profile/picture-update', protect, uploadUserImg.single('profileImg'), updateProfilePic);
router.delete('/student/profile/picture-delete', protect, deleteProfilePic);
router.put('/student/profile/password-update', protect, updatePassword);

router.get('/dashboard', protect, getStudentDashboard);



module.exports = router;