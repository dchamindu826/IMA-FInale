const express = require('express');
const router = express.Router();
const { verifyWebhook, handleIncomingMessage } = require('../controllers/whatsappWebhookController');

// Meta Developer Portal එකේ දාන්න ඕන URL එක තමයි: 
// https://yourdomain.com/api/whatsapp/webhook

// GET Request එක Verify කරන්න
router.get('/webhook', verifyWebhook);

// POST Request එක Messages අල්ලන්න
router.post('/webhook', handleIncomingMessage);

module.exports = router;