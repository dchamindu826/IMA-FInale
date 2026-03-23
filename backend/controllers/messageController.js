const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const prisma = new PrismaClient();

const getMessages = async (req, res) => {
    try {
        const { leadId } = req.params;
        const messages = await prisma.lead_messages.findMany({
            where: { lead_id: parseInt(leadId) },
            orderBy: { created_at: 'asc' }
        });

        // මැසේජ් ටික ගත්තම Unread Count එක 0 කරනවා
        await prisma.whatsapp_leads.update({
            where: { id: parseInt(leadId) },
            data: { unread_count: 0 }
        });

        return res.status(200).json(messages);
    } catch (error) {
        return res.status(500).json({ message: "Server Error" });
    }
};

const sendManualMessage = async (req, res) => {
    try {
        const { lead_id, content, agent_id } = req.body;
        
        const lead = await prisma.whatsapp_leads.findUnique({ where: { id: parseInt(lead_id) } });
        if (!lead) return res.status(404).json({ message: "Lead not found" });

        // Meta Access Token එක Campaign එකෙන් ගන්නවා
        const campaign = await prisma.crm_campaigns.findFirst({ where: { phase: lead.phase } });
        if (!campaign) return res.status(400).json({ message: "Campaign not configured" });

        // Meta API Request
        await axios.post(`https://graph.facebook.com/v18.0/${campaign.meta_phone_id}/messages`, {
            messaging_product: "whatsapp", to: lead.phone_number, type: "text", text: { body: content }
        }, { headers: { 'Authorization': `Bearer ${campaign.meta_access_token}` } });

        // Save to DB
        const newMessage = await prisma.lead_messages.create({
            data: { lead_id: parseInt(lead_id), sender_type: "Agent", agent_id: BigInt(agent_id), content: content }
        });

        return res.status(200).json(newMessage);
    } catch (error) {
        return res.status(500).json({ message: "Server Error" });
    }
};

module.exports = { getMessages, sendManualMessage };