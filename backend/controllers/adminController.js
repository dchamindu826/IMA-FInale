const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { GoogleAuth } = require('google-auth-library');

const prisma = new PrismaClient();

// Helper to convert BigInt to String
const safeJson = (data) => JSON.parse(JSON.stringify(data, (key, value) => typeof value === 'bigint' ? value.toString() : value));

// ==========================================
// 1. DASHBOARDS & OVERVIEWS
// ==========================================

const index = async (req, res) => {
    try {
        const businesses = await prisma.businesses.findMany({ where: { status: 1 } });
        const batches = await prisma.batches.findMany({ where: { status: 1 } });
        const announcements = await prisma.announcements.findMany({ orderBy: { id: 'desc' } });
        const posts = await prisma.posts.findMany({ orderBy: { id: 'desc' } });

        return res.status(200).json(safeJson({
            menu: "AdminHome",
            businesses,
            batches,
            announcements,
            posts
        }));
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const getManagerOverview = async (req, res) => {
    try {
        const userId = req.user.id;

        const business = await prisma.businesses.findFirst({
            where: {
                OR: [
                    { head_manager_id: parseInt(userId) },
                    { ass_manager_id: parseInt(userId) }
                ]
            }
        });

        if (!business) {
            return res.status(200).json({ hasBusiness: false });
        }

        const totalBatches = await prisma.batches.count({
            where: { business_id: business.id }
        });

        const totalStudents = await prisma.users.count({
            where: { role: 'user' }
        });

        const revenueData = [
            { name: 'Batch 01', revenue: 45000 },
            { name: 'Batch 02', revenue: 78000 },
            { name: 'Batch 03', revenue: 32000 }
        ];

        return res.status(200).json({
            hasBusiness: true,
            business: {
                id: business.id.toString(),
                name: business.name,
                logo: business.logo,
                category: business.category,
                streams: business.streams // Ensures streams are included
            },
            stats: {
                totalBatches: totalBatches,
                totalStudents: totalStudents + 120,
                totalRevenue: 155000 
            },
            revenueData: revenueData
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server Error" });
    }
};

const getCoordinatorOverview = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const user = await prisma.users.findUnique({ where: { id: parseInt(userId) } });
        if (!user || !user.batch_id) return res.status(404).json({ message: "No batch assigned" });

        const batch = await prisma.batches.findUnique({ where: { id: user.batch_id } });
        const business = batch ? await prisma.businesses.findUnique({ where: { id: batch.business_id } }) : null;

        const groups = await prisma.groups.findMany({ where: { batch_id: user.batch_id } });

        const today = new Date().toISOString().split('T')[0];
        const todayClasses = await prisma.class_schedules.findMany({
            where: { batch_id: user.batch_id, date: new Date(today) }
        });

        const myTasks = await prisma.daily_tasks.findMany({
            where: { staff_id: parseInt(userId), is_completed: false }
        });

        return res.status(200).json(safeJson({
            user,
            business,
            batch,
            groups,
            todayClasses,
            pendingTasksCount: myTasks.length
        }));

    } catch (error) {
        console.error("Coordinator Overview Error:", error);
        return res.status(500).json({ message: "Server Error" });
    }
};

// ==========================================
// 2. ANNOUNCEMENTS, POSTS & NOTIFICATIONS
// ==========================================

const sendFCMNotification = async (title, body, imageUrl, batch_id) => {
    try {
        const keyPath = path.join(__dirname, '../public/firebase_credentials.json'); 
        
        if (!fs.existsSync(keyPath)) {
            console.error("Firebase Credentials file not found at: ", keyPath);
            return;
        }

        const auth = new GoogleAuth({
            keyFile: keyPath,
            scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
        });

        const client = await auth.getClient();
        const accessToken = await client.getAccessToken();

        const projectId = 'ima-campus'; 

        const payload = {
            message: {
                topic: 'ima_updates',
                notification: {
                    title: title,
                    body: body,
                },
                android: {
                    notification: {
                        image: imageUrl,
                        channel_id: 'default'
                    }
                },
                apns: {
                    payload: {
                        aps: {
                            sound: 'default',
                            badge: 1,
                            'mutable-content': 1
                        }
                    },
                    fcm_options: {
                        image: imageUrl
                    }
                },
                data: {
                    screen: 'Home',
                    click_action: 'FLUTTER_NOTIFICATION_CLICK',
                    image_url: imageUrl || '',
                    batch_id: batch_id ? batch_id.toString() : 'all'
                }
            }
        };

        const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) {
            console.error("FCM Send Error: ", data);
        } else {
            console.log("FCM Notification Sent Successfully", data);
        }
    } catch (error) {
        console.error("FCM Exception: ", error);
    }
};

const addAnnouncement = async (req, res) => {
    try {
        const { heading, message, batch, business } = req.body;
        const userId = req.user.id;

        const announcement = await prisma.announcements.create({
            data: {
                heading,
                message,
                batch_id: batch ? BigInt(batch) : null,
                business_id: business ? BigInt(business) : null,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        await prisma.audit_trails.create({
            data: {
                user_id: BigInt(userId),
                action: 'Add Announcement',
                description: 'Announcement Added ' + heading,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        return res.status(200).json({ message: 'Successfully Added!', announcement: safeJson(announcement) });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const updateAnnouncement = async (req, res) => {
    try {
        const { editAnnId, editHeading, editMessage, batch, business } = req.body;
        const userId = req.user.id;

        const announcement = await prisma.announcements.update({
            where: { id: BigInt(editAnnId) },
            data: {
                heading: editHeading,
                message: editMessage,
                batch_id: batch ? BigInt(batch) : null,
                business_id: business ? BigInt(business) : null,
                updated_at: new Date()
            }
        });

        await prisma.audit_trails.create({
            data: {
                user_id: BigInt(userId),
                action: 'Edit Announcement',
                description: 'Announcement Edited ' + editHeading,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        return res.status(200).json({ message: 'Successfully Updated!', announcement: safeJson(announcement) });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const deleteAnnouncement = async (req, res) => {
    try {
        const { announcementId } = req.body;
        const userId = req.user.id;

        const announcement = await prisma.announcements.findUnique({ where: { id: BigInt(announcementId) } });

        if (!announcement) {
             return res.status(404).json({ message: "Announcement not found" });
        }

        await prisma.audit_trails.create({
            data: {
                user_id: BigInt(userId),
                action: 'Delete Announcement',
                description: 'Announcement Deleted ' + announcement.heading,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        await prisma.announcements.delete({ where: { id: BigInt(announcementId) } });

        return res.status(200).json({ message: 'Successfully Deleted!' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const addPost = async (req, res) => {
    try {
        const { title, caption, batch, business } = req.body;
        const userId = req.user.id;

        if (!req.file) {
            return res.status(400).json({ message: "Banner image is required" });
        }
        
        const imageName = req.file.filename;

        const post = await prisma.posts.create({
            data: {
                title,
                caption,
                image: imageName,
                batch_id: batch ? BigInt(batch) : null,
                business_id: business ? BigInt(business) : null,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        await prisma.audit_trails.create({
            data: {
                user_id: BigInt(userId),
                action: 'Add Post',
                description: 'Post Added ' + caption,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        if (req.body.sendToMobile) {
            const imageUrl = imageName ? `https://test.imacampus.lk/posts/${imageName}` : null; 
            await sendFCMNotification(post.title, post.caption, imageUrl, post.batch_id);
        }

        return res.status(200).json({ message: 'Successfully Added!', post: safeJson(post) });

    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// ==========================================
// 3. BUSINESS MANAGEMENT
// ==========================================

const getBusinesses = async (req, res) => {
    try {
        const user = req.user;
        let businesses;

        if (user.role === "teacher") {
            const courseUsers = await prisma.course_user.findMany({ where: { user_id: BigInt(user.id) } });
            const courseIds = courseUsers.map(cu => cu.course_id);
            const courses = await prisma.courses.findMany({ where: { id: { in: courseIds } } });
            const groupIds = [...new Set(courses.map(c => c.group_id))];
            const groups = await prisma.groups.findMany({ where: { id: { in: groupIds } } });
            const batchIds = [...new Set(groups.map(g => g.batch_id))];
            const batches = await prisma.batches.findMany({ where: { id: { in: batchIds } } });
            const businessIds = [...new Set(batches.map(b => b.business_id))];
            businesses = await prisma.businesses.findMany({ where: { id: { in: businessIds } } });
            
        } else if (user.role === "superadmin") {
            businesses = await prisma.businesses.findMany();
            
        } else {
            businesses = await prisma.businesses.findMany({
                where: {
                    OR: [
                        { head_manager_id: parseInt(user.id) },
                        { ass_manager_id: parseInt(user.id) }
                    ]
                }
            });
        }

        return res.status(200).json(safeJson({ businesses }));
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const addBusiness = async (req, res) => {
    try {
        const { name, description, businessType, medium, min_course_count, discount_amount, isDiscountEnabledForInstallments, isDeliveryAndCoordinationEnabled, streams } = req.body;
        const userId = req.user.id;

        let imageName = '';
        if (req.file) {
            imageName = req.file.filename;
        }

        const business = await prisma.businesses.create({
            data: {
                name,
                description,
                category: businessType,
                streams: businessType === 'AL' ? streams : null,
                isEnglish: medium === 'true' || medium === '1',
                logo: imageName,
                minCourseCount: businessType === 'OL' ? parseInt(min_course_count) : null,
                discountAmount: businessType === 'OL' ? parseFloat(discount_amount) : null,
                isDiscountEnabledForInstallments: isDiscountEnabledForInstallments ? true : false,
                isDeliveriesEnabled: isDeliveryAndCoordinationEnabled ? true : false,
                status: 1,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        await prisma.audit_trails.create({
            data: {
                user_id: BigInt(userId),
                action: 'Add Business',
                description: 'New Business Added ' + name,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        return res.status(200).json({ message: 'Successfully Added!', business: safeJson(business) });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const editBusiness = async (req, res) => {
    try {
        const { businessId, name, description, businessType, medium, min_course_count, discount_amount, isDiscountEnabledForInstallments, isDeliveryAndCoordinationEnabled, streams } = req.body;
        const userId = req.user.id;

        const businessData = {
            name,
            description,
            category: businessType,
            streams: businessType === 'AL' ? streams : null,
            isEnglish: medium === 'true' || medium === '1',
            minCourseCount: businessType === 'OL' ? parseInt(min_course_count) : null,
            discountAmount: businessType === 'OL' ? parseFloat(discount_amount) : null,
            isDiscountEnabledForInstallments: isDiscountEnabledForInstallments ? true : false,
            isDeliveriesEnabled: isDeliveryAndCoordinationEnabled ? true : false,
            updated_at: new Date()
        };

        if (req.file) {
            businessData.logo = req.file.filename;
            
            const oldBusiness = await prisma.businesses.findUnique({ where: { id: BigInt(businessId) } });
            if (oldBusiness && oldBusiness.logo) {
                const oldImagePath = path.join(__dirname, '../public/icons/', oldBusiness.logo);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
        }

        const business = await prisma.businesses.update({
            where: { id: BigInt(businessId) },
            data: businessData
        });

        await prisma.audit_trails.create({
            data: {
                user_id: BigInt(userId),
                action: 'Edit Business',
                description: 'Business Edited ' + name,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        return res.status(200).json({ message: 'Successfully Updated!', business: safeJson(business) });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const changeBusinessStatus = async (req, res) => {
    try {
        const { business_id, status } = req.body; 
        const userId = req.user.id;

        const business = await prisma.businesses.update({
            where: { id: BigInt(business_id) },
            data: { status: parseInt(status) }
        });

        const actionText = status == 1 ? 'Activated Business' : 'Deactivate Business';
        
        await prisma.audit_trails.create({
            data: {
                user_id: BigInt(userId),
                action: actionText,
                description: `Business ${status == 1 ? 'Activated' : 'Deactivated'} ` + business.name,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        return res.status(200).json({ message: `Successfully ${status == 1 ? 'Enabled' : 'Disabled'}!` });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// ==========================================
// 4. BATCHES MANAGEMENT
// ==========================================

const getBatches = async (req, res) => {
    try {
        const { businessId } = req.params;
        const batches = await prisma.batches.findMany({ 
            where: { business_id: BigInt(businessId) },
            orderBy: { itemOrder: 'asc' } 
        });
        return res.status(200).json(safeJson({ batches }));
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const getManagerBatches = async (req, res) => {
    try {
        const userId = req.user.id;
        const business = await prisma.businesses.findFirst({
            where: { OR: [{ head_manager_id: parseInt(userId) }, { ass_manager_id: parseInt(userId) }] }
        });

        if (!business) return res.status(200).json([]);

        const batches = await prisma.batches.findMany({
            where: { business_id: business.id },
            select: { id: true, name: true, status: true }
        });
        
        const formattedBatches = batches.map(b => ({
            id: b.id.toString(), 
            name: b.name, 
            status: b.status
        }));

        return res.status(200).json(formattedBatches);
    } catch (error) {
        console.error("Batches Fetch Error:", error);
        return res.status(500).json({ message: "Server Error" });
    }
};

const getManagerFullBatches = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const business = await prisma.businesses.findFirst({
            where: { OR: [{ head_manager_id: parseInt(userId) }, { ass_manager_id: parseInt(userId) }] }
        });

        if (!business) return res.status(200).json([]);

        const batches = await prisma.batches.findMany({
            where: { business_id: business.id }
        });

        if (batches.length === 0) return res.status(200).json([]);

        const batchIds = batches.map(b => b.id);

        const groups = await prisma.groups.findMany({
            where: { batch_id: { in: batchIds } }
        });

        const groupIds = groups.map(g => g.id);

        const courses = await prisma.courses.findMany({
            where: { group_id: { in: groupIds } }
        });

        const formattedBatches = batches.map(batch => {
            const batchGroups = groups.filter(g => g.batch_id.toString() === batch.id.toString()).map(group => {
                const groupCourses = courses.filter(c => c.group_id.toString() === group.id.toString());
                return { ...group, courses: groupCourses };
            });
            return { ...batch, groups: batchGroups };
        });

        return res.status(200).json(safeJson(formattedBatches));
        
    } catch (e) { 
        console.error("Batches Fetch Error:", e);
        return res.status(500).json({ message: "Server Error: " + e.message }); 
    }
};

const addBatch = async (req, res) => {
    try {
        const { name, description, business_id, batchType, itemOrder, streams } = req.body;
        const userId = req.user.id;

        let imageName = '';
        if (req.file) { 
            imageName = req.file.filename;
        }

        const batch = await prisma.batches.create({
            data: {
                name,
                description,
                business_id: BigInt(business_id),
                type: parseInt(batchType),
                itemOrder: itemOrder ? parseInt(itemOrder) : 1,
                logo: imageName,
                streams: streams || null, 
                status: 1,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        await prisma.audit_trails.create({
            data: {
                user_id: BigInt(userId),
                action: 'Add Batch',
                description: 'New Batch Added ' + name,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        return res.status(200).json({ message: 'Successfully Added!', batch: safeJson(batch) });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const updateBatch = async (req, res) => {
    try {
        const { batch_id, name, description, batchType, itemOrder, streams } = req.body;
        const data = { 
            name, 
            description, 
            type: parseInt(batchType), 
            streams: streams || null,
            itemOrder: itemOrder ? parseInt(itemOrder) : 1, 
            updated_at: new Date() 
        };
        if (req.file) data.logo = req.file.filename;

        await prisma.batches.update({ where: { id: BigInt(batch_id) }, data });
        return res.status(200).json({ message: 'Batch Updated!' });
    } catch (e) { return res.status(500).json({ message: e.message }); }
};

const changeBatchStatus = async (req, res) => {
    try {
        const { batch_id, status } = req.body;
        await prisma.batches.update({ where: { id: BigInt(batch_id) }, data: { status: parseInt(status) } });
        return res.status(200).json({ message: 'Status Updated!' });
    } catch (e) { return res.status(500).json({ message: e.message }); }
};

const deleteBatch = async (req, res) => {
    try {
        const { batch_id } = req.body;
        await prisma.batches.delete({ where: { id: BigInt(batch_id) } });
        return res.status(200).json({ message: 'Batch Deleted!' });
    } catch (e) { return res.status(500).json({ message: e.message }); }
};

// ==========================================
// 5. PAYMENT GROUPS
// ==========================================

const addGroup = async (req, res) => {
    try {
        const { gName, pType, batch_id, itemOrder, discountRules } = req.body;
        const userId = req.user.id;

        const rulesString = discountRules && discountRules.length > 0 ? JSON.stringify(discountRules) : null;

        const group = await prisma.groups.create({
            data: {
                name: gName,
                type: parseInt(pType),
                batch_id: BigInt(batch_id),
                itemOrder: itemOrder ? parseInt(itemOrder) : 1,
                discount_rules: rulesString,
                status: 1,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        await prisma.audit_trails.create({
            data: {
                user_id: BigInt(userId),
                action: 'Add Group',
                description: 'New Group Added ' + gName,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        return res.status(200).json({ message: 'Successfully Added!' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const updateGroup = async (req, res) => {
    try {
        const { group_id, gName, pType, itemOrder, discountRules } = req.body;
        const rulesString = discountRules && discountRules.length > 0 ? JSON.stringify(discountRules) : null;

        await prisma.groups.update({
            where: { id: BigInt(group_id) },
            data: {
                name: gName,
                type: parseInt(pType),
                itemOrder: itemOrder ? parseInt(itemOrder) : 1,
                discount_rules: rulesString,
                updated_at: new Date()
            }
        });

        return res.status(200).json({ message: 'Successfully Updated!' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const deleteGroup = async (req, res) => {
    try {
        const { group_id } = req.body;
        const userId = req.user.id;

        const group = await prisma.groups.findUnique({ where: { id: BigInt(group_id) } });
        if(!group) return res.status(404).json({ message: "Group not found" });

        const courses = await prisma.courses.findMany({ where: { group_id: BigInt(group_id) } });
        const courseIds = courses.map(c => c.id);

        if (courseIds.length > 0) {
            await prisma.payments.deleteMany({ where: { course_id: { in: courseIds } } });
            await prisma.course_user.deleteMany({ where: { course_id: { in: courseIds } } });
            await prisma.content_course.deleteMany({ where: { course_id: { in: courseIds } } });
            await prisma.courses.deleteMany({ where: { group_id: BigInt(group_id) } });
        }

        const options = await prisma.installment_options.findMany({ where: { group_id: BigInt(group_id) } });
        const optionIds = options.map(opt => opt.id);
        
        if (optionIds.length > 0) {
            await prisma.installment_amounts.deleteMany({ where: { installment_option_id: { in: optionIds } } });
            await prisma.installment_options.deleteMany({ where: { group_id: BigInt(group_id) } });
        }

        await prisma.audit_trails.create({
            data: {
                user_id: BigInt(userId),
                action: 'Delete Group',
                description: 'Group Deleted ' + group.name,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        await prisma.groups.delete({ where: { id: BigInt(group_id) } });

        return res.status(200).json({ message: 'Successfully Deleted!' });
    } catch(error) {
        return res.status(500).json({ message: error.message });
    }
};

// ==========================================
// 6. COURSES (SUBJECTS)
// ==========================================

const addCourse = async (req, res) => {
    try {
        const { name, description, courseType, code, stream, itemOrder, groupPrices } = req.body;
        const userId = req.user.id;

        const prices = JSON.parse(groupPrices);

        if (!prices || prices.length === 0) return res.status(400).json({ message: "No groups selected" });

        const createdCourses = [];

        for (let item of prices) {
            let finalItemOrder = itemOrder ? parseInt(itemOrder) : null;

            if (!finalItemOrder) {
                const lastCourse = await prisma.courses.findFirst({
                    where: { group_id: BigInt(item.groupId) },
                    orderBy: { itemOrder: 'desc' }
                });
                finalItemOrder = lastCourse && lastCourse.itemOrder ? (lastCourse.itemOrder + 1) : 1;
            }

            const course = await prisma.courses.create({
                data: {
                    group_id: BigInt(item.groupId),
                    name,
                    description,
                    type: parseInt(courseType) || 1, // Fallback
                    code,
                    stream: stream || null,
                    itemOrder: finalItemOrder,
                    price: parseFloat(item.price || 0),
                    status: 1,
                    created_at: new Date(),
                    updated_at: new Date()
                }
            });
            createdCourses.push(course);
        }

        await prisma.audit_trails.create({
            data: {
                user_id: BigInt(userId),
                action: 'Add Course',
                description: 'Subject Added to Groups: ' + name,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        return res.status(200).json({ message: 'Successfully Added to Groups!', courses: safeJson(createdCourses) });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const updateCourse = async (req, res) => {
    try {
        const { course_id, name, description, courseType, code, theoryCourse, stream, reqDiscount, itemOrder, price, discountPrice } = req.body;
        
        await prisma.courses.update({
            where: { id: BigInt(course_id) },
            data: {
                name,
                description,
                type: parseInt(courseType) || 1,
                code,
                stream: stream || null,
                itemOrder: itemOrder ? parseInt(itemOrder) : undefined,
                price: parseFloat(price || 0),
                updated_at: new Date()
            }
        });

        return res.status(200).json({ message: 'Successfully Updated!' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const changeCourseStatus = async (req, res) => {
    try {
        const { course_id, status } = req.body;
        const userId = req.user.id;

        const course = await prisma.courses.update({
            where: { id: BigInt(course_id) },
            data: { status: parseInt(status) }
        });

        const actionText = status == 1 ? 'Activate Course' : 'Deactivate Course';

        await prisma.audit_trails.create({
            data: {
                user_id: BigInt(userId),
                action: actionText,
                description: `Course ${status == 1 ? 'Activated' : 'Deactivated'} ` + course.name,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        return res.status(200).json({ message: `Successfully ${status == 1 ? 'Enabled' : 'Disabled'}!` });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const deleteCourse = async (req, res) => {
    try {
        const { course_id } = req.body;
        const userId = req.user.id;

        const course = await prisma.courses.findUnique({ where: { id: BigInt(course_id) } });

        await prisma.course_user.deleteMany({ where: { course_id: BigInt(course_id) } });
        await prisma.content_course.deleteMany({ where: { course_id: BigInt(course_id) } });

        await prisma.audit_trails.create({
            data: {
                user_id: BigInt(userId),
                action: 'Delete Course',
                description: 'Course Deleted ' + course.name,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        await prisma.courses.delete({ where: { id: BigInt(course_id) } });

        return res.status(200).json({ message: 'Successfully Deleted!' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// ==========================================
// 7. CONTENT GROUPS (LESSONS FOLDERS)
// ==========================================

const addContentGroup = async (req, res) => {
    try {
        console.log("📥 Backend එකට ආපු Data:", req.body); // <-- මේක Terminal/CMD එකේ බලන්න
        
        const { title, batch_id, course_code, order, type } = req.body;
        
        await prisma.content_groups.create({
            data: {
                title: title,
                batch_id: BigInt(batch_id),
                course_code: course_code,
                type: type ? parseInt(type) : 1, // Type එක අනිවාර්යයි
                itemOrder: order ? parseInt(order) : 1,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        return res.status(200).json({ message: 'Lesson Group Created!' });
    } catch (error) {
        console.error("❌ Backend Error:", error);
        return res.status(500).json({ message: error.message });
    }
};

const updateContentGroup = async (req, res) => {
    try {
        const { contentGroupId, title, order } = req.body;
        const userId = req.user.id;

        const contentGroup = await prisma.content_groups.update({
            where: { id: BigInt(contentGroupId) },
            data: {
                title,
                itemOrder: parseInt(order),
                updated_at: new Date()
            }
        });

        await prisma.audit_trails.create({
            data: {
                user_id: BigInt(userId),
                action: 'Edit Content Group',
                description: 'Content Group Edited ' + title,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        return res.status(200).json({ message: 'Successfully Updated!' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const deleteContentGroup = async (req, res) => {
    try {
        const { contentGroupId } = req.body;
        const userId = req.user.id;

        const contentGroup = await prisma.content_groups.findUnique({ where: { id: BigInt(contentGroupId) } });

        await prisma.contents.updateMany({
            where: { content_group_id: parseInt(contentGroupId) },
            data: { content_group_id: null }
        });

        await prisma.audit_trails.create({
            data: {
                user_id: BigInt(userId),
                action: 'Delete Content Group',
                description: 'Content Group Deleted ' + contentGroup.title,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        await prisma.content_groups.delete({ where: { id: BigInt(contentGroupId) } });

        return res.status(200).json({ message: 'Successfully Deleted!' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const getCourseContents = async (req, res) => {
    try {
        // courseId එකත් අරගන්නවා Content හොයන්න
        const { batchId, courseCode, courseId } = req.query; 
        
        // 1. Folders ටික ගන්නවා
        const lessonGroups = await prisma.content_groups.findMany({
            where: { batch_id: BigInt(batchId), course_code: courseCode },
            orderBy: { itemOrder: 'asc' }
        });

        // 2. අදාල Subject එකට assign කරලා තියෙන Content ටික හොයනවා
        const mappedContents = await prisma.content_course.findMany({
            where: { course_id: BigInt(courseId) }
        });

        const contentIds = mappedContents.map(mc => mc.content_id);

        let contents = [];
        if (contentIds.length > 0) {
            // අදාළ Content වල විස්තර (Title, link, type) Database එකෙන් ගන්නවා
            contents = await prisma.contents.findMany({
                where: { id: { in: contentIds } },
                orderBy: { id: 'desc' } // අලුත්ම ඒවා උඩින් පෙන්වන්න
            });
        }

        // 3. Folders සහ Contents දෙකම React එකට යවනවා
        return res.status(200).json(safeJson({ 
            lessonGroups, 
            contents       // <--- මේක තමයි කලින් මඟහැරිලා තිබුණේ!
        }));
    } catch (e) {
        console.error("Fetch Contents Error:", e);
        return res.status(500).json({ message: "Server Error" });
    }
};
// ==========================================
// 8. CONTENTS (Classes, Recordings, Docs)
// ==========================================

const addClass = async (req, res) => {
    try {
        const { title, date, startTime, endTime, link, isFree, selectedCourses } = req.body;
        const userId = req.user.id;

        const content = await prisma.contents.create({
            data: {
                title,
                date: date ? new Date(date) : null,
                startTime,
                endTime,
                link,
                type: 1, 
                isFree: isFree ? true : false,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        if (selectedCourses && Array.isArray(selectedCourses)) {
            for (let courseId of selectedCourses) {
                const order = await prisma.content_course.findFirst({
                    where: { course_id: BigInt(courseId), type: 1 },
                    orderBy: { itemOrder: 'desc' }
                });
                
                const itemOrder = order ? (parseInt(order.itemOrder) + 1).toString() : "1";

                await prisma.content_course.create({
                    data: {
                        content_id: content.id,
                        course_id: BigInt(courseId),
                        type: 1,
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
                action: 'Add Class',
                description: 'Class Added ' + title,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        return res.status(200).json({ message: 'Class Added Successfully!' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const addRecording = async (req, res) => {
    try {
        const { title, link, zoomMeetingId, date, isFree, selectedCourses } = req.body;
        const userId = req.user.id;

        const content = await prisma.contents.create({
            data: {
                title,
                date: date ? new Date(date) : null,
                link,
                zoomMeetingId,
                type: 2, 
                isFree: isFree ? true : false,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        if (selectedCourses && Array.isArray(selectedCourses)) {
            for (let courseId of selectedCourses) {
                const order = await prisma.content_course.findFirst({
                    where: { course_id: BigInt(courseId), type: 2 },
                    orderBy: { itemOrder: 'desc' }
                });
                
                const itemOrder = order ? (parseInt(order.itemOrder) + 1).toString() : "1";

                await prisma.content_course.create({
                    data: {
                        content_id: content.id,
                        course_id: BigInt(courseId),
                        type: 2,
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
                action: 'Add Recording',
                description: 'Recording Added ' + title,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        return res.status(200).json({ message: 'Recording Added Successfully!' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const addDocument = async (req, res) => {
    try {
        const { title, classMonth, isFree, selectedCourses } = req.body;
        const userId = req.user.id;

        if (!req.file) {
            return res.status(400).json({ message: "Document file is required" });
        }

        const fileName = req.file.filename;

        let formattedDate = null;
        if (classMonth) {
            const d = new Date(classMonth);
            formattedDate = new Date(d.getFullYear(), d.getMonth(), 1);
        }

        const content = await prisma.contents.create({
            data: {
                title,
                fileName,
                type: 3,
                isFree: isFree ? true : false,
                date: formattedDate,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        if (selectedCourses && Array.isArray(selectedCourses)) {
            for (let courseId of selectedCourses) {
                const order = await prisma.content_course.findFirst({
                    where: { course_id: BigInt(courseId), type: 3 },
                    orderBy: { itemOrder: 'desc' }
                });
                
                const itemOrder = order ? (parseInt(order.itemOrder) + 1).toString() : "1";

                await prisma.content_course.create({
                    data: {
                        content_id: content.id,
                        course_id: BigInt(courseId),
                        type: 3,
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
                action: 'Add Document',
                description: 'Document Added ' + title,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        return res.status(200).json({ message: 'Document Added Successfully!' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const addContentMassAssign = async (req, res) => {
    try {
        const { type, title, link, date, startTime, endTime, isFree, selectedCourses, contentGroupId } = req.body;

        let typeInt = 1;
        if (type === 'recording') typeInt = 2;
        else if (type === 'document') typeInt = 3;
        else if (type === 'sPaper') typeInt = 4;
        else if (type === 'paper') typeInt = 5;

        const fileName = req.file ? req.file.filename : null;

        const content = await prisma.contents.create({
            data: {
                title, 
                link: link || null, 
                fileName: fileName,
                type: typeInt, 
                date: date ? new Date(date) : null,
                startTime: startTime || null, 
                endTime: endTime || null, 
                isFree: Boolean(isFree),
                content_group_id: contentGroupId ? parseInt(contentGroupId) : null,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        const coursesArray = typeof selectedCourses === 'string' ? JSON.parse(selectedCourses) : selectedCourses;

        if (coursesArray && coursesArray.length > 0) {
            for (let courseId of coursesArray) {
                const order = await prisma.content_course.findFirst({
                    where: { course_id: BigInt(courseId), type: typeInt },
                    orderBy: { itemOrder: 'desc' }
                });
                
                const itemOrder = order && order.itemOrder ? (parseInt(order.itemOrder) + 1).toString() : "1";

                await prisma.content_course.create({
                    data: {
                        content_id: content.id,
                        course_id: BigInt(courseId),
                        type: typeInt,
                        itemOrder: itemOrder,
                        created_at: new Date(),
                        updated_at: new Date()
                    }
                });
            }
        }

        return res.status(200).json({ message: "Content Successfully Published!" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server Error" });
    }
};

const deleteContent = async (req, res) => {
    try {
        const { content_id } = req.body;
        const userId = req.user.id;

        const content = await prisma.contents.findUnique({ where: { id: BigInt(content_id) } });
        if(!content) return res.status(404).json({ message: "Content not found" });

        if ((content.type === 3 || content.type === 4 || content.type === 5) && content.fileName) {
            const filePath = path.join(__dirname, '../public/documents/', content.fileName);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        await prisma.content_course.deleteMany({ where: { content_id: BigInt(content_id) } });
        
        await prisma.audit_trails.create({
            data: {
                user_id: BigInt(userId),
                action: 'Delete Content',
                description: 'Content Deleted ' + content.title,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        await prisma.contents.delete({ where: { id: BigInt(content_id) } });

        return res.status(200).json({ message: 'Successfully Deleted!' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const getBatchSchedule = async (req, res) => {
    try {
        const { batchId, year, month } = req.query;
        
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const dummySchedules = [
            { id: 1, title: "Theory Live Class", date: `${year}-${String(month).padStart(2, '0')}-10`, startTime: "18:00", endTime: "20:00", type: "Live" },
            { id: 2, title: "Monthly Past Paper", date: `${year}-${String(month).padStart(2, '0')}-15`, startTime: "14:00", endTime: "17:00", type: "Exam" },
            { id: 3, title: "Revision Session", date: `${year}-${String(month).padStart(2, '0')}-28`, startTime: "19:00", endTime: "21:00", type: "Live" }
        ];

        return res.status(200).json(dummySchedules);
    } catch (error) {
        return res.status(500).json({ message: "Server Error" });
    }
};

// ==========================================
// 9. CRM SETTINGS & KNOWLEDGE BASE
// ==========================================

const getBusinessCrm = async (req, res) => {
    try {
        const { businessId } = req.params;
        const campaigns = await prisma.crm_campaigns.findMany({ where: { business_id: BigInt(businessId) } });
        return res.status(200).json(safeJson(campaigns));
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const saveBusinessCrm = async (req, res) => {
    try {
        const { businessId, freeSeminarData, afterSeminarData } = req.body;

        const phases = [
            { phase: "FREE_SEMINAR", data: freeSeminarData },
            { phase: "AFTER_SEMINAR", data: afterSeminarData }
        ];

        for (const item of phases) {
            const existing = await prisma.crm_campaigns.findFirst({
                where: { business_id: BigInt(businessId), phase: item.phase }
            });

            const payload = {
                business_id: BigInt(businessId),
                phase: item.phase,
                meta_phone_id: item.data.meta_phone_id,
                meta_wa_id: item.data.meta_wa_id,
                meta_access_token: item.data.meta_access_token,
                gemini_keys: item.data.gemini_keys,
                is_gemini_active: item.data.is_gemini_active,
                is_auto_reply_active: item.data.is_auto_reply_active
            };

            let campaignId;

            if (existing) {
                await prisma.crm_campaigns.update({ where: { id: existing.id }, data: payload });
                campaignId = existing.id;
                await prisma.auto_replies.deleteMany({ where: { campaign_id: campaignId } });
            } else {
                const newCamp = await prisma.crm_campaigns.create({ data: payload });
                campaignId = newCamp.id;
            }

            if (item.data.auto_replies && item.data.auto_replies.length > 0) {
                const repliesToInsert = item.data.auto_replies.map(r => ({
                    campaign_id: campaignId,
                    sequence_order: parseInt(r.sequence_order),
                    message_text: r.message_text || "",
                    media_url: r.media_url || null,
                    media_type: r.media_type || "text"
                }));
                await prisma.auto_replies.createMany({ data: repliesToInsert });
            }
        }

        return res.status(200).json({ message: "CRM Settings Saved Successfully!" });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};


// ==========================================
// 10. KNOWLEDGE BASE & CRM MEDIA (Missing Functions)
// ==========================================

const uploadCrmMedia = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "No file uploaded" });
        return res.status(200).json({ file_name: req.file.filename });
    } catch (e) { return res.status(500).json({ message: e.message }); }
};

const getKnowledgeBase = async (req, res) => {
    try {
        const { businessId, phase } = req.query;
        const docs = await prisma.crm_documents.findMany({ 
            where: { business_id: BigInt(businessId), phase: phase }, 
            orderBy: { id: 'desc' } 
        });
        return res.status(200).json(safeJson(docs));
    } catch(e) { return res.status(500).json({message: e.message}); }
};

const addKnowledgeBase = async (req, res) => {
    try {
        const { businessId, phase, textContent, originalName } = req.body;
        const doc = await prisma.crm_documents.create({
            data: { 
                business_id: BigInt(businessId), 
                phase: phase, 
                file_name: req.file ? req.file.filename : originalName, 
                content: textContent || "Extracted Content Data...", 
                created_at: new Date() 
            }
        });
        return res.status(200).json({ message: "Ingestion Successful", doc: safeJson(doc) });
    } catch(e) { return res.status(500).json({message: e.message}); }
};

const deleteKnowledgeBase = async (req, res) => {
    try {
        const { docId } = req.params;
        await prisma.crm_documents.delete({ where: { id: parseInt(docId) } });
        return res.status(200).json({ message: "Deleted successfully" });
    } catch(e) { return res.status(500).json({message: e.message}); }
};


// ==========================================
// EXPORTS
// ==========================================

module.exports = {
    index, getManagerOverview, getCoordinatorOverview,
    sendFCMNotification, addAnnouncement, updateAnnouncement, deleteAnnouncement, addPost,
    getBusinesses, addBusiness, editBusiness, changeBusinessStatus,
    getBatches, getManagerBatches, getManagerFullBatches, addBatch, updateBatch, changeBatchStatus, deleteBatch,
    addGroup, updateGroup, deleteGroup,
    addCourse, updateCourse, changeCourseStatus, deleteCourse,
    addContentGroup, updateContentGroup, deleteContentGroup, getCourseContents,
    addClass, addRecording, addDocument, addContentMassAssign, deleteContent, getBatchSchedule,
    getBusinessCrm, saveBusinessCrm, uploadCrmMedia, getKnowledgeBase, addKnowledgeBase, deleteKnowledgeBase
};