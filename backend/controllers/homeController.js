const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

const prisma = new PrismaClient();
const safeJson = (data) => JSON.parse(JSON.stringify(data, (key, value) => typeof value === 'bigint' ? value.toString() : value));

const init = async (req, res) => {
    try {
        const homePosts = await prisma.home_posts.findMany({ orderBy: { id: 'desc' } });
        const businesses = await prisma.businesses.findMany({
            where: { status: 1 },
            include: {
                batches: { where: { status: 1 }, orderBy: { itemOrder: 'asc' }, include: { groups: { where: { status: 1 }, orderBy: { itemOrder: 'asc' }, include: { courses: { where: { status: 1 }, orderBy: { itemOrder: 'asc' } } } } } }
            }
        });
        const slides = await prisma.slides.findMany();
        const testimonials = await prisma.testimonials.findMany();

        return res.status(200).json(safeJson({ homePosts, businesses, slides, testimonials }));
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const sendContact = async (req, res) => {
    try {
        const { name, email, message } = req.body;
        
        // Nodemailer Transport Setup (Replace with your actual SMTP details)
        const transporter = nodemailer.createTransport({
            host: process.env.MAIL_HOST,
            port: process.env.MAIL_PORT,
            secure: true,
            auth: { user: process.env.MAIL_USERNAME, pass: process.env.MAIL_PASSWORD }
        });

        await transporter.sendMail({
            from: process.env.MAIL_FROM_ADDRESS,
            to: "imaonlinelk@gmail.com",
            subject: `New Contact Request from ${name}`,
            text: `Name: ${name}\nEmail: ${email}\nMessage:\n${message}`
        });

        return res.status(200).json({ message: 'Contact Request Sent Successfully. We will get back to you soon!' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const start = async (req, res) => {
    try {
        const user = req.user;

        const businesses = await prisma.businesses.findMany({
            where: { status: 1 },
            include: { batches: { where: { status: 1 }, orderBy: { itemOrder: 'asc' }, include: { groups: { where: { status: 1 }, orderBy: { itemOrder: 'asc' }, include: { courses: { where: { status: 1 }, orderBy: { itemOrder: 'asc' } } } } } } }
        });

        const courseUsers = await prisma.course_user.findMany({ where: { user_id: BigInt(user.id) }, include: { course: { include: { group: { include: { batch: true } } } } } });
        const registeredCourseIds = courseUsers.map(cu => cu.course_id);
        const registeredBusinessIds = [...new Set(courseUsers.map(cu => cu.course.group.batch.business_id))];

        const payments = await prisma.payments.findMany({
            where: { student_id: BigInt(user.id), status: { in: [-1, 1] } },
            select: { course_id: true }
        });

        return res.status(200).json(safeJson({ businesses, registeredCourseIds, registeredBusinessIds, payments: payments.map(p => p.course_id), user }));
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const updateProfile = async (req, res) => {
    try {
        const user = req.user;
        const { fName, lName, houseNo, streetName, village, town, district, description, phone, nic, directPhone } = req.body;

        // Validations can be added here if needed

        const updateData = { fName, lName, phone, nic };
        if (directPhone) updateData.directPhone = directPhone;
        if (houseNo) updateData.houseNo = houseNo;
        if (streetName) updateData.streetName = streetName;
        if (village) updateData.village = village;
        if (town) updateData.town = town;
        if (district) updateData.district = district;
        if (description) updateData.description = description;

        await prisma.users.update({ where: { id: BigInt(user.id) }, data: updateData });

        return res.status(200).json({ message: 'Profile Updated!' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const updateProfilePic = async (req, res) => {
    try {
        const user = req.user;
        if (!req.file) return res.status(400).json({ message: "Profile Image is required" });

        const imageName = req.file.filename;

        if (user.image !== "default.png") {
            const oldPath = path.join(__dirname, '../public/userImages/', user.image);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }

        await prisma.users.update({ where: { id: BigInt(user.id) }, data: { image: imageName } });

        return res.status(200).json({ message: 'Image Updated!' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const deleteProfilePic = async (req, res) => {
    try {
        const user = req.user;
        if (user.image === "default.png") return res.status(200).json({ message: 'You do not have an image' });

        const oldPath = path.join(__dirname, '../public/userImages/', user.image);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);

        await prisma.users.update({ where: { id: BigInt(user.id) }, data: { image: "default.png" } });

        return res.status(200).json({ message: 'Image Deleted' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const updatePassword = async (req, res) => {
    try {
        const user = req.user;
        const { password } = req.body; // Validation for password matching should be done in frontend

        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.users.update({ where: { id: BigInt(user.id) }, data: { password: hashedPassword } });

        return res.status(200).json({ message: 'Password Updated' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

module.exports = { init, sendContact, start, updateProfile, updateProfilePic, deleteProfilePic, updatePassword };