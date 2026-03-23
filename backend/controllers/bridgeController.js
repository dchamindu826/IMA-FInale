const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

const safeJson = (data) => JSON.parse(JSON.stringify(data, (key, value) => typeof value === 'bigint' ? value.toString() : value));

const checkStudentLms = async (req, res) => {
    try {
        const phone = req.params.phone;
        // නම්බර් එකෙන් ළමයව හොයනවා
        const student = await prisma.users.findFirst({
            where: { 
                OR: [{ phone: phone }, { phone: '0' + phone.substring(2) }], 
                role: 'user' 
            }
        });

        if (!student) return res.status(200).json({ found: false });

        // ළමයාගේ Courses සහ Payments ගන්නවා
        const courseUsers = await prisma.course_user.findMany({ where: { user_id: student.id } });
        const courseIds = courseUsers.map(c => c.course_id);
        
        const courses = await prisma.courses.findMany({
            where: { id: { in: courseIds } },
            include: { group: { include: { batch: { include: { business: true } } } } }
        });

        const payments = await prisma.payments.findMany({
            where: { student_id: student.id, course_id: { in: courseIds } }
        });

        const activeCourses = courses.map(c => {
            const payment = payments.find(p => p.course_id.toString() === c.id.toString());
            return {
                enrollment_id: c.id.toString(),
                course_name: c.name,
                batch_name: c.group?.batch?.name,
                business_name: c.group?.batch?.business?.name,
                course_price: c.price,
                plan_type: payment && payment.isInstallment ? 2 : 1, // 1=Full, 2=Monthly
                current_discount: payment ? payment.free_amount : 0
            };
        });

        res.status(200).json(safeJson({ 
            found: true, 
            student: { id: student.id, name: `${student.fName} ${student.lName}`, nic: student.nic, courses: activeCourses } 
        }));
    } catch (error) { 
        res.status(500).json({ error: error.message }); 
    }
};

const updatePassword = async (req, res) => {
    try {
        const { user_id, new_password } = req.body;
        const hashed = await bcrypt.hash(new_password, 10);
        await prisma.users.update({ where: { id: BigInt(user_id) }, data: { password: hashed } });
        res.status(200).json({ success: true });
    } catch (error) { 
        res.status(500).json({ error: error.message }); 
    }
};

const updateEnrollmentPlan = async (req, res) => {
    try {
        // මෙතනට ඔයාගේ Payment Plan මාරු කරන ලොජික් එක එනවා
        res.status(200).json({ success: true, message: "Plan updated successfully!" });
    } catch (error) { 
        res.status(500).json({ error: error.message }); 
    }
};

module.exports = { checkStudentLms, updatePassword, updateEnrollmentPlan };