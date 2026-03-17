const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const prisma = new PrismaClient();

// Environment Variables (මේවා .env ෆයිල් එකට දාන්න ඕනේ)
const META_API_TOKEN = process.env.META_API_TOKEN;
const META_PHONE_ID = process.env.META_PHONE_ID;
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN; // Webhook එක Verify කරන්න
const AI_BRAIN_URL = process.env.AI_BRAIN_URL || 'http://localhost:8000'; // ඔයාගේ Python API URL එක

// ==========================================
// 1. META WEBHOOK VERIFICATION
// ==========================================
const verifyWebhook = (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
};

// ==========================================
// 2. SEND WHATSAPP MESSAGE HELPER
// ==========================================
const sendWhatsAppMessage = async (to_phone, text, attachmentUrl = null, attachmentType = null) => {
    try {
        const url = `https://graph.facebook.com/v18.0/${META_PHONE_ID}/messages`;
        let data = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: to_phone,
        };

        if (attachmentUrl && attachmentType) {
            // Attachment එකක් තියෙනවා නම් (Image, Video, Document)
            data.type = attachmentType; // "image", "video", "document"
            data[attachmentType] = { link: attachmentUrl, caption: text };
        } else {
            // Text විතරක් නම්
            data.type = "text";
            data.text = { body: text };
        }

        await axios.post(url, data, {
            headers: { Authorization: `Bearer ${META_API_TOKEN}`, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error("Meta API Error:", error.response?.data || error.message);
    }
};

// ==========================================
// 3. MAIN INCOMING MESSAGE HANDLER
// ==========================================
const handleIncomingMessage = async (req, res) => {
    try {
        const body = req.body;

        if (body.object) {
            if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages && body.entry[0].changes[0].value.messages[0]) {
                
                const messageObj = body.entry[0].changes[0].value.messages[0];
                const fromPhone = messageObj.from; // ළමයාගේ Number එක
                const messageText = messageObj.text ? messageObj.text.body : '';
                const senderName = body.entry[0].changes[0].value.contacts[0].profile.name || "Student";

                if (!messageText) return res.sendStatus(200); // Text එකක් නැත්නම් අතාරිනවා

                // 1. Log the incoming message
                await prisma.chat_logs.create({
                    data: { phone: fromPhone, sender_type: 'USER', message: messageText }
                });

                // 2. Identify or Create Lead
                let lead = await prisma.leads.findUnique({ where: { phone: fromPhone } });
                
                if (!lead) {
                    // අලුත් කෙනෙක් නම්, Lead එකක් හදලා Auto Assign කරනවා
                    lead = await prisma.leads.create({
                        data: {
                            fName: senderName,
                            phone: fromPhone,
                            leadType: 'Free Seminar', // Default phase
                            source: 'FB_BOOST',
                            status: 'NEW'
                        }
                    });

                    // (මෙතනදි අර අපි කලින් හදපු processAutoAssignment function එක Call කරන්න පුළුවන්)
                    // await processAutoAssignment(DEFAULT_BATCH_ID, lead.id);
                }

                const currentPhase = lead.leadType === 'Free Seminar' ? 'FREE_SEMINAR' : 'AFTER_SEMINAR';

                // 3. Check Auto Reply Rules (Keywords)
                const autoRule = await prisma.auto_reply_rules.findFirst({
                    where: {
                        phase: currentPhase,
                        keyword: { equals: messageText.trim() } // කෙලින්ම match වෙනවද බලනවා (උදා: "Price", "Timetable")
                    }
                });

                if (autoRule) {
                    // Rule එකක් තියෙනවා නම් ඒක යවනවා (Attachments එක්ක)
                    await sendWhatsAppMessage(fromPhone, autoRule.message, autoRule.attachment_url, autoRule.attachment_type);
                    
                    await prisma.chat_logs.create({
                        data: { phone: fromPhone, sender_type: 'SYSTEM_RULE', message: `[AUTO-REPLY]: ${autoRule.message}` }
                    });
                    
                    return res.sendStatus(200); // AI එකට යන්නේ නෑ
                }

                // 4. Send to Python AI Brain (Gemini 2.0 Flash)
                try {
                    // Python API එකට Call කරනවා
                    const aiResponse = await axios.post(`${AI_BRAIN_URL}/chat`, {
                        question: messageText,
                        subject: "General", // මේවා පස්සේ Lead එකේ Batch එකට අනුව dynamic කරන්න පුළුවන්
                        medium: "Sinhala", 
                        session_id: fromPhone // Phone number එකෙන් Chat History එක මතක තියාගන්නවා
                    });

                    const replyText = aiResponse.data.answer;

                    // AI ගේ උත්තරේ WhatsApp එකට යවනවා
                    await sendWhatsAppMessage(fromPhone, replyText);

                    // AI ගේ උත්තරේ සේව් කරනවා
                    await prisma.chat_logs.create({
                        data: { phone: fromPhone, sender_type: 'AI_BOT', message: replyText }
                    });

                } catch (aiError) {
                    console.error("AI Brain Error:", aiError.message);
                    const fallbackMsg = "⚠️ සමාවෙන්න පුතේ, සිස්ටම් එක මේ වෙලාවේ කාර්යබහුලයි. සුළු මොහොතකින් නැවත මැසේජ් එකක් දාන්න.";
                    await sendWhatsAppMessage(fromPhone, fallbackMsg);
                }
            }
            res.sendStatus(200); // Meta එකට 200 OK යවන්නම ඕනේ නැත්නම් උන් ආයේ ආයේ යවනවා
        } else {
            res.sendStatus(404);
        }
    } catch (error) {
        console.error("Webhook Handler Error:", error);
        res.sendStatus(500);
    }
};

module.exports = {
    verifyWebhook,
    handleIncomingMessage
};