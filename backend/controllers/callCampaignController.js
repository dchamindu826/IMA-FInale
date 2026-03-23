const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const safeJson = (data) => JSON.parse(JSON.stringify(data, (key, value) => typeof value === 'bigint' ? value.toString() : value));

// Staff ta assign karapu leads ganna
const getAssignedCalls = async (req, res) => {
    try {
        const staffId = req.user.id;
        const { phase } = req.query; // FREE_SEMINAR or AFTER_SEMINAR

        const leads = await prisma.whatsapp_leads.findMany({
            where: { assigned_to: BigInt(staffId), phase: phase },
            orderBy: { created_at: 'desc' }
        });

        // Samanyayen call_phase kiyala column ekak nethi nisa, api default 1 gannawa.
        const mappedLeads = leads.map(l => ({ ...l, current_call_phase: 1 }));
        
        res.status(200).json(safeJson(mappedLeads));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Call eka log karanna
const saveCallLog = async (req, res) => {
    try {
        const staffId = req.user.id;
        const { lead_id, method, attempts, remark, note, current_phase } = req.body;

        // Call Log eka Database ekata save karanawa
        await prisma.call_logs.create({
            data: {
                lead_id: BigInt(lead_id),
                staff_id: parseInt(staffId),
                phase: parseInt(current_phase),
                attempts: parseInt(attempts),
                remark: remark,
                method: method,
                note: note || ""
            }
        });

        let nextPhase = parseInt(current_phase);
        let isCompleted = false;

        // "No Answer" nam Phase eka wadi karanawa (Max 3)
        if (remark === 'No Answer') {
            if (nextPhase < 3) {
                nextPhase += 1;
            } else {
                isCompleted = true; // Phase 3 ත් No Answer nam iwarai
            }
        } else if (remark === 'Answer' || remark === 'Reject') {
            isCompleted = true; // Answer/Reject nam e number eka iwarai
        }

        res.status(200).json({ message: "Call Logged Successfully", nextPhase, isCompleted });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { getAssignedCalls, saveCallLog };