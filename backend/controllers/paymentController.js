const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const safeJson = (data) => JSON.parse(JSON.stringify(data, (key, value) => typeof value === 'bigint' ? value.toString() : value));
const generateMD5 = (str) => crypto.createHash('md5').update(str).digest('hex').toUpperCase();

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

        return res.status(200).json({ message: 'Payment Slip Uploaded Successfully! Your payment will be approved within 24 hours.' });
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

module.exports = {
    onlinePaymentSuccessNotify, courseConfirm, paymentTypeSelect, uploadSlip, updateSlip, getPaymentHash, getPaymentsApi, myPayments
};