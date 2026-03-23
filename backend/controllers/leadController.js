const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getLeads = async (req, res) => {
    try {
        const { user_id, role } = req.query;
        let whereClause = {};

        // Staff නම් එයාලට Assign වෙච්ච ඒවා විතරයි පේන්නේ
        if (role === 'Staff' || role === 'Coordinator') {
            whereClause = { assigned_to: BigInt(user_id) };
        }

        const leads = await prisma.whatsapp_leads.findMany({
            where: whereClause,
            orderBy: { last_message_time: 'desc' }
        });

        return res.status(200).json(leads);
    } catch (error) {
        return res.status(500).json({ message: "Server Error" });
    }
};

const bulkAssignLeads = async (req, res) => {
    try {
        const { assignType, count, agentId } = req.body;

        const unassignedLeads = await prisma.whatsapp_leads.findMany({
            where: { status: "New", assigned_to: null },
            orderBy: { created_at: assignType === 'first' ? 'asc' : 'desc' },
            take: parseInt(count)
        });

        if (unassignedLeads.length === 0) {
            return res.status(400).json({ message: "No unassigned leads found." });
        }

        const leadIds = unassignedLeads.map(l => l.id);

        await prisma.whatsapp_leads.updateMany({
            where: { id: { in: leadIds } },
            data: { assigned_to: BigInt(agentId), status: "Assigned" }
        });

        return res.status(200).json({ message: "Assigned Successfully" });
    } catch (error) {
        return res.status(500).json({ message: "Server Error" });
    }
};

module.exports = { getLeads, bulkAssignLeads };