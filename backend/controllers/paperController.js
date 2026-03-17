const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const safeJson = (data) => JSON.parse(JSON.stringify(data, (key, value) => typeof value === 'bigint' ? value.toString() : value));

// --- 1. Add MCQ Paper (Type 4) ---
const addPaper = async (req, res) => {
    try {
        const { paperTitle, paperTime, mcqs, classMonth, contentGroup, selectedCourses } = req.body;
        const userId = req.user.id;

        if (!req.file) return res.status(400).json({ message: "Paper file is required" });

        const fileName = req.file.filename;
        const formattedDate = classMonth ? new Date(new Date(classMonth).getFullYear(), new Date(classMonth).getMonth(), 1) : null;

        const content = await prisma.contents.create({
            data: {
                title: paperTitle,
                type: 4,
                fileName: fileName,
                paperTime: paperTime,
                questionCount: parseInt(mcqs),
                date: formattedDate,
                content_group_id: contentGroup ? parseInt(contentGroup) : null,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        // Add Answers
        const answerData = [];
        for (let i = 1; i <= parseInt(mcqs); i++) {
            const answers = req.body[`q${i}`]; // Assuming answers come as an array from frontend
            if (answers && Array.isArray(answers)) {
                for (const ans of answers) {
                    answerData.push({
                        content_id: content.id,
                        questionNo: i,
                        answerNo: parseInt(ans)
                    });
                }
            }
        }
        if (answerData.length > 0) {
            await prisma.answers.createMany({ data: answerData });
        }

        // Map to selected courses
        if (selectedCourses && Array.isArray(selectedCourses)) {
            for (let courseId of selectedCourses) {
                const order = await prisma.content_course.findFirst({
                    where: { course_id: BigInt(courseId), type: 4 },
                    orderBy: { itemOrder: 'desc' }
                });
                
                const itemOrder = order ? (parseInt(order.itemOrder) + 1).toString() : "1";

                await prisma.content_course.create({
                    data: {
                        content_id: content.id,
                        course_id: BigInt(courseId),
                        type: 4,
                        itemOrder: itemOrder,
                        created_at: new Date(),
                        updated_at: new Date()
                    }
                });
            }
        }

        // Audit Trail
        await prisma.audit_trails.create({
            data: {
                user_id: BigInt(userId),
                action: 'Add MCQ Paper',
                description: 'MCQ Paper Added ' + content.title,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        return res.status(200).json({ message: 'Paper Added Successfully!' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// --- 2. Add Structured Paper (Type 5) ---
const addStructuredPaper = async (req, res) => {
    try {
        const { title, classMonth, isFree, contentGroup, selectedCourses } = req.body;
        const userId = req.user.id;

        if (!req.file) return res.status(400).json({ message: "File is required" });

        const fileName = req.file.filename;
        const formattedDate = classMonth ? new Date(new Date(classMonth).getFullYear(), new Date(classMonth).getMonth(), 1) : null;

        const content = await prisma.contents.create({
            data: {
                title: title,
                type: 5,
                fileName: fileName,
                isFree: isFree ? true : false,
                date: formattedDate,
                content_group_id: contentGroup ? parseInt(contentGroup) : null,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        if (selectedCourses && Array.isArray(selectedCourses)) {
            for (let courseId of selectedCourses) {
                const order = await prisma.content_course.findFirst({
                    where: { course_id: BigInt(courseId), type: 5 },
                    orderBy: { itemOrder: 'desc' }
                });
                
                const itemOrder = order ? (parseInt(order.itemOrder) + 1).toString() : "1";

                await prisma.content_course.create({
                    data: {
                        content_id: content.id,
                        course_id: BigInt(courseId),
                        type: 5,
                        itemOrder: itemOrder,
                        created_at: new Date(),
                        updated_at: new Date()
                    }
                });
            }
        }

        await prisma.audit_trails.create({
            data: {
                user_id: BigInt(userId),
                action: 'Add Structured Paper',
                description: 'Structured Paper Added ' + content.title,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        return res.status(200).json({ message: 'Paper Added Successfully!' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// --- 3. Add Marking Answer (Teacher Marking) ---
const addMarkingAnswer = async (req, res) => {
    try {
        const { userPaper_id, gradeType, comment } = req.body;
        const userId = req.user.id;

        if (!req.file) return res.status(400).json({ message: "Marked file is required" });

        const fileName = req.file.filename;

        // Update User Paper
        await prisma.user_papers.update({
            where: { id: BigInt(userPaper_id) },
            data: {
                answerCorrection: fileName,
                resultType: gradeType,
                comment: comment,
                updated_at: new Date()
            }
        });

        const userPaper = await prisma.user_papers.findUnique({ where: { id: BigInt(userPaper_id) } });
        const content = await prisma.contents.findUnique({ where: { id: BigInt(userPaper.content_id) } });
        const student = await prisma.users.findUnique({ where: { id: BigInt(userPaper.user_id) } });

        await prisma.audit_trails.create({
            data: {
                user_id: BigInt(userId),
                action: 'Add marking Answer',
                description: `Marking Answer Added to ${student.fName} ${student.lName} for ${content.title}`,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        return res.status(200).json({ message: 'Marking Submitted Successfully!' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

module.exports = {
    addPaper,
    addStructuredPaper,
    addMarkingAnswer
};