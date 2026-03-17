const express = require('express');
const router = express.Router();
const { verifyWebhook, handleIncomingMessage } = require('../controllers/whatsappController');

// Meta Webhook Verification (GET request)
router.get('/webhook', verifyWebhook);

// Meta Incoming Messages (POST request)
router.post('/webhook', handleIncomingMessage);

module.exports = router;