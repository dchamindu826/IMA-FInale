const express = require('express');
const router = express.Router();
const multer = require('multer'); // 🔴 මේ පේළිය අනිවාර්යයෙන්ම තියෙන්න ඕනේ
const { protect } = require('../middleware/authMiddleware');

// Controllers
const { verifyWebhook, handleIncomingMessage } = require('../controllers/whatsappWebhookController');
const { getLeads, bulkAssignLeads } = require('../controllers/leadController');
const { getMessages, sendManualMessage } = require('../controllers/messageController');
const { checkStudentLms, updatePassword, updateEnrollmentPlan } = require('../controllers/bridgeController');
const { getConfig, saveConfig, ingestDocument, getDocuments, deleteDocument } = require('../controllers/crmSetupController');
const { getAssignedCalls, saveCallLog } = require('../controllers/callCampaignController');

const upload = multer({ dest: 'uploads/' }); // Temporary folder for PDFs

// --- 1. WhatsApp Webhook (Meta API) ---
router.get('/webhook', verifyWebhook);
router.post('/webhook', handleIncomingMessage);

// --- 2. Lead Management ---
router.get('/leads', protect, getLeads);
router.post('/leads/bulk-assign', protect, bulkAssignLeads);

// --- 3. Messaging ---
router.get('/messages/:leadId', protect, getMessages);
router.post('/messages/send', protect, sendManualMessage);

// --- 4. LMS Bridge ---
router.get('/bridge/student/:phone', protect, checkStudentLms);
router.post('/bridge/update-password', protect, updatePassword);
router.post('/bridge/update-enrollment', protect, updateEnrollmentPlan);

// --- 5. CRM Setup & Ingestion ---
router.get('/setup/config/:phase', protect, getConfig);
router.post('/setup/config', protect, saveConfig);
router.post('/setup/ingest', protect, upload.single('pdf'), ingestDocument);
router.get('/setup/documents/:phase', protect, getDocuments);
router.delete('/setup/documents/:id', protect, deleteDocument);

// --- 6. Call Campaign Routes ---
router.get('/calls/assigned', protect, getAssignedCalls);
router.post('/calls/log', protect, saveCallLog);

module.exports = router;