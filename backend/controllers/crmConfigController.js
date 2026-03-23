const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const safeJson = (data) => JSON.parse(JSON.stringify(data, (key, value) => typeof value === 'bigint' ? value.toString() : value));

// 1. Campaign එක Save කිරීම / Update කිරීම (Meta & Gemini Keys)
const saveCampaignConfig = async (req, res) => {
    try {
        const { batch_id, phase, meta_number, meta_phone_id, meta_wa_id, meta_access_token, gemini_keys } = req.body;

        // Gemini Keys 5කට වඩා තියෙනවද බලනවා
        if (gemini_keys && gemini_keys.length > 5) {
            return res.status(400).json({ message: "Maximum 5 Gemini API keys allowed." });
        }

        const existing = await prisma.crm_campaigns.findFirst({
            where: { batch_id: BigInt(batch_id), phase: phase }
        });

        let campaign;
        if (existing) {
            campaign = await prisma.crm_campaigns.update({
                where: { id: existing.id },
                data: { meta_number, meta_phone_id, meta_wa_id, meta_access_token, gemini_keys }
            });
        } else {
            campaign = await prisma.crm_campaigns.create({
                data: { batch_id: BigInt(batch_id), phase, meta_number, meta_phone_id, meta_wa_id, meta_access_token, gemini_keys }
            });
        }

        return res.status(200).json({ message: "Campaign Settings Saved!", data: safeJson(campaign) });
    } catch (error) {
        return res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// 2. Bot Toggles (දෙකම එකවර ON වෙන්න බැරි Logic එක)
const toggleBots = async (req, res) => {
    try {
        const { campaign_id, active_bot } = req.body; 
        // active_bot = "GEMINI", "AUTO_REPLY", or "NONE"

        let isGemini = false;
        let isAuto = false;

        if (active_bot === "GEMINI") {
            isGemini = true;
            isAuto = false;
        } else if (active_bot === "AUTO_REPLY") {
            isGemini = false;
            isAuto = true;
        }

        const campaign = await prisma.crm_campaigns.update({
            where: { id: parseInt(campaign_id) },
            data: {
                is_gemini_active: isGemini,
                is_auto_reply_active: isAuto
            }
        });

        return res.status(200).json({ message: `Bot updated to ${active_bot}`, data: safeJson(campaign) });
    } catch (error) {
        return res.status(500).json({ message: "Server Error" });
    }
};

// 3. Auto Replies Save කිරීම
const saveAutoReplies = async (req, res) => {
    try {
        const { campaign_id, replies } = req.body; 
        // replies = [{ sequence_order: 1, text: "Hi", media_url: "...", media_type: "image" }, ...]

        // පරණ ඒවා මකලා අලුත් ඒවා දානවා
        await prisma.auto_replies.deleteMany({ where: { campaign_id: parseInt(campaign_id) } });

        const newReplies = replies.map(r => ({
            ...r,
            campaign_id: parseInt(campaign_id)
        }));

        await prisma.auto_replies.createMany({ data: newReplies });

        return res.status(200).json({ message: "Auto Replies Saved!" });
    } catch (error) {
        return res.status(500).json({ message: "Server Error" });
    }
};

module.exports = { saveCampaignConfig, toggleBots, saveAutoReplies };