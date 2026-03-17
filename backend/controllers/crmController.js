const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// BigInt සපෝට් කරන්න JSON parser එක හදාගන්නවා
const safeJson = (data) => JSON.parse(JSON.stringify(data, (key, value) => typeof value === 'bigint' ? value.toString() : value));

// ==========================================
// 1. MANUAL BULK ASSIGNMENT (Manager Action)
// ==========================================
const assignLeadsManual = async (req, res) => {
    try {
        const { batch_id, staff_id, qty, order } = req.body; // order = 'asc' (Oldest) or 'desc' (Newest)

        // Assign නොකරපු (NEW) Leads ටික ගන්නවා
        const unassignedLeads = await prisma.leads.findMany({
            where: {
                batch_id: BigInt(batch_id),
                assigned_to: null,
                status: 'NEW'
            },
            orderBy: { created_at: order || 'asc' },
            take: parseInt(qty)
        });

        if (unassignedLeads.length === 0) {
            return res.status(404).json({ message: "No unassigned leads found for this batch." });
        }

        const leadIds = unassignedLeads.map(lead => lead.id);

        // ඒ Leads ටික අදාල Staff Member ට Assign කරනවා
        await prisma.leads.updateMany({
            where: { id: { in: leadIds } },
            data: { 
                assigned_to: parseInt(staff_id),
                status: 'PHASE_1' // Assign කරපු ගමන් Phase 1 එකට වැටෙනවා
            }
        });

        return res.status(200).json({ 
            message: `Successfully assigned ${leadIds.length} leads to staff.`,
            assigned_count: leadIds.length 
        });

    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// ==========================================
// 2. AUTO ASSIGNMENT LOGIC (Webhook එකෙන් එද්දි වැඩ කරන්නේ)
// ==========================================
const processAutoAssignment = async (batch_id, lead_id) => {
    try {
        // මේ Batch එකට Assign කරලා ඉන්න Staff Set එක ගන්නවා (Quota පිරුණේ නැති අය)
        const assignments = await prisma.batch_staff_assignments.findMany({
            where: { batch_id: BigInt(batch_id) },
            orderBy: { id: 'asc' } // පිළිවෙලට බෙදන්න
        });

        for (let assign of assignments) {
            if (assign.assigned_count < assign.quota) {
                // Quota එක ඉතුරු කෙනෙක් හම්බවුණා! Lead එක එයාට දෙනවා
                await prisma.leads.update({
                    where: { id: BigInt(lead_id) },
                    data: { 
                        assigned_to: assign.staff_id,
                        status: 'PHASE_1'
                    }
                });

                // Assigned Count එක +1 කරනවා
                await prisma.batch_staff_assignments.update({
                    where: { id: assign.id },
                    data: { assigned_count: assign.assigned_count + 1 }
                });
                break; // කෙනෙක්ට දුන්නට පස්සේ ලූප් එක නවත්තනවා
            }
        }
    } catch (error) {
        console.error("Auto Assign Error:", error);
    }
};

// ==========================================
// 3. UPDATE CALL CAMPAIGN STATUS (Staff Action)
// ==========================================
const updateCallLog = async (req, res) => {
    try {
        const { lead_id, phase, remark, method, note } = req.body;
        const staff_id = req.user.id; // Log වෙලා ඉන්න කෙනා

        // මේ Phase එකේ කලින් ගත්තු Calls (Attempts) ගාණ බලනවා
        const previousLogs = await prisma.call_logs.count({
            where: { 
                lead_id: BigInt(lead_id), 
                phase: parseInt(phase) 
            }
        });

        const currentAttempt = previousLogs + 1;

        // Call Log එක Save කරනවා
        await prisma.call_logs.create({
            data: {
                lead_id: BigInt(lead_id),
                staff_id: parseInt(staff_id),
                phase: parseInt(phase),
                attempts: currentAttempt,
                remark,
                method,
                note,
                created_at: new Date()
            }
        });

        // ඊළඟට Lead එකේ Status එක Update කරනවා (ඔයාගේ Rules වලට අනුව)
        let nextStatus = `PHASE_${phase}`;
        
        if (remark === 'Reject') {
            nextStatus = 'CLOSED'; // රිජෙක්ට් කරොත් ඉවරයි
        } 
        else if (remark === 'No Answer' && currentAttempt >= 3) {
            // 3 පාරක් No Answer නම් ඊළඟ Phase එකට දානවා
            if (phase < 3) {
                nextStatus = `PHASE_${parseInt(phase) + 1}`;
            } else {
                nextStatus = 'CLOSED'; // 3 වෙනි Phase එකෙත් No answer නම් ඉවරයි
            }
        }

        await prisma.leads.update({
            where: { id: BigInt(lead_id) },
            data: { status: nextStatus, updated_at: new Date() }
        });

        return res.status(200).json({ message: 'Call log updated and lead moved to ' + nextStatus });

    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// ==========================================
// 4. GET STAFF DASHBOARD LEADS (Staff Action)
// ==========================================
const getStaffLeads = async (req, res) => {
    try {
        const staff_id = req.user.id; // Log වෙලා ඉන්න Staff කෙනා

        // තමන්ට Assign වෙලා තියෙන, තාම Close වෙලා නැති Leads ගන්නවා
        const myLeads = await prisma.leads.findMany({
            where: {
                assigned_to: parseInt(staff_id),
                status: { not: 'CLOSED' }
            },
            orderBy: { updated_at: 'desc' }
        });

        // ඒ Leads වල අන්තිම Call Logs ටිකත් අරන් එනවා
        const leadsWithLogs = await Promise.all(myLeads.map(async (lead) => {
            const logs = await prisma.call_logs.findMany({
                where: { lead_id: lead.id },
                orderBy: { created_at: 'desc' },
                take: 1 // අන්තිම update එක විතරක් බලන්න
            });
            return { ...lead, last_log: logs[0] || null };
        }));

        return res.status(200).json(safeJson({ leads: leadsWithLogs }));

    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

module.exports = {
    assignLeadsManual,
    processAutoAssignment,
    updateCallLog,
    getStaffLeads
};