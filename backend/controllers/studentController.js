const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const safeJson = (data) => JSON.parse(JSON.stringify(data, (key, value) => typeof value === 'bigint' ? value.toString() : value));

// --- 1. Dashboard Data ---
const index = async (req, res) => {
    try {
        const user = req.user;
        const courseUsers = await prisma.course_user.findMany({ where: { user_id: BigInt(user.id) }, include: { course: { include: { group: { include: { batch: true } } } } } });

        const registeredBusinesses = [...new Set(courseUsers.map(cu => cu.course.group.batch.business_id))];
        const registeredBatches = [...new Set(courseUsers.map(cu => cu.course.group.batch_id))];

        const announcements = await prisma.announcements.findMany({
            where: { OR: [{ business_id: null }, { business_id: { in: registeredBusinesses } }], AND: { OR: [{ batch_id: null }, { batch_id: { in: registeredBatches } }] } }, orderBy: { id: 'desc' }
        });
        const posts = await prisma.posts.findMany({
            where: { OR: [{ business_id: null }, { business_id: { in: registeredBusinesses } }], AND: { OR: [{ batch_id: null }, { batch_id: { in: registeredBatches } }] } }, orderBy: { id: 'desc' }
        });

        return res.status(200).json(safeJson({ registeredBusinesses: [...registeredBusinesses, 'All'], announcements, posts }));
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// --- 2. ClassRoom View ---
const classRoom = async (req, res) => {
    try {
        const user = req.user;
        const registeredCourseIds = (await prisma.course_user.findMany({ where: { user_id: BigInt(user.id) } })).map(c => c.course_id);
        const registeredGroupIds = (await prisma.courses.findMany({ where: { id: { in: registeredCourseIds } } })).map(c => c.group_id);
        const registeredBatchIds = (await prisma.groups.findMany({ where: { id: { in: registeredGroupIds } } })).map(g => g.batch_id);
        const registeredBusinessIds = (await prisma.batches.findMany({ where: { id: { in: registeredBatchIds } } })).map(b => b.business_id);

        const businesses = await prisma.businesses.findMany({
            where: { status: 1, id: { in: registeredBusinessIds } },
            include: {
                batches: {
                    where: { status: 1, id: { in: registeredBatchIds } }, orderBy: { itemOrder: 'asc' },
                    include: {
                        groups: {
                            where: { status: 1, id: { in: registeredGroupIds } }, orderBy: { itemOrder: 'asc' },
                            include: { courses: { where: { status: 1, id: { in: registeredCourseIds } }, orderBy: { itemOrder: 'asc' } } }
                        }
                    }
                }
            }
        });
        return res.status(200).json(safeJson({ businesses }));
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// --- 3. View Module (Fetch Contents inside Course) ---
const viewModule = async (req, res) => {
    try {
        const user = req.user;
        const { courseId } = req.params;

        const course = await prisma.courses.findUnique({ where: { id: BigInt(courseId) }, include: { group: { include: { batch: { include: { business: { include: { content_groups: true } } } } } } } });
        
        // Fetch contents via join table content_course
        const getContents = async (type) => await prisma.contents.findMany({ where: { type: type, content_course: { some: { course_id: BigInt(courseId) } } }, orderBy: { date: 'asc' } });
        
        const liveClasses = await getContents(1);
        const recordings = await getContents(2);
        const documents = await getContents(3);
        const papers = await getContents(4);
        const sPapers = await getContents(5);

        let paidStatus = 0;
        const payment = await prisma.payments.findFirst({ where: { course_id: BigInt(courseId), student_id: BigInt(user.id), status: { notIn: [-2, -3] } }, orderBy: { id: 'desc' } });
        
        if (payment) {
            if (payment.status === -1 && payment.post_pay_date && new Date(payment.post_pay_date) >= new Date()) paidStatus = 1;
            else paidStatus = payment.status;
        }

        return res.status(200).json(safeJson({ liveClasses, recordings, documents, papers, sPapers, paidStatus, course }));
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// --- 4. Videos (Zoom / Youtube / Recording) ---
const viewZoom = async (req, res) => {
    try {
        const { content_id } = req.body;
        const content = await prisma.contents.findUnique({ where: { id: BigInt(content_id) } });
        
        const attendance = await prisma.attendances.findFirst({ where: { content_id: BigInt(content_id), user_id: BigInt(req.user.id) } });
        if (!attendance) await prisma.attendances.create({ data: { user_id: BigInt(req.user.id), content_id: BigInt(content_id), created_at: new Date() } });

        return res.status(200).json({ zoomLink: content.link });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const viewYoutubeLive = async (req, res) => {
    try {
        const { content_id } = req.body;
        const content = await prisma.contents.findUnique({ where: { id: BigInt(content_id) } });
        
        let link = content.link;
        if (link.includes('youtube.com/live')) link = "https://www.youtube.com/embed/" + link.split("live/")[1];
        else if (link.includes('v=')) link = "https://www.youtube.com/embed/" + link.split("v=").pop();
        else if (link.includes('youtu.be/')) link = "https://www.youtube.com/embed/" + link.split("youtu.be/").pop().split("?")[0];

        const attendance = await prisma.attendances.findFirst({ where: { content_id: BigInt(content_id), user_id: BigInt(req.user.id) } });
        if (!attendance) await prisma.attendances.create({ data: { user_id: BigInt(req.user.id), content_id: BigInt(content_id), created_at: new Date() } });

        return res.status(200).json({ youtubeLink: link });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// --- 5. Paper Logic ---
const startExam = async (req, res) => {
    try {
        const { content_id } = req.body;
        const exists = await prisma.user_papers.findFirst({ where: { user_id: BigInt(req.user.id), content_id: BigInt(content_id) } });
        if (exists) return res.status(500).json({ message: 'Exam Already Taken!' });
        return res.status(200).json({ message: 'Exam Ready!' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const paperComplete = async (req, res) => {
    try {
        const { paperId } = req.body;
        const user = req.user;
        const exists = await prisma.user_papers.findFirst({ where: { user_id: BigInt(user.id), content_id: BigInt(paperId) } });
        if (exists) return res.status(500).json({ message: 'Exam Already Taken!' });

        const paper = await prisma.contents.findUnique({ where: { id: BigInt(paperId) } });
        let correctCount = 0;
        const userAnswersToSave = [];

        for (let i = 1; i <= paper.questionCount; i++) {
            const correctAnswers = await prisma.answers.findMany({ where: { content_id: paper.id, questionNo: i } });
            const ansArray = correctAnswers.map(a => a.answerNo);
            const userAnswers = req.body[`q${i}`];
            
            if (userAnswers) {
                if (ansArray.length === userAnswers.length || userAnswers.length === 1) {
                    let isCorrect = true;
                    for (const uAns of userAnswers) {
                        if (!ansArray.includes(parseInt(uAns))) { isCorrect = false; break; }
                    }
                    if (isCorrect) correctCount++;
                }
                for (const uAns of userAnswers) {
                    userAnswersToSave.push({ user_id: BigInt(user.id), content_id: BigInt(paper.id), questionNo: i, answerNo: parseInt(uAns) });
                }
            }
        }
        if (userAnswersToSave.length > 0) await prisma.user_answers.createMany({ data: userAnswersToSave });
        await prisma.user_papers.create({ data: { user_id: BigInt(user.id), content_id: BigInt(paper.id), correctCount: correctCount, created_at: new Date() } });

        return res.status(200).json({ message: 'Exam Completed Successfully!' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const addUserAnswer = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "File required" });
        await prisma.user_papers.create({ data: { user_id: BigInt(req.user.id), content_id: BigInt(req.body.contentId), userAnswer: req.file.filename, created_at: new Date() } });
        return res.status(200).json({ message: 'Answer Submitted Successfully!' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const updateUserAnswer = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "File required" });
        const userPaper = await prisma.user_papers.findFirst({ where: { user_id: BigInt(req.user.id), content_id: BigInt(req.body.contentId) } });
        
        if (userPaper && userPaper.userAnswer) {
            const oldPath = path.join(__dirname, '../public/userAnswers/', userPaper.userAnswer);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }

        await prisma.user_papers.update({ where: { id: userPaper.id }, data: { userAnswer: req.file.filename } });
        return res.status(200).json({ message: 'Answer Updated Successfully!' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// --- 6. Fetch Zoom Cloud Recording ---
const getDownloadRecording = async (req, res) => {
    try {
        const encodedMeetingId = encodeURIComponent(encodeURIComponent(req.params.meetingId));
        const tokenResponse = await fetch("https://zoom.us/oauth/token", {
            method: 'POST',
            headers: { 'Authorization': `Basic ${Buffer.from(process.env.ZOOM_CLIENT_ID + ':' + process.env.ZOOM_CLIENT_SECRET).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ 'grant_type': 'account_credentials', 'account_id': process.env.ZOOM_ACCOUNT_ID })
        });

        if (!tokenResponse.ok) return res.status(401).json({ message: 'Zoom auth failed' });
        const accessToken = (await tokenResponse.json()).access_token;

        const recordingResponse = await fetch(`https://api.zoom.us/v2/meetings/${encodedMeetingId}/recordings`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        if (!recordingResponse.ok) return res.status(404).json({ message: 'Zoom recording not found' });

        const recordings = await recordingResponse.json();
        let downloadUrl = "";
        for (const file of recordings.recording_files) {
            if (file.file_type === 'MP4') { downloadUrl = `${file.download_url}?access_token=${accessToken}`; break; }
        }

        if (!downloadUrl) return res.status(404).json({ message: 'MP4 file not found' });
        return res.status(200).json({ download_url: downloadUrl, file_name: `lesson_${Date.now()}.mp4` });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

module.exports = { index, classRoom, viewModule, viewZoom, viewYoutubeLive, startExam, paperComplete, addUserAnswer, updateUserAnswer, getDownloadRecording };