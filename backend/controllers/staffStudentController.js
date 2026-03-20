const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const safeJson = (data) => JSON.parse(JSON.stringify(data, (key, value) => typeof value === 'bigint' ? value.toString() : value));

// --- 1. Get Staff List (Search & Filter) ---
const getStaff = async (req, res) => {
    try {
        const { userType, staff } = req.query; // GET request වලින් එන parameters

        const staffMembers = await prisma.users.findMany({
            where: {
                role: { not: 'user' },
                status: { not: -1 },
                ...(userType && { role: userType }), // userType එකක් ආවොත් විතරක් filter කරන්න
                ...(staff && {
                    OR: [
                        { fName: { contains: staff } },
                        { lName: { contains: staff } }
                    ]
                })
            },
            orderBy: { id: 'asc' }
        });

        return res.status(200).json({ staff: safeJson(staffMembers), count: staffMembers.length });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// --- 2. Add New Staff Member ---
const addStaff = async (req, res) => {
    try {
        const { fName, lName, phone, nic, password, userTypeAdd, description } = req.body;
        const userId = req.user.id;

        // Check if phone or NIC already exists
        const existingUser = await prisma.users.findFirst({
            where: { OR: [{ phone: phone }, { nic: nic }] }
        });

        if (existingUser) {
            return res.status(400).json({ message: "Phone number or NIC already exists!" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        let imageName = null;

        if (req.file) {
            imageName = req.file.filename;
        }

        const newUser = await prisma.users.create({
  data: {
    fName: req.body.fName,
    lName: req.body.lName,
    phone: req.body.phone,
    nic: req.body.nic || "",
    password: hashedPassword,
    role: req.body.role || "Staff", // 🔥 මේ පේළිය අනිවාර්යයෙන්ම තියෙන්න ඕනේ!
    description: req.body.description || null,
    image: req.file ? req.file.filename : "default.png",
    status: 1,
    created_at: new Date(),
    updated_at: new Date()
  }
});

        await prisma.audit_trails.create({
            data: {
                user_id: BigInt(userId),
                action: 'Add Staff',
                description: `New Staff Member Added ${newUser.fName} ${newUser.lName}`,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        return res.status(200).json({ message: 'Staff User Added Successfully!' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// --- 3. View Specific Staff & Teacher Payments ---
const viewStaff = async (req, res) => {
    try {
        const staffId = req.params.id;
        const userId = req.user.id;

        const staff = await prisma.users.findUnique({ where: { id: BigInt(staffId) } });
        if (!staff) return res.status(404).json({ message: "Staff not found" });

        let teacherPayments = [];
        if (staff.role === "teacher") {
            teacherPayments = await prisma.teacher_payments.findMany({
                where: { teacher_id: BigInt(staffId) },
                orderBy: { payment_month: 'desc' }
            });
        }

        await prisma.audit_trails.create({
            data: {
                user_id: BigInt(userId),
                action: 'View Staff',
                description: `Staff Member Viewed ${staff.fName} ${staff.lName}`,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        return res.status(200).json({ staff: safeJson(staff), teacherPayments: safeJson(teacherPayments) });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// --- 4. Add Teacher Payment Info ---
const addTeacherPaymentInfo = async (req, res) => {
    try {
        const { mCount, fCount, tAmount, month, teacher_id } = req.body;
        const userId = req.user.id;

        const paymentMonth = month ? new Date(new Date(month).getFullYear(), new Date(month).getMonth(), 1) : null;

        await prisma.teacher_payments.create({
            data: {
                monthlyCount: parseInt(mCount),
                fullCount: parseInt(fCount),
                totalAmount: parseFloat(tAmount),
                payment_month: paymentMonth,
                teacher_id: BigInt(teacher_id),
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        const teacher = await prisma.users.findUnique({ where: { id: BigInt(teacher_id) } });

        await prisma.audit_trails.create({
            data: {
                user_id: BigInt(userId),
                action: 'Add Teacher Payment Info',
                description: `Teacher Payment Info Added for ${teacher.fName} ${teacher.lName} for month ${month}`,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        return res.status(200).json({ message: 'Teacher Payment Info Added Successfully!' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// --- 5. View Specific Student ---
const viewStudent = async (req, res) => {
    try {
        const studentId = req.params.id;
        const userId = req.user.id;

        const student = await prisma.users.findUnique({ where: { id: BigInt(studentId) } });
        if (!student) return res.status(404).json({ message: "Student not found" });

        await prisma.audit_trails.create({
            data: {
                user_id: BigInt(userId),
                action: 'View Student',
                description: `Student Viewed ${student.fName} ${student.lName}`,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        return res.status(200).json({ student: safeJson(student) });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// --- 6. Delete Staff Member ---
const deleteStaff = async (req, res) => {
    try {
        const staffId = req.params.id;
        const userId = req.user.id;

        const staff = await prisma.users.findUnique({ where: { id: BigInt(staffId) } });
        if (!staff) return res.status(404).json({ message: "Staff not found" });

        await prisma.users.delete({ where: { id: BigInt(staffId) } });

        await prisma.audit_trails.create({
            data: {
                user_id: BigInt(userId),
                action: 'Delete Staff',
                description: `Staff Member Deleted ${staff.fName} ${staff.lName}`,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        return res.status(200).json({ message: 'Staff Member Deleted Successfully!' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// --- 7. Assign Business Manager ---
const assignBusinessManager = async (req, res) => {
    try {
        const businessId = req.params.id;
        const { type, staff_id } = req.body;
        const userId = req.user.id;

        console.log("Assigning Manager:", { businessId, type, staff_id }); // Debugging වලට ලේසියි

        // payload type එක 'head' ද 'assistant' ද කියලා බලනවා
        // මෙතන staff_id එක අනිවාර්යයෙන්ම Number එකක් කරනවා.
        const updateData = type === 'head' 
            ? { head_manager_id: staff_id ? parseInt(staff_id) : null }
            : { ass_manager_id: staff_id ? parseInt(staff_id) : null };

        await prisma.businesses.update({
            where: { id: BigInt(businessId) },
            data: updateData
        });

        await prisma.audit_trails.create({
            data: {
                user_id: BigInt(userId),
                action: 'Assign Manager',
                description: `Assigned ${type} manager for Business ID: ${businessId}`,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        return res.status(200).json({ message: 'Manager Assigned Successfully!' });
    } catch (error) {
        console.error("Error Assigning Manager:", error); // 500 error ආවොත් Terminal එකේ වැටෙයි හේතුව
        return res.status(500).json({ message: error.message });
    }
};

// --- Edit Staff Member ---
const updateStaff = async (req, res) => {
    try {
        const staffId = req.params.id;
        const { fName, lName, phone, nic, role, password } = req.body;
        
        let updateData = { fName, lName, phone, nic, role };
        
        // Password එකක් අලුතෙන් ගහලා නම් ඒකත් Hash කරලා Update කරනවා
        if (password && password.trim() !== '') {
            const bcrypt = require('bcrypt');
            updateData.password = await bcrypt.hash(password, 10);
        }

        await prisma.users.update({
            where: { id: BigInt(staffId) },
            data: updateData
        });

        return res.status(200).json({ message: 'Staff Updated Successfully!' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// අන්තිමට Exports ටික මේ විදිහට Update කරන්න:
module.exports = {
    getStaff,
    addStaff,
    viewStaff,
    addTeacherPaymentInfo,
    viewStudent,
    deleteStaff,
    assignBusinessManager,
    updateStaff // 🔥 මේක අලුතෙන් Export කරන්න
};

