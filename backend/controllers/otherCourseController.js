const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const safeJson = (data) => JSON.parse(JSON.stringify(data, (key, value) => typeof value === 'bigint' ? value.toString() : value));

// --- 1. Add Other Course ---
const addOtherCourse = async (req, res) => {
    try {
        const { name, description, courseType, startDate, linkCourse, paymentType, oneTimePrice, monthlyPrice, discountedPrice, oneTimePrice2, monthlyPrice2, discountedPrice2 } = req.body;
        const userId = req.user.id;

        // Date formatting based on type
        let formattedDate = null;
        if (parseInt(courseType) === 1 && startDate) {
            formattedDate = new Date(startDate);
        } else if (parseInt(courseType) === 2 && startDate) {
            const d = new Date(startDate);
            formattedDate = new Date(d.getFullYear(), d.getMonth(), 1);
        }

        const otherCourse = await prisma.other_courses.create({
            data: {
                name,
                description,
                type: parseInt(courseType),
                start_date: formattedDate,
                course_id: linkCourse ? BigInt(linkCourse) : null,
                pType: parseInt(paymentType),
                price: parseFloat(oneTimePrice || 0),
                monthlyPrice: parseFloat(monthlyPrice || 0),
                discountedPrice: parseFloat(discountedPrice || 0),
                price2: parseFloat(oneTimePrice2 || 0),
                monthlyPrice2: parseFloat(monthlyPrice2 || 0),
                discountedPrice2: parseFloat(discountedPrice2 || 0),
                status: 1,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        await prisma.audit_trails.create({
            data: {
                user_id: BigInt(userId),
                action: 'Add Other Course',
                description: 'Other Course Added ' + otherCourse.name,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        return res.status(200).json({ message: 'Successfully Added!' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// --- 2. Update Other Course ---
const updateOtherCourse = async (req, res) => {
    try {
        const { otherCourseId, name, description, courseType, startDate, linkCourse, paymentType, oneTimePrice, monthlyPrice, discountedPrice, oneTimePrice2, monthlyPrice2, discountedPrice2 } = req.body;
        const userId = req.user.id;

        let formattedDate = null;
        if (parseInt(courseType) === 1 && startDate) {
            formattedDate = new Date(startDate);
        } else if (parseInt(courseType) === 2 && startDate) {
            const d = new Date(startDate);
            formattedDate = new Date(d.getFullYear(), d.getMonth(), 1);
        }

        const otherCourse = await prisma.other_courses.update({
            where: { id: BigInt(otherCourseId) },
            data: {
                name,
                description,
                type: parseInt(courseType),
                start_date: formattedDate,
                course_id: linkCourse ? BigInt(linkCourse) : null,
                pType: parseInt(paymentType),
                price: parseFloat(oneTimePrice || 0),
                monthlyPrice: parseFloat(monthlyPrice || 0),
                discountedPrice: parseFloat(discountedPrice || 0),
                price2: parseFloat(oneTimePrice2 || 0),
                monthlyPrice2: parseFloat(monthlyPrice2 || 0),
                discountedPrice2: parseFloat(discountedPrice2 || 0),
                updated_at: new Date()
            }
        });

        // Update all related teaches records prices
        await prisma.teaches.updateMany({
            where: { other_course_id: BigInt(otherCourseId) },
            data: {
                price: parseFloat(oneTimePrice || 0),
                monthlyPrice: parseFloat(monthlyPrice || 0),
                discountedPrice: parseFloat(discountedPrice || 0),
                price2: parseFloat(oneTimePrice2 || 0),
                monthlyPrice2: parseFloat(monthlyPrice2 || 0),
                discountedPrice2: parseFloat(discountedPrice2 || 0),
            }
        });

        await prisma.audit_trails.create({
            data: {
                user_id: BigInt(userId),
                action: 'Edit Other Course',
                description: 'Other Course Edited ' + otherCourse.name,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        return res.status(200).json({ message: 'Successfully Updated!' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// --- 3. Delete Other Course (Soft Delete) ---
const deleteOtherCourse = async (req, res) => {
    try {
        const { otherCourse_id } = req.body;
        const userId = req.user.id;

        const otherCourse = await prisma.other_courses.update({
            where: { id: BigInt(otherCourse_id) },
            data: { status: 0 }
        });

        await prisma.audit_trails.create({
            data: {
                user_id: BigInt(userId),
                action: 'Delete Other Course',
                description: 'Other Course Deleted ' + otherCourse.name,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        return res.status(200).json({ message: 'Successfully Deleted!' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// --- 4. Add Batch to Other Course & Clone Contents ---
const addBatchOtherCourse = async (req, res) => {
    try {
        const { batch, otherCourse: otherCourseId, teacher } = req.body;

        const existingTeach = await prisma.teaches.findFirst({
            where: { batch_id: BigInt(batch), other_course_id: BigInt(otherCourseId) }
        });

        if (existingTeach) {
            return res.status(400).json({ message: 'Batch Already Added!' });
        }

        const otherCourseData = await prisma.other_courses.findUnique({ where: { id: BigInt(otherCourseId) } });

        const newTeach = await prisma.teaches.create({
            data: {
                batch_id: BigInt(batch),
                other_course_id: BigInt(otherCourseId),
                teacher_id: BigInt(teacher),
                price: otherCourseData.price,
                monthlyPrice: otherCourseData.monthlyPrice,
                discountedPrice: otherCourseData.discountedPrice,
                price2: otherCourseData.price2,
                monthlyPrice2: otherCourseData.monthlyPrice2,
                discountedPrice2: otherCourseData.discountedPrice2,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        // Clone contents from previous teach record of this other_course
        const prevTeach = await prisma.teaches.findFirst({
            where: { other_course_id: BigInt(otherCourseId), id: { not: newTeach.id } }
        });

        if (prevTeach) {
            const contents = await prisma.contents.findMany({ where: { teach_id: prevTeach.id } });
            
            for (const content of contents) {
                const newContent = await prisma.contents.create({
                    data: {
                        title: content.title,
                        type: content.type,
                        date: content.date,
                        startTime: content.startTime,
                        endTime: content.endTime,
                        link: content.link,
                        fileName: content.fileName,
                        paperTime: content.paperTime,
                        questionCount: content.questionCount,
                        itemOrder: content.itemOrder,
                        teach_id: newTeach.id,
                        created_at: new Date(),
                        updated_at: new Date()
                    }
                });

                // Clone answers if it's a paper (type 4)
                if (content.type === 4) {
                    const answers = await prisma.answers.findMany({ where: { content_id: content.id } });
                    const newAnswersData = answers.map(ans => ({
                        content_id: newContent.id,
                        questionNo: ans.questionNo,
                        answerNo: ans.answerNo
                    }));
                    if (newAnswersData.length > 0) {
                        await prisma.answers.createMany({ data: newAnswersData });
                    }
                }
            }
        }

        return res.status(200).json({ message: 'Successfully Added!' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// --- 5. Change Teacher for Other Course Batch ---
const updateOtherCourseTeacher = async (req, res) => {
    try {
        const { teach_id, teacher } = req.body;

        await prisma.teaches.update({
            where: { id: BigInt(teach_id) },
            data: {
                teacher_id: BigInt(teacher),
                updated_at: new Date()
            }
        });

        return res.status(200).json({ message: 'Successfully Updated!' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

module.exports = {
    addOtherCourse,
    updateOtherCourse,
    deleteOtherCourse,
    addBatchOtherCourse,
    updateOtherCourseTeacher
};