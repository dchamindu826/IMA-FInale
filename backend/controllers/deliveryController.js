const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const safeJson = (data) => JSON.parse(JSON.stringify(data, (key, value) => typeof value === 'bigint' ? value.toString() : value));

// --- 1. Tute Stocks Management ---
const addTuteStock = async (req, res) => {
    try {
        const { course: courseId, tuteName, stockAmount } = req.body;
        const userId = req.user.id;

        const tuteStock = await prisma.tute_stocks.create({
            data: {
                course_id: BigInt(courseId),
                tuteName: tuteName,
                stock: parseInt(stockAmount),
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        const course = await prisma.courses.findUnique({
            where: { id: BigInt(courseId) },
            include: { group: { include: { batch: { include: { business: true } } } } }
        });

        await prisma.audit_trails.create({
            data: {
                user_id: BigInt(userId),
                action: 'Add Stock',
                description: `Tute Stock Added for ${course.group.batch.business.name} - ${course.group.batch.name} - ${course.group.name} - ${course.name} -> ${tuteName} : ${stockAmount}`,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        return res.status(200).json({ message: 'Successfully added tute stock!' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const updateTuteStock = async (req, res) => {
    try {
        const { tuteId, tuteName, stockAmount } = req.body;
        const userId = req.user.id;

        const tuteStock = await prisma.tute_stocks.update({
            where: { id: BigInt(tuteId) },
            data: {
                tuteName: tuteName,
                stock: parseInt(stockAmount),
                updated_at: new Date()
            }
        });

        const course = await prisma.courses.findUnique({
            where: { id: BigInt(tuteStock.course_id) },
            include: { group: { include: { batch: { include: { business: true } } } } }
        });

        await prisma.audit_trails.create({
            data: {
                user_id: BigInt(userId),
                action: 'Update Stock',
                description: `Tute Stock Updated for ${course.group.batch.business.name} - ${course.group.batch.name} - ${course.group.name} - ${course.name} -> ${tuteName} to ${stockAmount}`,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        return res.status(200).json({ message: 'Successfully updated tute stock!' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// --- 2. Leads Management ---
const updateLeadsData = async (req, res) => {
    try {
        const { leadId, coUser, coStatus, coFeedback, remarks } = req.body;

        await prisma.leads.update({
            where: { id: BigInt(leadId) },
            data: {
                coordinationUser_id: coUser ? BigInt(coUser) : null,
                cStatus: coStatus,
                feedback: coFeedback,
                remarks: remarks,
                updated_at: new Date()
            }
        });

        return res.status(200).json({ message: 'Lead Updated Successfully!' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// --- 3. Delivery & Coordination Management ---
const updateCoordinationDelivery = async (req, res) => {
    try {
        const { studentId, groupId, deliveryId, paymentId, directPhone, houseNo, streetName, village, town, district, coUser, coStatus, coFeedback, remarks, deliveryStatus, deliveryDate, receiverDate, tuteName, trackingNo, formType } = req.body;

        // Update Student Address Details
        await prisma.users.update({
            where: { id: BigInt(studentId) },
            data: {
                directPhone, houseNo, streetName, village, town, district, updated_at: new Date()
            }
        });

        let deliveryData = {
            payment_id: paymentId ? paymentId : null,
            student_id: BigInt(studentId),
            group_id: BigInt(groupId),
            updated_at: new Date()
        };

        if (formType === "coordination") {
            if (req.user.role === 'superadmin' || req.user.role === 'assistantManager') {
                deliveryData.coordinationUser_id = coUser ? BigInt(coUser) : null;
            }
            deliveryData.cStatus = coStatus;
            deliveryData.feedback = coFeedback;
            deliveryData.remarks = remarks;
        }

        if (formType === "delivery") {
            deliveryData.dStatus = deliveryStatus;
            deliveryData.deliveryDate = deliveryDate ? new Date(deliveryDate) : null;
            deliveryData.confirmDate = receiverDate ? new Date(receiverDate) : null;
            deliveryData.tuteName = tuteName;
            deliveryData.trackingNo = trackingNo;
        }

        if (deliveryId) {
            await prisma.deliveries.update({
                where: { id: BigInt(deliveryId) },
                data: deliveryData
            });
        } else {
            await prisma.deliveries.create({
                data: { ...deliveryData, created_at: new Date() }
            });
        }

        return res.status(200).json({ message: 'Successfully Updated!' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const updateDelivery = async (req, res) => {
    try {
        const { studentId, groupId, deliveryId, paymentId, directPhone, houseNo, streetName, village, town, district, deliveryStatus, deliveryDate, receiverDate, trackingNo, tutes } = req.body;

        // Update Student Address Details
        await prisma.users.update({
            where: { id: BigInt(studentId) },
            data: {
                directPhone, houseNo, streetName, village, town, district, updated_at: new Date()
            }
        });

        let deliveryData = {
            payment_id: paymentId,
            dStatus: deliveryStatus,
            deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
            confirmDate: receiverDate ? new Date(receiverDate) : null,
            trackingNo: trackingNo,
            student_id: BigInt(studentId),
            group_id: BigInt(groupId),
            updated_at: new Date()
        };

        let courseDelivery;
        if (deliveryId) {
            courseDelivery = await prisma.course_deliveries.update({
                where: { id: BigInt(deliveryId) },
                data: deliveryData
            });
        } else {
            courseDelivery = await prisma.course_deliveries.create({
                data: { ...deliveryData, created_at: new Date() }
            });
        }

        // Handle Tute Stocks decrement
        let tuteNamesString = '';
        if (tutes && Array.isArray(tutes)) {
            for (let tuteId of tutes) {
                const tuteStock = await prisma.tute_stocks.findUnique({ where: { id: BigInt(tuteId) } });
                if (tuteStock) {
                    tuteNamesString += tuteStock.tuteName + ' / ';
                    
                    if (deliveryStatus === "Sent") {
                        // Check if already mapped in tute_stock_course_delivery
                        const exists = await prisma.tute_stock_course_delivery.findFirst({
                            where: { tute_stock_id: BigInt(tuteId), course_delivery_id: courseDelivery.id }
                        });
                        
                        if (!exists) {
                            await prisma.tute_stock_course_delivery.create({
                                data: { tute_stock_id: BigInt(tuteId), course_delivery_id: courseDelivery.id }
                            });
                            // Reduce stock
                            await prisma.tute_stocks.update({
                                where: { id: BigInt(tuteId) },
                                data: { stock: tuteStock.stock - 1 }
                            });
                        }
                    }
                }
            }
        }
        
        tuteNamesString = tuteNamesString.replace(/ \/ $/, ''); // Remove trailing slash
        
        await prisma.course_deliveries.update({
            where: { id: courseDelivery.id },
            data: { tuteName: tuteNamesString }
        });

        return res.status(200).json({ message: 'Delivery Updated Successfully!' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

module.exports = {
    addTuteStock,
    updateTuteStock,
    updateLeadsData,
    updateCoordinationDelivery,
    updateDelivery
};