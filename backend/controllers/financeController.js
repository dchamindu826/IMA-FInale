const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const safeJson = (data) => JSON.parse(JSON.stringify(data, (key, value) => typeof value === 'bigint' ? value.toString() : value));

// 1. Finance Overview Stats
const getFinanceOverview = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const autoApproved = await prisma.payments.count({
            where: { status: 1, approver_id: 9999, updated_at: { gte: today } } // 9999 = AI Bot
        });

        const manualPending = await prisma.payments.count({
            where: { status: -1, pType: 'slip' }
        });

        const todayPayments = await prisma.payments.findMany({
            where: { status: 1, updated_at: { gte: today } }
        });
        const todayRevenue = todayPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

        return res.status(200).json({ autoApproved, manualPending, todayRevenue });
    } catch (error) {
        console.error("Finance Overview Error:", error);
        return res.status(500).json({ message: "Server Error: " + error.message });
    }
};

// 2. Get Pending Slips For Manual Review (Error Fixed)
const getPendingReviews = async (req, res) => {
    try {
        // Relation names අවුල් යන්න පුළුවන් නිසා Include නැතුව Payments ටික ගන්නවා
        const pendingSlips = await prisma.payments.findMany({
            where: { status: -1, pType: 'slip' },
            orderBy: { created_at: 'asc' }
        });

        if (pendingSlips.length === 0) {
            return res.status(200).json([]);
        }

        // Students ලාවයි Courses ටිකයි වෙනම ගන්නවා
        const studentIds = [...new Set(pendingSlips.map(p => p.student_id))].filter(Boolean);
        const courseIds = [...new Set(pendingSlips.map(p => p.course_id))].filter(Boolean);

        const usersList = await prisma.users.findMany({ where: { id: { in: studentIds } } });
        const coursesList = await prisma.courses.findMany({ where: { id: { in: courseIds } } });

        const paymentIds = pendingSlips.map(p => p.id);
        
        let aiVerifications = [];
        try {
            // slip_verifications table එක හැදිලා තියෙනවද බලනවා
            aiVerifications = await prisma.slip_verifications.findMany({
                where: { payment_id: { in: paymentIds } }
            });
        } catch (tableError) {
            console.log("⚠️ WARNING: slip_verifications table not found. Please run 'npx prisma db push'.");
        }

        // ඔක්කොම එකතු කරලා Frontend එකට යවනවා
        const formatted = pendingSlips.map(p => {
            const aiData = aiVerifications.find(v => v.payment_id === p.id);
            const studentData = usersList.find(u => u.id === p.student_id);
            const courseData = coursesList.find(c => c.id === p.course_id);

            return {
                ...p,
                user: studentData || null,
                course: courseData || null,
                ai_analysis: aiData || null 
            };
        });

        return res.status(200).json(safeJson(formatted));
    } catch (error) {
        console.error("Pending Reviews Error:", error);
        return res.status(500).json({ message: "Server Error: " + error.message });
    }
};

// 3. Verification Logs
const getVerificationLogs = async (req, res) => {
    try {
        let logs = [];
        try {
            logs = await prisma.slip_verifications.findMany({
                orderBy: { created_at: 'desc' },
                take: 50
            });
        } catch (e) {
            console.log("⚠️ WARNING: slip_verifications table not found.");
        }
        return res.status(200).json(safeJson(logs));
    } catch (error) {
        console.error("Verification Logs Error:", error);
        return res.status(500).json({ message: "Server Error: " + error.message });
    }
};

module.exports = { getFinanceOverview, getPendingReviews, getVerificationLogs };