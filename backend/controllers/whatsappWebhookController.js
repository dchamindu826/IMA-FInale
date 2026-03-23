const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const prisma = new PrismaClient();

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || "ima_campus_crm_2026";

const verifyWebhook = (req, res) => {
    let mode = req.query["hub.mode"];
    let token = req.query["hub.verify_token"];
    let challenge = req.query["hub.challenge"];
    if (mode && token && mode === "subscribe" && token === VERIFY_TOKEN) {
        return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
};

const handleIncomingMessage = async (req, res) => {
    try {
        const body = req.body;
        if (body.object !== 'whatsapp_business_account') return res.sendStatus(404);

        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const message = value?.messages?.[0];
        const contact = value?.contacts?.[0];

        if (message && message.type === 'text') {
            const phone = message.from;
            const text = message.text.body;
            const name = contact?.profile?.name || 'Student';
            const phoneId = value.metadata.phone_number_id;

            // 1. Lead කෙනෙක්ද බලනවා, නැත්නම් හදනවා
            let lead = await prisma.whatsapp_leads.findUnique({ where: { phone_number: phone } });
            if (!lead) {
                lead = await prisma.whatsapp_leads.create({
                    data: { phone_number: phone, customer_name: name, phase: "FREE_SEMINAR", status: "New" }
                });
            }

            // 2. Incoming Message එක සේව් කරනවා
            await prisma.lead_messages.create({
                data: { lead_id: lead.id, sender_type: "Lead", content: text, message_id: message.id }
            });

            // Unread Count එක වැඩි කරනවා
            await prisma.whatsapp_leads.update({
                where: { id: lead.id },
                data: { last_message_time: new Date(), unread_count: { increment: 1 } }
            });

            // 3. Campaign Settings අරගන්නවා
            const campaign = await prisma.crm_campaigns.findFirst({
                where: { meta_phone_id: phoneId, phase: lead.phase }
            });

            if (!campaign) return res.sendStatus(200);

            // 🤖 BOT LOGIC
            let botReplyText = "";
            let senderType = "AutoBot";

            if (campaign.is_gemini_active && campaign.gemini_keys && campaign.gemini_keys.length > 0) {
                // GEMINI AI BOT
                const keys = campaign.gemini_keys;
                const randomKey = keys[Math.floor(Math.random() * keys.length)];
                const prompt = `You are a helpful assistant for IMA Campus. The student asked: "${text}". Reply in Sinhala or English politely, keeping it short.`;
                
                try {
                    const geminiRes = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${randomKey}`, {
                        contents: [{ parts: [{ text: prompt }] }]
                    });
                    botReplyText = geminiRes.data.candidates[0].content.parts[0].text;
                    senderType = "Gemini";
                } catch (e) { console.error("Gemini API Failed"); }

            } else if (campaign.is_auto_reply_active) {
                // SEQUENCE AUTO REPLY
                const botMessageCount = await prisma.lead_messages.count({
                    where: { lead_id: lead.id, sender_type: { in: ["AutoBot", "Gemini", "Agent"] } }
                });
                const replyRule = await prisma.auto_replies.findFirst({
                    where: { campaign_id: campaign.id, sequence_order: botMessageCount + 1 }
                });
                if (replyRule) botReplyText = replyRule.message_text;
            }

            // 4. Meta API එක හරහා රිප්ලයි යවනවා
            if (botReplyText) {
                await axios.post(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
                    messaging_product: "whatsapp", to: phone, type: "text", text: { body: botReplyText }
                }, { headers: { 'Authorization': `Bearer ${campaign.meta_access_token}` } });

                await prisma.lead_messages.create({
                    data: { lead_id: lead.id, sender_type: senderType, content: botReplyText }
                });
            }
        }
        return res.sendStatus(200);
    } catch (error) {
        console.error("Webhook Error:", error);
        return res.sendStatus(500);
    }
};

module.exports = { verifyWebhook, handleIncomingMessage };