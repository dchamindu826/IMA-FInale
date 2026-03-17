const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const safeJson = (data) => JSON.parse(JSON.stringify(data, (key, value) => typeof value === 'bigint' ? value.toString() : value));

// --- 1. Home Posts Management ---
const addHomePost = async (req, res) => {
    try {
        const { caption } = req.body;
        if (!req.file) return res.status(400).json({ message: "Banner image is required" });

        const imageName = req.file.filename;

        await prisma.home_posts.create({
            data: {
                caption,
                image: imageName,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        return res.status(200).json({ message: 'Successfully Added!' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const updateHomePost = async (req, res) => {
    try {
        const { editPostId, editCaption } = req.body;
        const post = await prisma.home_posts.findUnique({ where: { id: BigInt(editPostId) } });

        let imageName = post.image;
        if (req.file) {
            if (post.image) {
                const oldImagePath = path.join(__dirname, '../public/posts/', post.image);
                if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
            }
            imageName = req.file.filename;
        }

        await prisma.home_posts.update({
            where: { id: BigInt(editPostId) },
            data: { caption: editCaption, image: imageName, updated_at: new Date() }
        });

        return res.status(200).json({ message: 'Successfully Updated!' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const deleteHomePost = async (req, res) => {
    try {
        const { postId } = req.body;
        const post = await prisma.home_posts.findUnique({ where: { id: BigInt(postId) } });

        if (post && post.image) {
            const oldImagePath = path.join(__dirname, '../public/posts/', post.image);
            if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
        }

        await prisma.home_posts.delete({ where: { id: BigInt(postId) } });
        return res.status(200).json({ message: 'Successfully Deleted!' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// --- 2. Slides Management ---
const addNewSlide = async (req, res) => {
    try {
        const { title, title2, description } = req.body;
        if (!req.file) return res.status(400).json({ message: "Image is required" });

        await prisma.slides.create({
            data: {
                title1: title,
                title2: title2,
                description,
                image: req.file.filename,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        return res.status(200).json({ message: 'Submitted Successfully!' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const updateSlide = async (req, res) => {
    try {
        const { slide_id, title, title2, description } = req.body;
        const slide = await prisma.slides.findUnique({ where: { id: BigInt(slide_id) } });

        let imageName = slide.image;
        if (req.file) {
            if (slide.image) {
                const oldImagePath = path.join(__dirname, '../public/posts/', slide.image);
                if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
            }
            imageName = req.file.filename;
        }

        await prisma.slides.update({
            where: { id: BigInt(slide_id) },
            data: { title1: title, title2: title2, description, image: imageName, updated_at: new Date() }
        });

        return res.status(200).json({ message: 'Updated Successfully!' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const deleteSlide = async (req, res) => {
    try {
        const { slide_id } = req.body;
        const slide = await prisma.slides.findUnique({ where: { id: BigInt(slide_id) } });

        if (slide && slide.image) {
            const oldImagePath = path.join(__dirname, '../public/posts/', slide.image);
            if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
        }

        await prisma.slides.delete({ where: { id: BigInt(slide_id) } });
        return res.status(200).json({ message: 'Deleted Successfully!' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// --- 3. Testimonials Management ---
const addNewTestimonial = async (req, res) => {
    try {
        const { name, position, rating, description } = req.body;
        if (!req.file) return res.status(400).json({ message: "Image is required" });

        await prisma.testimonials.create({
            data: {
                name, position, rating: parseInt(rating), description, image: req.file.filename,
                created_at: new Date(), updated_at: new Date()
            }
        });

        return res.status(200).json({ message: 'Submitted Successfully!' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const updateTestimonial = async (req, res) => {
    try {
        const { testimonial_id, name, position, rating, description } = req.body;
        const testimonial = await prisma.testimonials.findUnique({ where: { id: BigInt(testimonial_id) } });

        let imageName = testimonial.image;
        if (req.file) {
            if (testimonial.image) {
                const oldImagePath = path.join(__dirname, '../public/userImages/', testimonial.image);
                if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
            }
            imageName = req.file.filename;
        }

        await prisma.testimonials.update({
            where: { id: BigInt(testimonial_id) },
            data: { name, position, rating: parseInt(rating), description, image: imageName, updated_at: new Date() }
        });

        return res.status(200).json({ message: 'Updated Successfully!' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const deleteTestimonial = async (req, res) => {
    try {
        const { testimonial_id } = req.body;
        const testimonial = await prisma.testimonials.findUnique({ where: { id: BigInt(testimonial_id) } });

        if (testimonial && testimonial.image) {
            const oldImagePath = path.join(__dirname, '../public/userImages/', testimonial.image);
            if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
        }

        await prisma.testimonials.delete({ where: { id: BigInt(testimonial_id) } });
        return res.status(200).json({ message: 'Deleted Successfully!' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// --- 4. System Settings (Home Page Text Updates) ---
const updateSetting = async (req, res) => {
    try {
        const { name, value } = req.body; // Pass the setting 'name' and 'value' from frontend
        
        // Handle Box Post Image Uploads
        if (name.startsWith('box') && req.file) {
            const setting = await prisma.settings.findFirst({ where: { name: name } });
            if (setting && setting.value) {
                const oldImagePath = path.join(__dirname, '../public/posts/', setting.value);
                if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
            }
            await prisma.settings.updateMany({ where: { name: name }, data: { value: req.file.filename } });
        } else {
            // Handle regular text settings (Section 2, 3, 4, 5 etc.)
            await prisma.settings.updateMany({ where: { name: name }, data: { value: value } });
        }

        return res.status(200).json({ message: 'Submitted Successfully!' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// --- 5. Teacher Info Management ---
const addNewTeacherInfo = async (req, res) => {
    try {
        const { name, subjectName, degree } = req.body;
        if (!req.file) return res.status(400).json({ message: "Teacher Image is required" });

        await prisma.teacher_settings.create({
            data: {
                name, subjectName, degree, image: req.file.filename,
                created_at: new Date(), updated_at: new Date()
            }
        });
        return res.status(200).json({ message: 'Submitted Successfully!' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const updateTeacherInfo = async (req, res) => {
    try {
        const { id, name, subjectName, degree } = req.body;
        const teacher = await prisma.teacher_settings.findUnique({ where: { id: BigInt(id) } });

        let imageName = teacher.image;
        if (req.file) {
            if (teacher.image) {
                const oldImagePath = path.join(__dirname, '../public/posts/', teacher.image);
                if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
            }
            imageName = req.file.filename;
        }

        await prisma.teacher_settings.update({
            where: { id: BigInt(id) },
            data: { name, subjectName, degree, image: imageName, updated_at: new Date() }
        });

        return res.status(200).json({ message: 'Updated Successfully!' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const deleteTeacherInfo = async (req, res) => {
    try {
        const { id } = req.body;
        const teacher = await prisma.teacher_settings.findUnique({ where: { id: BigInt(id) } });

        if (teacher && teacher.image) {
            const oldImagePath = path.join(__dirname, '../public/posts/', teacher.image);
            if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
        }

        await prisma.teacher_settings.delete({ where: { id: BigInt(id) } });
        return res.status(200).json({ message: 'Deleted Successfully!' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// --- 6. API Methods (Business details & Logs) ---
const updateBusinessDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const { manager_id, assistant_manager_id, meta_apis } = req.body;

        const businessData = {};
        if (manager_id) businessData.manager_id = BigInt(manager_id);
        if (assistant_manager_id) businessData.assistant_manager_id = BigInt(assistant_manager_id);
        if (meta_apis) businessData.meta_apis = JSON.stringify(meta_apis);

        const business = await prisma.businesses.update({
            where: { id: BigInt(id) },
            data: businessData
        });

        return res.status(200).json({ message: 'Business updated successfully', business: safeJson(business) });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const getAuditTrail = async (req, res) => {
    try {
        const { user, fromDate, toDate } = req.query;

        const audits = await prisma.audit_trails.findMany({
            where: {
                created_at: {
                    gte: fromDate ? new Date(fromDate) : undefined,
                    lte: toDate ? new Date(toDate + 'T23:59:59') : undefined,
                },
                ...(user && {
                    user: {
                        OR: [{ fName: { contains: user } }, { lName: { contains: user } }]
                    }
                })
            },
            include: { user: true },
            orderBy: { created_at: 'desc' }
        });

        return res.status(200).json(safeJson(audits));
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

module.exports = {
    addHomePost, updateHomePost, deleteHomePost,
    addNewSlide, updateSlide, deleteSlide,
    addNewTestimonial, updateTestimonial, deleteTestimonial,
    updateSetting,
    addNewTeacherInfo, updateTeacherInfo, deleteTeacherInfo,
    updateBusinessDetails, getAuditTrail
};