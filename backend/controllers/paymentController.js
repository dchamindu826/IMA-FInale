const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const safeJson = (data) => JSON.parse(JSON.stringify(data, (key, value) => typeof value === 'bigint' ? value.toString() : value));
const generateMD5 = (str) => crypto.createHash('md5').update(str).digest('hex').toUpperCase();
const { verifySlipImage } = require('../services/geminiService');

// --- 1. PayHere Online Payment Success Notify ---
const onlinePaymentSuccessNotify = async (req, res) => {
    try {
        const { merchant_id, order_id, payhere_amount, payhere_currency, status_code, md5sig } = req.body;
        const merchant_secret = process.env.PAY_HERE_MERCHANT_SECRET;

        const local_md5sig = generateMD5(merchant_id + order_id + payhere_amount + payhere_currency + status_code + generateMD5(merchant_secret));

        if (local_md5sig === md5sig && parseInt(status_code) === 2) {
            const payment = await prisma.payments.findUnique({ where: { id: BigInt(order_id) }, include: { course: { include: { group: true } } } });
            const userId = payment.student_id;

            // Handle Course Access
            const isExists = await prisma.course_user.findFirst({ where: { user_id: userId, course_id: payment.course_id } });
            if (!isExists) await prisma.course_user.create({ data: { user_id: userId, course_id: payment.course_id, pType: payment.course.group.type } });

            if (payment.isLinked) {
                const linkedPayments = await prisma.payments.findMany({ where: { isLinked: true, linked: payment.id }, include: { course: { include: { group: true } } } });
                for (const linkedPayment of linkedPayments) {
                    const linkedExists = await prisma.course_user.findFirst({ where: { user_id: userId, course_id: linkedPayment.course_id } });
                    if (!linkedExists) await prisma.course_user.create({ data: { user_id: userId, course_id: linkedPayment.course_id, pType: linkedPayment.course.group.type } });
                }
            }

            if (payment.isInstallment) {
                const installments = await prisma.installments.findMany({ where: { payment_id: payment.id }, orderBy: { id: 'asc' } });
                const activeCount = installments.filter(i => i.status === 1).length;
                const status = (installments.length === activeCount + 1) ? 1 : -1;

                const nextInstallment = installments.find(i => i.status === 0);
                if (nextInstallment) await prisma.installments.update({ where: { id: nextInstallment.id }, data: { pType: 'online', status: status } });

                const postPayDate = new Date();
                postPayDate.setDate(postPayDate.getDate() + 4);

                await prisma.payments.update({ where: { id: payment.id }, data: { pType: 'online', status: status, post_pay_date: postPayDate } });
                await prisma.payments.updateMany({ where: { isLinked: true, linked: payment.id }, data: { status: status, pType: 'online', post_pay_date: postPayDate, updated_at: new Date() } });
            } else {
                await prisma.payments.update({ where: { id: payment.id }, data: { pType: 'online', status: 1 } });
                await prisma.payments.updateMany({ where: { isLinked: true, linked: payment.id }, data: { pType: 'online', status: 1, updated_at: new Date() } });
            }
            return res.status(200).send("OK");
        } else {
            let sCode = parseInt(status_code) === 0 ? -1 : -3;
            const payment = await prisma.payments.findUnique({ where: { id: BigInt(order_id) } });

            if (payment.isInstallment) {
                const installment = await prisma.installments.findFirst({ where: { payment_id: payment.id, status: 0 }, orderBy: { id: 'asc' } });
                if (installment) await prisma.installments.update({ where: { id: installment.id }, data: { pType: 'online', status: sCode } });
            }

            await prisma.payments.update({ where: { id: payment.id }, data: { pType: 'online', status: sCode } });
            await prisma.payments.updateMany({ where: { isLinked: true, linked: payment.id }, data: { status: sCode, pType: 'online' } });
            return res.status(400).send("Failed");
        }
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// --- 2. Course Confirm (Cart to Payment Logic) ---
const courseConfirm = async (req, res) => {
    try {
        const user = req.user;
        const { discountEnabled, businessID, courses, classMonth } = req.body;
        
        let total = 0, insTotal = 0, round = 0;
        let mainPayment = null;
        const business = businessID ? await prisma.businesses.findUnique({ where: { id: BigInt(businessID) } }) : null;

        if (courses && Array.isArray(courses)) {
            if (business && business.category === "OL" && parseInt(discountEnabled) === 1 && business.minCourseCount && courses.length >= business.minCourseCount) {
                total -= parseFloat(business.discountAmount);
            }

            for (let courseItem of courses) {
                const [courseIdStr, payType] = courseItem.split("-");
                const course = await prisma.courses.findUnique({ where: { id: BigInt(courseIdStr) }, include: { group: { include: { batch: true } } } });

                let coursePrice = course.price;
                if (course.type === 2 && (course.group.batch.type === 3 || course.group.batch.type === 4)) {
                    const prevPayments = await prisma.payments.findFirst({ where: { student_id: BigInt(user.id), course_id: course.course_id, status: { in: [-1, 1] } } });
                    if (prevPayments) coursePrice = course.discountedPrice;
                }

                if (round === 0) {
                    mainPayment = await prisma.payments.create({ data: { payer_id: BigInt(user.id), student_id: BigInt(user.id), course_id: course.id, status: -2, created_at: new Date() } });
                }

                let singleSubjectPayment = 0, paymentMonth = null;

                if (courses.length > 1) {
                    if (payType === "full") {
                        if ((!business || business.category !== "OL") && parseInt(discountEnabled) === 1 && course.needForDiscount && course.discountedPrice > 0 && course.discountedPrice < course.price) {
                            total += parseFloat(course.discountedPrice);
                            singleSubjectPayment = course.discountedPrice;
                        } else {
                            total += parseFloat(coursePrice);
                            singleSubjectPayment = coursePrice;
                        }
                        insTotal += parseFloat(coursePrice);
                        paymentMonth = mainPayment.created_at;
                    } else if (payType === "monthly") {
                        total += parseFloat(coursePrice);
                        singleSubjectPayment = coursePrice;
                        paymentMonth = classMonth ? new Date(classMonth + '-01') : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
                    }

                    if (round === 0) {
                        mainPayment = await prisma.payments.update({ where: { id: mainPayment.id }, data: { isLinked: true, subjectAmount: singleSubjectPayment, payment_month: paymentMonth } });
                        round = 1;
                    } else {
                        await prisma.payments.create({ data: { payer_id: BigInt(user.id), student_id: BigInt(user.id), course_id: course.id, status: -2, isLinked: true, linked: mainPayment.id, subjectAmount: singleSubjectPayment, payment_month: paymentMonth } });
                    }
                    
                    mainPayment = await prisma.payments.update({ where: { id: mainPayment.id }, data: { is_discount_applied: parseInt(discountEnabled), amount: Math.ceil(total) } });
                } else {
                    if (payType === "full") {
                        if (parseInt(discountEnabled) === 1 && course.needForDiscount && course.discountedPrice > 0 && course.discountedPrice < course.price) {
                            mainPayment = await prisma.payments.update({ where: { id: mainPayment.id }, data: { amount: course.discountedPrice, subjectAmount: course.discountedPrice } });
                        } else {
                            mainPayment = await prisma.payments.update({ where: { id: mainPayment.id }, data: { amount: coursePrice, subjectAmount: coursePrice } });
                        }
                        insTotal = parseFloat(coursePrice);
                        mainPayment = await prisma.payments.update({ where: { id: mainPayment.id }, data: { payment_month: mainPayment.created_at } });
                    } else if (payType === "monthly") {
                        const monthDate = classMonth ? new Date(classMonth + '-01') : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
                        mainPayment = await prisma.payments.update({ where: { id: mainPayment.id }, data: { amount: coursePrice, subjectAmount: coursePrice, payment_month: monthDate } });
                    }
                }
            }
        }

        const groupData = await prisma.groups.findUnique({ where: { id: mainPayment.course.group_id } });
        let installmentOptionAvailable = null;
        
        if (business && business.isDiscountEnabledForInstallments === false) {
            installmentOptionAvailable = await prisma.installment_options.findFirst({ where: { group_id: groupData.id, full_amount: insTotal }, include: { installment_amounts: true } });
        } else {
            installmentOptionAvailable = await prisma.installment_options.findFirst({ where: { group_id: groupData.id, full_amount: mainPayment.amount }, include: { installment_amounts: true } });
        }

        return res.status(200).json(safeJson({
            mainPayment,
            isInstallmentAvailable: !!installmentOptionAvailable,
            installmentOptionAvailable,
            installmentAmounts: installmentOptionAvailable ? installmentOptionAvailable.installment_amounts : null
        }));
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// --- 3. Installment Plan Select ---
const paymentTypeSelect = async (req, res) => {
    try {
        const { mainPaymentId, paymentType, insFullAmount, insOption } = req.body;

        if (paymentType === "installment") {
            let mainPayment = await prisma.payments.findUnique({ where: { id: BigInt(mainPaymentId) }, include: { course: { include: { group: { include: { batch: { include: { business: true } } } } } } } });
            const business = mainPayment.course.group.batch.business;

            if (business && business.isDiscountEnabledForInstallments === false && parseFloat(mainPayment.amount) !== parseFloat(insFullAmount)) {
                const otherPayments = await prisma.payments.findMany({ where: { linked: mainPayment.id }, include: { course: true } });
                let totalVal = parseFloat(mainPayment.course.price);
                
                await prisma.payments.update({ where: { id: mainPayment.id }, data: { subjectAmount: mainPayment.course.price } });
                
                for (const op of otherPayments) {
                    await prisma.payments.update({ where: { id: op.id }, data: { subjectAmount: op.course.price } });
                    totalVal += parseFloat(op.course.price);
                }
                mainPayment = await prisma.payments.update({ where: { id: mainPayment.id }, data: { amount: totalVal } });
            }

            mainPayment = await prisma.payments.update({ where: { id: mainPayment.id }, data: { isInstallment: true } });
            const option = await prisma.installment_options.findUnique({ where: { id: BigInt(insOption) }, include: { installment_amounts: { orderBy: { id: 'asc' } } } });

            for (const amt of option.installment_amounts) {
                await prisma.installments.create({ data: { amount: amt.amount, payment_id: mainPayment.id, status: 0 } });
            }
        }
        return res.status(200).json({ mainPaymentId });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// --- 4. Upload Slips (Normal & Installments) ---
const uploadSlip = async (req, res) => {
    try {
        const { remark, mainPaymentId, installmentPaymentId } = req.body;
        const userId = req.user.id;
        if (!req.file) return res.status(400).json({ message: "Slip image is required" });
        const imageName = req.file.filename;

        const payment = await prisma.payments.update({ where: { id: BigInt(mainPaymentId) }, data: { pType: 'slip', status: -1, slipFileName: imageName, remark: remark } });
        await prisma.payments.updateMany({ where: { isLinked: true, linked: BigInt(mainPaymentId) }, data: { pType: 'slip', status: -1, slipFileName: imageName } });
        await prisma.payments.deleteMany({ where: { student_id: BigInt(userId), status: -2 } });

        if (installmentPaymentId) {
            await prisma.installments.update({ where: { id: BigInt(installmentPaymentId) }, data: { status: -1, pType: 'slip', slipFileName: imageName, remark: remark } });
        }

        const courseData = await prisma.courses.findUnique({ where: { id: payment.course_id }, include: { group: true }});
        const isExists = await prisma.course_user.findFirst({ where: { user_id: BigInt(userId), course_id: payment.course_id } });
        if (isExists) {
            await prisma.course_user.updateMany({ where: { user_id: BigInt(userId), course_id: payment.course_id }, data: { pType: courseData.group.type } });
        } else {
            await prisma.course_user.create({ data: { user_id: BigInt(userId), course_id: payment.course_id, pType: courseData.group.type } });
        }

        // 🔥 AI Verification Process (දැන් මේක තියෙන්නේ try block එක ඇතුලේ) 🔥
        setTimeout(async () => {
            try {
                const imagePath = path.join(__dirname, '../public/slipImages/', imageName);
                const aiResult = await verifySlipImage(imagePath);
                
                if (aiResult.status === 'SUCCESS') {
                    const extracted = aiResult.data;
                    const expectedAmount = parseFloat(payment.subjectAmount || payment.amount);
                    const extractedAmount = parseFloat(extracted.amount);
                    
                    let aiStatus = 'MISMATCHED';
                    let finalPaymentStatus = -1; // Keep Pending by default

                    // 💡 Decision Engine Logic
                    if (extracted.isClear && extractedAmount === expectedAmount) {
                        aiStatus = 'MATCHED';
                        finalPaymentStatus = 1; // Auto Approve!
                    } else if (!extracted.isClear) {
                        aiStatus = 'UNREADABLE';
                    }

                    // Database එකට AI Result එක සේව් කරනවා
                    await prisma.slip_verifications.create({
                        data: {
                            payment_id: payment.id,
                            ai_status: aiStatus,
                            ai_confidence: extracted.isClear ? 90.0 : 40.0,
                            extracted_amount: extractedAmount,
                            extracted_date: extracted.date,
                            extracted_ref: extracted.referenceNo,
                            raw_ai_response: aiResult.raw
                        }
                    });

                    // Auto Approve උනා නම් Payment එක Update කරනවා
                    if (finalPaymentStatus === 1) {
                        await prisma.payments.update({
                            where: { id: payment.id },
                            data: { status: 1, approver_id: 9999 } // 9999 = AI System ID
                        });
                        await prisma.payments.updateMany({ 
                            where: { isLinked: true, linked: payment.id }, 
                            data: { status: 1, approver_id: 9999 } 
                        });
                    }
                }
            } catch (e) {
                console.error("AI Slip Verification Failed for Payment ID:", payment.id, e);
            }
        }, 0);

        // Client ට ඉක්මනින් response එක යවනවා (AI එක background එකේ දුවනවා)
        return res.status(200).json({ message: 'Payment Slip Uploaded Successfully! Your payment will be verified soon.' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
const updateSlip = async (req, res) => {
    try {
        const { mainPaymentId } = req.body;
        if (!req.file) return res.status(400).json({ message: "Slip image is required" });
        
        const payment = await prisma.payments.findUnique({ where: { id: BigInt(mainPaymentId) } });
        if (payment.slipFileName) {
            const oldPath = path.join(__dirname, '../public/slipImages/', payment.slipFileName);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }

        await prisma.payments.update({ where: { id: BigInt(mainPaymentId) }, data: { pType: 'slip', status: -1, slipFileName: req.file.filename } });
        return res.status(200).json({ message: 'Payment Slip Updated Successfully!' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// --- 5. Hash & General Fetch ---
const getPaymentHash = async (req, res) => {
    try {
        const { mainPaymentId } = req.body;
        const user = req.user;
        const payment = await prisma.payments.findUnique({ where: { id: BigInt(mainPaymentId) }, include: { installments: { where: { status: 0 }, orderBy: { id: 'asc' }, take: 1 } } });

        const order_id = payment.id.toString();
        const merchant_id = process.env.PAY_HERE_MERCHANT_ID;
        let price = payment.isInstallment && payment.installments.length > 0 ? payment.installments[0].amount : payment.amount;
        const hash = generateMD5(merchant_id + order_id + parseFloat(price).toFixed(2) + "LKR" + generateMD5(process.env.PAY_HERE_MERCHANT_SECRET));

        return res.status(200).json({ paymentHash: hash, order_id, merchant_id, name: `Online Class Payment - ${user.fName} ${user.lName}`, price, currency: "LKR" });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const getPaymentsApi = async (req, res) => {
    try {
        const payments = await prisma.payments.findMany({ where: { slipFileName: { not: null } }, include: { user: true, course: true }, orderBy: { id: 'desc' }, take: 50 });
        const formattedPayments = payments.map(p => ({ paymentId: p.id, studentName: `${p.user.fName} ${p.user.lName}`, courseName: p.course.name, amount: p.amount, pType: p.pType, status: p.status, date: p.created_at.toISOString().split('T')[0], slipImage: p.slipFileName ? `/storage/slipImages/${p.slipFileName}` : null }));
        return res.status(200).json({ success: true, payments: safeJson(formattedPayments) });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// --- 6. My Payments (Raw Query logic converted for Student App) ---
const myPayments = async (req, res) => {
    try {
        const user = req.user;

        // Old/Completed Normal Payments
        const oldPayments = await prisma.$queryRawUnsafe(`
            SELECT p.id as paymentId, p.created_at as createdDate, b.logo as batchLogo, p.payment_month, p.pType, p.amount, p.subjectAmount, p.isInstallment, bs.name as businessName, b.name as batchName, c.name as courseName, u.fName, u.lName, p.isLinked, p.linked, p.slipFileName, p.status, p.isFree, p.free_amount, g.name as groupName 
            FROM payments p
            JOIN courses c ON p.course_id = c.id JOIN groups g ON c.group_id = g.id JOIN batches b ON g.batch_id = b.id JOIN businesses bs ON b.business_id = bs.id JOIN users u ON p.student_id = u.id
            WHERE p.status != -2 AND p.isInstallment = 0 AND p.pType IS NOT NULL AND linked IS NULL AND p.student_id = ${user.id} ORDER BY p.id DESC
        `);

        for (let p of oldPayments) {
            p.amount = p.isFree === 2 ? p.free_amount : p.amount;
            p.linkedPayments = p.isLinked ? await prisma.$queryRawUnsafe(`SELECT p.id as paymentId, p.created_at as createdDate, p.pType, p.amount, bs.name as businessName, b.name as batchName, c.name as courseName, u.fName, u.lName, p.isLinked, p.linked, g.name as groupName FROM payments p JOIN courses c ON p.course_id = c.id JOIN groups g ON c.group_id = g.id JOIN batches b ON g.batch_id = b.id JOIN businesses bs ON b.business_id = bs.id JOIN users u ON p.student_id = u.id WHERE linked = ${p.paymentId} AND p.student_id = ${user.id}`) : [];
        }

        // Installment Active Payments
        const instPayments = await prisma.$queryRawUnsafe(`
            SELECT p.id as paymentId, p.created_at as createdDate, b.logo as batchLogo, p.payment_month, p.pType, p.amount, p.subjectAmount, p.isInstallment, p.is_discount_applied, bs.name as businessName, b.name as batchName, c.name as courseName, u.fName, u.lName, p.isLinked, p.linked, p.slipFileName, p.status, p.isFree, p.free_amount, g.name as groupName 
            FROM payments p
            JOIN courses c ON p.course_id = c.id JOIN groups g ON c.group_id = g.id JOIN batches b ON g.batch_id = b.id JOIN businesses bs ON b.business_id = bs.id JOIN users u ON p.student_id = u.id
            WHERE p.status != -2 AND p.isInstallment = 1 AND linked IS NULL AND p.student_id = ${user.id} ORDER BY p.id DESC
        `);

        for (let p of instPayments) {
            p.linkedPayments = p.isLinked ? await prisma.$queryRawUnsafe(`SELECT p.id as paymentId, c.name as courseName FROM payments p JOIN courses c ON p.course_id = c.id WHERE linked = ${p.paymentId} AND p.student_id = ${user.id}`) : [];
            p.installments = await prisma.installments.findMany({ where: { payment_id: BigInt(p.paymentId) }, orderBy: { id: 'asc' } });
        }

        return res.status(200).json(safeJson({ oldPayments, installmentPayments: instPayments, comingPayments: [] })); // API expects this structure
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// ========================================================================
// 🔥 PART 1: ADMIN DASHBOARD DATA FETCHING (DATATABLES LOGIC) 🔥
// ========================================================================

// 1. Get Normal Payments (Pending, Confirmed, Free, Post Pay)
const getPaymentsAdmin = async (req, res) => {
    try {
        const { business, batch, group, course, pType, pPlan, student, studentPhone, fromDate, toDate, pStatus, selectBank, stream, classType } = req.body;

        let query = `
            SELECT p.id as paymentId, p.payment_month, p.created_at as createdDate, p.updated_at as updatedDate, p.pType, p.amount, p.subjectAmount, p.course_id, p.student_id, p.teacher_status, p.is_discount_applied, p.post_pay_date, p.isInstallment, p.remark, c.name as courseName, u.stream, u.fName, u.lName, u.phone, u.houseNo, u.streetName, u.village, u.town, u.district, p.isLinked, p.linked, p.slipFileName, p.isFree, p.free_amount, c.price as price, c.discountedPrice as discountedPrice, b.name as batchName, g.name as groupName, g.type as groupPType, s.name as businessName 
            FROM payments p
            JOIN courses c ON p.course_id = c.id
            JOIN users u ON p.student_id = u.id
            JOIN groups g ON c.group_id = g.id
            JOIN batches b ON g.batch_id = b.id
            JOIN businesses s ON b.business_id = s.id
            WHERE p.course_id IS NOT NULL
        `;

        // --- Status Logic ---
        if (pStatus === "pending") {
            if (pType && pType !== "all") query += ` AND p.pType = '${pType}'`;
            query += ` AND p.status = -1 AND p.isFree = 0 AND p.isInstallment = 0 AND p.post_pay_date IS NULL`;
        } else if (pStatus === "postPay") {
            if (pType && pType !== "all") query += ` AND p.pType = '${pType}'`;
            query += ` AND p.status = -1 AND p.isFree = 0 AND p.isInstallment = 0 AND p.post_pay_date IS NOT NULL`;
        } else if (pStatus === "free") {
            if (pType && pType !== "all") query += ` AND p.pType = '${pType}'`;
            query += ` AND p.status = 1 AND p.isFree = 1 AND p.isInstallment = 0`;
        } else { // confirmed
            if (pType && pType !== "all") query += ` AND p.pType = '${pType}'`;
            query += ` AND p.status = 1 AND (p.isFree = 0 OR p.isFree = 2) AND p.isInstallment = 0`;
        }

        // --- Filters ---
        if (!course || course === "") query += ` AND p.linked IS NULL`;
        if (student) query += ` AND CONCAT(u.fName, ' ', u.lName) LIKE '%${student}%'`;
        if (studentPhone) query += ` AND u.phone LIKE '%${studentPhone}%'`;
        if (req.user.role !== 'superadmin') {
            const myBusiness = await prisma.businesses.findFirst({
                where: { OR: [{ head_manager_id: parseInt(req.user.id) }, { ass_manager_id: parseInt(req.user.id) }] }
            });
            if (myBusiness) {
                query += ` AND s.id = ${myBusiness.id}`;
            }
        } else if (business) {
            query += ` AND s.id = ${business}`;
        }
        if (batch) query += ` AND b.id = ${batch}`;
        if (group) query += ` AND g.id = ${group}`;
        if (course) query += ` AND c.id = ${course}`;
        if (fromDate) query += ` AND p.created_at >= '${fromDate}'`;
        if (toDate) query += ` AND p.created_at <= '${toDate} 23:59:59'`;
        if (selectBank) query += ` AND p.bank = '${selectBank}'`;
        if (stream) query += ` AND c.stream = '${stream}'`;
        if (classType) query += ` AND c.type = '${classType}'`;

        // --- Ordering ---
        if (pStatus === "pending") query += ` ORDER BY p.created_at ASC`;
        else query += ` ORDER BY p.updated_at DESC, p.id DESC`;

        const payments = await prisma.$queryRawUnsafe(query);

        // --- Calculation Variables ---
        let total = 0;
        let count = 0;
        let monthlyCount = 0;
        let fullPaymentCount = 0;
        
        let formattedData = [];

        for (const payment of payments) {
            // Apply Plan Filters
            if (pPlan === "all" || (pPlan === "monthly" && payment.groupPType === 2) || (pPlan === "full" && payment.groupPType === 1)) {
                
                let amount = (payment.subjectAmount > 0 && course !== "") ? payment.subjectAmount : ((payment.isFree === 2) ? payment.free_amount : payment.amount);
                total += parseFloat(amount);
                count++;

                // Linked Modules text formatting
                let linkedCourseNames = "";
                if (payment.isLinked && payment.linked === null) {
                    const linkedPayments = await prisma.$queryRawUnsafe(`
                        SELECT s.name as businessName, c.name as courseName, g.name as groupName 
                        FROM payments p JOIN courses c ON p.course_id = c.id JOIN groups g ON c.group_id = g.id JOIN batches b ON g.batch_id = b.id JOIN businesses s ON b.business_id = s.id 
                        WHERE p.pType = 'slip' AND p.linked = ${payment.paymentId}
                    `);
                    linkedCourseNames = linkedPayments.map(lp => `${lp.businessName} - ${lp.groupName} - ${lp.courseName}`).join(" | ");
                }

                formattedData.push({
                    ...payment,
                    calculatedAmount: amount,
                    linkedModulesString: linkedCourseNames
                });
            }
        }

        return res.status(200).json(safeJson({ 
            data: formattedData, 
            total, 
            count, 
            monthlyCount, 
            fullPaymentCount 
        }));

    } catch (error) {
        console.error("getPaymentsAdmin Error:", error);
        return res.status(500).json({ message: error.message });
    }
};

// 2. Get Installment Payments
const getInstallmentPaymentsAdmin = async (req, res) => {
    try {
        const { business, batch, group, course, pType, pPlan, student, studentPhone, fromDate, toDate, selectBank, stream, classType, pStatus } = req.body;

        let query = `
            SELECT p.id as paymentId, p.payment_month, p.created_at as createdDate, p.updated_at as updatedDate, p.pType, p.amount, p.subjectAmount, p.course_id, p.student_id, p.teacher_status, p.is_discount_applied, p.post_pay_date, p.isInstallment, c.name as courseName, u.stream, u.fName, u.lName, u.phone, u.houseNo, u.streetName, u.village, u.town, u.district, p.isLinked, p.linked, p.slipFileName, p.isFree, p.free_amount, c.price as price, c.discountedPrice as discountedPrice, b.name as batchName, g.name as groupName, g.type as groupPType, s.name as businessName 
            FROM payments p
            JOIN courses c ON p.course_id = c.id
            JOIN users u ON p.student_id = u.id
            JOIN groups g ON c.group_id = g.id
            JOIN batches b ON g.batch_id = b.id
            JOIN businesses s ON b.business_id = s.id
            WHERE p.course_id IS NOT NULL AND p.status >= -1 AND p.isInstallment = 1 AND p.linked IS NULL
        `;

        if (student) query += ` AND CONCAT(u.fName, ' ', u.lName) LIKE '%${student}%'`;
        if (studentPhone) query += ` AND u.phone LIKE '%${studentPhone}%'`;
        if (req.user.role !== 'superadmin') {
            const myBusiness = await prisma.businesses.findFirst({
                where: { OR: [{ head_manager_id: parseInt(req.user.id) }, { ass_manager_id: parseInt(req.user.id) }] }
            });
            if (myBusiness) {
                query += ` AND s.id = ${myBusiness.id}`;
            }
        } else if (business) {
            query += ` AND s.id = ${business}`;
        }
        if (batch) query += ` AND b.id = ${batch}`;
        if (group) query += ` AND g.id = ${group}`;
        if (course) query += ` AND c.id = ${course}`;
        if (fromDate) query += ` AND p.created_at >= '${fromDate}'`;
        if (toDate) query += ` AND p.created_at <= '${toDate} 23:59:59'`;
        if (selectBank) query += ` AND p.bank = '${selectBank}'`;
        if (stream) query += ` AND c.stream = '${stream}'`;
        if (classType) query += ` AND c.type = '${classType}'`;

        query += ` ORDER BY p.status ASC, p.created_at DESC`;

        const payments = await prisma.$queryRawUnsafe(query);

        let total = 0;
        let count = 0;
        let newAvailableInstallments = 0;
        let totalReceivedPayments = 0;
        let formattedData = [];

        for (const payment of payments) {
            let amount = payment.amount;
            total += parseFloat(amount);
            count++;

            // Fetch Installments for this payment
            const installments = await prisma.installments.findMany({
                where: { payment_id: payment.paymentId },
                orderBy: { id: 'asc' }
            });

            const hasNew = installments.some(i => i.status === -1);
            if(hasNew && authUserRole !== 'teacher') newAvailableInstallments++;

            installments.forEach(i => {
                if(i.status === 1) totalReceivedPayments += parseFloat(i.amount);
            });

            formattedData.push({
                ...payment,
                installments: installments,
                hasNew
            });
        }

        return res.status(200).json(safeJson({ 
            data: formattedData, 
            total, 
            count, 
            newAvailableInstallments, 
            totalReceivedPayments 
        }));

    } catch (error) {
        console.error("getInstallmentPaymentsAdmin Error:", error);
        return res.status(500).json({ message: error.message });
    }
};

// ========================================================================
// 🔥 PART 2: PAYMENT ACTIONS (APPROVE, DECLINE, INSTALLMENTS) 🔥
// ========================================================================

// 1. Approve Normal Payment
const approvePayment = async (req, res) => {
    try {
        const { paymentId, payments: linkedPayments, approveType, bank } = req.body;
        const approverId = req.user.id;
        const isFree = (approveType === "free") ? 1 : 0;

        // Update Main Payment
        const payment = await prisma.payments.update({
            where: { id: BigInt(paymentId) },
            data: { status: 1, approver_id: approverId, isFree, bank, post_pay_date: null, updated_at: new Date() },
            include: { user: true } // student details
        });

        // Update Linked Payments
        if (linkedPayments && linkedPayments.length > 0) {
            for (let lpId of linkedPayments) {
                await prisma.payments.updateMany({
                    where: { id: BigInt(lpId), isLinked: true, linked: payment.id },
                    data: { status: 1, post_pay_date: null, approver_id: approverId, isFree, bank, updated_at: new Date() }
                });
            }
        }

        // Decline unselected linked payments
        const declinePayments = await prisma.payments.findMany({ where: { isLinked: true, linked: payment.id, status: -1 } });
        for (let dp of declinePayments) {
            await prisma.payments.update({ where: { id: dp.id }, data: { status: -3, approver_id: approverId } });
            // Remove from course_user if declined
            await prisma.course_user.deleteMany({ where: { course_id: dp.course_id, user_id: dp.student_id, pType: 1 } });
        }

        // Audit Trail
        await prisma.audit_trails.create({
            data: {
                user_id: approverId, action: 'Student Payment Approve',
                description: `Payment ID: ${payment.id} - Payment Approved for Student ${payment.user.fName} ${payment.user.lName}`
            }
        });

        return res.status(200).json({ paymentId, message: "Payment Approved Successfully!" });
    } catch (error) { return res.status(500).json({ message: error.message }); }
};

// 2. Decline Payment
const declinePayment = async (req, res) => {
    try {
        const { paymentId } = req.body;
        const approverId = req.user.id;

        const payment = await prisma.payments.update({
            where: { id: BigInt(paymentId) },
            data: { status: -3, approver_id: approverId, updated_at: new Date() },
            include: { user: true }
        });

        if (payment.subjectAmount > 0) {
            const isExists = await prisma.payments.findFirst({ where: { course_id: payment.course_id, student_id: payment.student_id, status: { notIn: [-3, -2] } } });
            if (!isExists) await prisma.course_user.deleteMany({ where: { course_id: payment.course_id, user_id: payment.student_id } });
        }

        // Decline linked payments
        const linkedPayments = await prisma.payments.findMany({ where: { isLinked: true, linked: payment.id, status: -1 } });
        for (let dp of linkedPayments) {
            await prisma.payments.update({ where: { id: dp.id }, data: { status: -3, approver_id: approverId } });
            const isLpExists = await prisma.payments.findFirst({ where: { course_id: dp.course_id, student_id: dp.student_id, status: { notIn: [-3, -2] }, id: { not: dp.id } } });
            if (!isLpExists) await prisma.course_user.deleteMany({ where: { course_id: dp.course_id, user_id: dp.student_id } });
        }

        await prisma.audit_trails.create({
            data: { user_id: approverId, action: 'Student Payment Decline', description: `Payment ID: ${payment.id} - Payment Declined for Student ${payment.user.fName} ${payment.user.lName}` }
        });

        return res.status(200).json({ paymentId, message: "Payment Declined!" });
    } catch (error) { return res.status(500).json({ message: error.message }); }
};

// 3. Approve Installment Payment
const approveInstallmentPayment = async (req, res) => {
    try {
        const { paymentId, installmentId, bank, nextPaymentDue } = req.body;
        const approverId = req.user.id;

        await prisma.installments.update({ where: { id: BigInt(installmentId) }, data: { status: 1, bank, approver_id: approverId } });

        const payment = await prisma.payments.findUnique({ where: { id: BigInt(paymentId) }, include: { installments: { orderBy: { id: 'asc' } }, user: true } });
        
        let status = -1;
        const completedInstallments = payment.installments.filter(i => i.status === 1).length;
        
        if (payment.installments.length === completedInstallments) {
            status = 1; // All paid
        } else {
            const nextInstallment = payment.installments.find(i => i.status === 0);
            if (nextInstallment && nextPaymentDue) {
                await prisma.installments.update({ where: { id: nextInstallment.id }, data: { due_date: new Date(nextPaymentDue) } });
            }
        }

        await prisma.payments.update({ where: { id: payment.id }, data: { status, approver_id: approverId, bank, post_pay_date: nextPaymentDue ? new Date(nextPaymentDue) : null, updated_at: new Date() } });
        await prisma.payments.updateMany({ where: { isLinked: true, linked: payment.id }, data: { status, approver_id: approverId, bank, post_pay_date: nextPaymentDue ? new Date(nextPaymentDue) : null, updated_at: new Date() } });

        await prisma.audit_trails.create({ data: { user_id: approverId, action: 'Student Installment Payment Approve', description: `Installment ID: ${installmentId} - Payment Approved for Student ${payment.user.fName} ${payment.user.lName}` }});

        return res.status(200).json({ message: "Installment Payment Approved Successfully!" });
    } catch (error) { return res.status(500).json({ message: error.message }); }
};

// 4. Approve Discount Payment
const approveDiscountPayment = async (req, res) => {
    try {
        const { paymentId, payments: linkedPayments, bank } = req.body;
        const approverId = req.user.id;
        let disTotal = 0;

        let payment = await prisma.payments.findUnique({ where: { id: BigInt(paymentId) }, include: { user: true } });
        
        if (req.body[`dis-${payment.id}`]) {
            const disVal = parseFloat(req.body[`dis-${payment.id}`]);
            disTotal += disVal;
            await prisma.payments.update({ where: { id: payment.id }, data: { subjectAmount: disVal } });
        }

        await prisma.payments.update({ where: { id: payment.id }, data: { status: 1, approver_id: approverId, isFree: 2, bank, updated_at: new Date() } });

        if (linkedPayments && linkedPayments.length > 0) {
            for (let lpId of linkedPayments) {
                const disVal = parseFloat(req.body[`dis-${lpId}`] || 0);
                disTotal += disVal;
                await prisma.payments.updateMany({
                    where: { id: BigInt(lpId), isLinked: true, linked: payment.id },
                    data: { status: 1, approver_id: approverId, isFree: 2, subjectAmount: disVal, bank, updated_at: new Date() }
                });
            }
        }

        await prisma.payments.update({ where: { id: payment.id }, data: { free_amount: disTotal } });

        // Decline remaining
        const declinePayments = await prisma.payments.findMany({ where: { isLinked: true, linked: payment.id, status: -1 } });
        for (let dp of declinePayments) {
            await prisma.payments.update({ where: { id: dp.id }, data: { status: -3, approver_id: approverId } });
            await prisma.course_user.deleteMany({ where: { course_id: dp.course_id, user_id: dp.student_id, pType: 1 } });
        }

        await prisma.audit_trails.create({ data: { user_id: approverId, action: 'Student Discount Payment Approve', description: `Payment ID: ${payment.id} - Discount Payment Approved for Student ${payment.user.fName} ${payment.user.lName}` }});

        return res.status(200).json({ paymentId, message: "Discount Payment Approved!" });
    } catch (error) { return res.status(500).json({ message: error.message }); }
};

// 5. Free Payment
const freePayment = async (req, res) => {
    try {
        const { paymentId } = req.body;
        const approverId = req.user.id;

        const payment = await prisma.payments.update({ where: { id: BigInt(paymentId) }, data: { approver_id: approverId, isFree: 1, status: 1, updated_at: new Date() }, include: { user: true } });
        await prisma.payments.updateMany({ where: { isLinked: true, linked: payment.id }, data: { approver_id: approverId, isFree: 1, status: 1, updated_at: new Date() } });

        await prisma.audit_trails.create({ data: { user_id: approverId, action: 'Student Free Payment Approve', description: `Payment ID: ${payment.id} - Free Payment Approved for Student ${payment.user.fName} ${payment.user.lName}` }});

        return res.status(200).json({ paymentId, message: "Payment Marked as Free!" });
    } catch (error) { return res.status(500).json({ message: error.message }); }
};

// 6. Delete Installment Payment
const deleteInstPayment = async (req, res) => {
    try {
        const { paymentId, installmentId } = req.body;
        const approverId = req.user.id;

        const installment = await prisma.installments.update({ where: { id: BigInt(installmentId) }, data: { status: 0, due_date: null, approver_id: null, pType: null, slipFileName: null, bank: null } });
        const payment = await prisma.payments.findUnique({ where: { id: BigInt(paymentId) }, include: { user: true } });

        const availablePayment = await prisma.installments.count({ where: { payment_id: payment.id, status: 1 } });
        if (availablePayment === 0) {
            await prisma.payments.update({ where: { id: payment.id }, data: { post_pay_date: null, status: -1, bank: null } });
            await prisma.payments.updateMany({ where: { isLinked: true, linked: payment.id }, data: { status: -1, bank: null, post_pay_date: null, updated_at: new Date() } });
        }

        await prisma.audit_trails.create({ data: { user_id: approverId, action: 'Student Installment Payment Deleted', description: `Installment Payment ID: ${installment.id} - Payment Deleted for Student ${payment.user.fName} ${payment.user.lName}` }});

        return res.status(200).json({ message: "Installment Payment Deleted" });
    } catch (error) { return res.status(500).json({ message: error.message }); }
};

// 7. Delete Full Payment
const deletePayment = async (req, res) => {
    try {
        const { paymentId } = req.body;
        const approverId = req.user.id;

        const payment = await prisma.payments.findUnique({ where: { id: BigInt(paymentId) }, include: { user: true } });

        const isExists = await prisma.payments.count({ where: { course_id: payment.course_id, student_id: payment.student_id, status: { notIn: [-3, -2] }, id: { not: payment.id } } });
        if (isExists === 0) await prisma.course_user.deleteMany({ where: { course_id: payment.course_id, user_id: payment.student_id } });

        const declinePayments = await prisma.payments.findMany({ where: { isLinked: true, linked: payment.id } });
        for (let dp of declinePayments) {
            const isLpExists = await prisma.payments.count({ where: { course_id: dp.course_id, student_id: dp.student_id, status: { notIn: [-3, -2] }, id: { not: dp.id } } });
            if (isLpExists === 0) await prisma.course_user.deleteMany({ where: { course_id: dp.course_id, user_id: dp.student_id } });
            await prisma.payments.delete({ where: { id: dp.id } });
        }
        await prisma.payments.delete({ where: { id: payment.id } });

        await prisma.audit_trails.create({ data: { user_id: approverId, action: 'Student Payment Delete', description: `Payment ID: ${payment.id} - Payment Deleted for Student ${payment.user.fName} ${payment.user.lName}` }});

        return res.status(200).json({ paymentId, message: "Payment Deleted Successfully!" });
    } catch (error) { return res.status(500).json({ message: error.message }); }
};

// 8. Enable/Disable Teacher Payment
const enablePayment = async (req, res) => {
    try {
        const { paymentId, operationType } = req.body;
        const approverId = req.user.id;

        const payment = await prisma.payments.findUnique({ where: { id: BigInt(paymentId) }, include: { teach: { include: { user: true } } } });
        const teacher = payment.teach.user;
        const status = operationType === "enable" ? 1 : 0;

        await prisma.payments.update({ where: { id: payment.id }, data: { teacher_status: status } });

        await prisma.audit_trails.create({ data: { user_id: approverId, action: `Teacher Payment ${operationType === "enable" ? "Enable" : "Disable"}`, description: `Payment ID: ${payment.id} - Payment ${operationType}d for Teacher ${teacher.fName} ${teacher.lName}` }});

        return res.status(200).json({ success: true, message: `Teacher Payment ${operationType}d!` });
    } catch (error) { return res.status(500).json({ message: error.message }); }
};

// 1. Cascading Dropdowns (Filters වලට)
const getDropdownOptions = async (req, res) => {
    try {
        const { type, businessId, batchId, groupId, classType } = req.body;
        let data = [];

        if (type === "batch" && businessId) {
            data = await prisma.batches.findMany({ where: { business_id: BigInt(businessId) } });
        } else if (type === "group" && batchId) {
            data = await prisma.groups.findMany({ where: { batch_id: BigInt(batchId) } });
        } else if (type === "course" && groupId) {
            let whereClause = { group_id: BigInt(groupId) };
            if (classType) whereClause.type = parseInt(classType);
            data = await prisma.courses.findMany({ where: whereClause });
        }

        return res.status(200).json(safeJson(data));
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// 2. Payment Approval Modal එකට Linked Payments & Details යැවීම
const getPaymentDetailsForApproval = async (req, res) => {
    try {
        const { paymentId } = req.body;
        const payment = await prisma.payments.findUnique({
            where: { id: BigInt(paymentId) },
            include: { course: true, user: true }
        });

        let linkedPayments = [];
        if (payment.isLinked) {
            linkedPayments = await prisma.payments.findMany({
                where: { linked: payment.id, isLinked: true, status: { not: -2 } },
                include: { course: true }
            });
        }

        return res.status(200).json(safeJson({ payment, linkedPayments }));
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// 3. Post Pay Approve කිරීම
const approvePostPay = async (req, res) => {
    try {
        const { paymentId, postPayDate } = req.body;
        const approverId = req.user.id;

        const payment = await prisma.payments.update({
            where: { id: BigInt(paymentId) },
            data: { post_pay_date: new Date(postPayDate), status: -1, updated_at: new Date() },
            include: { user: true }
        });

        await prisma.payments.updateMany({
            where: { isLinked: true, linked: payment.id },
            data: { post_pay_date: new Date(postPayDate), status: -1, updated_at: new Date() }
        });

        await prisma.audit_trails.create({
            data: {
                user_id: approverId,
                action: 'Student Post Pay Date Approve',
                description: `Payment ID: ${payment.id} - Post Pay Date Approved for Student ${payment.user.fName} ${payment.user.lName} - Date: ${postPayDate}`
            }
        });

        return res.status(200).json({ message: "Post Pay Date Approved Successfully!" });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

module.exports = {
    onlinePaymentSuccessNotify, courseConfirm, paymentTypeSelect, uploadSlip, updateSlip, getPaymentHash, 
    getPaymentsApi, myPayments, getPaymentsAdmin, getInstallmentPaymentsAdmin, approvePayment, declinePayment, approveInstallmentPayment,
    approveDiscountPayment, freePayment, deleteInstPayment, deletePayment, enablePayment,
    getDropdownOptions, getPaymentDetailsForApproval, approvePostPay
};