const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/authMiddleware');

// 🔥 ඔක්කොම එකම තැනින් Import කරනවා 🔥
const { 
    index, addAnnouncement, updateAnnouncement, deleteAnnouncement, addPost,
    getBusinesses, addBusiness, editBusiness, changeBusinessStatus, getBatches, addBatch,
    addGroup, updateGroup, deleteGroup,
    addCourse, updateCourse, changeCourseStatus, deleteCourse,
    addContentGroup, updateContentGroup, deleteContentGroup,
    addClass, addRecording, addDocument, deleteContent, getManagerBatches, getBatchSchedule,
    getCoordinatorOverview, getManagerFullBatches, addContentMassAssign, getCourseContents,
    updateBatch, changeBatchStatus, deleteBatch, getManagerOverview,
    getBusinessCrm, saveBusinessCrm, uploadCrmMedia, getKnowledgeBase, addKnowledgeBase, deleteKnowledgeBase
} = require('../controllers/adminController');

const { addPaper, addStructuredPaper, addMarkingAnswer } = require('../controllers/paperController');
const { getStaff, addStaff, viewStaff, addTeacherPaymentInfo, viewStudent, deleteStaff, assignBusinessManager, updateStaff } = require('../controllers/staffStudentController');
const { addTuteStock, updateTuteStock, updateLeadsData, updateCoordinationDelivery, updateDelivery } = require('../controllers/deliveryController');
const { addOtherCourse, updateOtherCourse, deleteOtherCourse, addBatchOtherCourse, updateOtherCourseTeacher } = require('../controllers/otherCourseController');
const { 
    addHomePost, updateHomePost, deleteHomePost,
    addNewSlide, updateSlide, deleteSlide,
    addNewTestimonial, updateTestimonial, deleteTestimonial,
    updateSetting,
    addNewTeacherInfo, updateTeacherInfo, deleteTeacherInfo,
    updateBusinessDetails, getAuditTrail 
} = require('../controllers/settingsController');
const { addNewLead } = require('../controllers/commonController');

// --- Multer Configs ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../public/posts')),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const uploadPost = multer({ storage: storage });

const iconStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../public/icons')),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const uploadIcon = multer({ storage: iconStorage });

const docStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../public/documents')),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const uploadDoc = multer({ storage: docStorage });

const answerStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../public/userAnswers')),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const uploadAnswer = multer({ storage: answerStorage });

const userImgStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../public/userImages')),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const uploadUserImg = multer({ storage: userImgStorage });




// --- ROUTES ---


router.get('/dashboard', protect, index);
router.post('/announcement/add', protect, addAnnouncement);
router.put('/announcement/update', protect, updateAnnouncement);
router.delete('/announcement/delete', protect, deleteAnnouncement);
router.post('/post/add', protect, uploadPost.single('banner'), addPost);

router.get('/businesses', protect, getBusinesses);
router.post('/business/add', protect, uploadIcon.single('logo'), addBusiness);
router.put('/business/update', protect, uploadIcon.single('logo'), editBusiness);
router.put('/business/status', protect, changeBusinessStatus);
// 🔥 Business Assign Route එක
router.put('/businesses/:id/assign', protect, assignBusinessManager); 

router.get('/batches/:businessId', protect, getBatches);
router.post('/batch/add', protect, uploadIcon.single('logo'), addBatch);

router.post('/group/add', protect, addGroup);
router.put('/group/update', protect, updateGroup);
router.delete('/group/delete', protect, deleteGroup);

router.post('/course/add', protect, addCourse);
router.put('/course/update', protect, updateCourse);
router.put('/course/status', protect, changeCourseStatus);
router.delete('/course/delete', protect, deleteCourse);

router.post('/content-group/add', protect, addContentGroup);
router.put('/content-group/update', protect, updateContentGroup);
router.delete('/content-group/delete', protect, deleteContentGroup);

router.post('/class/add', protect, addClass);
router.post('/recording/add', protect, addRecording);
router.post('/document/add', protect, uploadDoc.single('file'), addDocument);
router.delete('/content/delete', protect, deleteContent);

router.post('/paper/add', protect, uploadDoc.single('paperFile'), addPaper);
router.post('/structured-paper/add', protect, uploadDoc.single('file'), addStructuredPaper);
router.post('/marking/add', protect, uploadAnswer.single('file'), addMarkingAnswer);

// 🔥 Staff Routes ටික 🔥
router.get('/staff', protect, getStaff);
router.post('/staff/add', protect, uploadUserImg.single('profileImg'), addStaff);
router.delete('/staff/:id', protect, deleteStaff); // මකන Route එක
router.get('/staff/view/:id', protect, viewStaff);

router.post('/teacher-payment/add', protect, addTeacherPaymentInfo);
router.get('/student/view/:id', protect, viewStudent);

router.post('/tute-stock/add', protect, addTuteStock);
router.put('/tute-stock/update', protect, updateTuteStock);
router.put('/lead/update', protect, updateLeadsData);
router.post('/coordination/update', protect, updateCoordinationDelivery);
router.post('/delivery/update', protect, updateDelivery);

router.post('/other-course/add', protect, addOtherCourse);
router.put('/other-course/update', protect, updateOtherCourse);
router.delete('/other-course/delete', protect, deleteOtherCourse);
router.post('/other-course/batch/add', protect, addBatchOtherCourse);
router.put('/other-course/teacher/update', protect, updateOtherCourseTeacher);

router.post('/home-post/add', protect, uploadPost.single('banner'), addHomePost);
router.put('/home-post/update', protect, uploadPost.single('editImage'), updateHomePost);
router.delete('/home-post/delete', protect, deleteHomePost);

router.post('/slide/add', protect, uploadPost.single('image'), addNewSlide);
router.put('/slide/update', protect, uploadPost.single('image'), updateSlide);
router.delete('/slide/delete', protect, deleteSlide);

router.post('/testimonial/add', protect, uploadUserImg.single('image'), addNewTestimonial);
router.put('/testimonial/update', protect, uploadUserImg.single('image'), updateTestimonial);
router.delete('/testimonial/delete', protect, deleteTestimonial);

router.put('/setting/update', protect, uploadPost.single('postImage'), updateSetting);

router.post('/teacher-info/add', protect, uploadPost.single('teacherImage'), addNewTeacherInfo);
router.put('/teacher-info/update', protect, uploadPost.single('teacherImage'), updateTeacherInfo);
router.delete('/teacher-info/delete', protect, deleteTeacherInfo);

router.put('/business-api/update/:id', protect, updateBusinessDetails);
router.get('/audit-trail', protect, getAuditTrail);

router.post('/lead/add', protect, addNewLead);
router.put('/staff/update/:id', protect, updateStaff);

//mangers dashboard
router.get('/manager/overview', protect, getManagerOverview);
router.get('/manager/batches', protect, getManagerBatches);
router.get('/manager/schedule', protect, getBatchSchedule);

router.get('/coordinator/overview', protect, getCoordinatorOverview);
router.get('/manager/batches-full', protect, getManagerFullBatches);
router.post('/manager/contents/mass-assign', protect, uploadDoc.single('file'), addContentMassAssign);

router.get('/manager/get-contents', protect, getCourseContents);
router.put('/batch/update', protect, uploadIcon.single('logo'), updateBatch);
router.put('/batch/status', protect, changeBatchStatus);
router.delete('/batch/delete', protect, deleteBatch);

router.get('/overview', protect, getManagerOverview);

// CRM Routes (මේ ටික ෆයිල් එකේ අගට දාන්න)
router.get('/business/:businessId/crm', protect, getBusinessCrm);
router.post('/business/crm/save', protect, saveBusinessCrm);

// Media & Knowledge Base Uploads (දැනට documents folder එකම පාවිච්චි කරනවා)
router.post('/business/crm/media', protect, uploadDoc.single('file'), uploadCrmMedia);
router.get('/business/crm/knowledge-base', protect, getKnowledgeBase);
router.post('/business/crm/knowledge-base', protect, uploadDoc.single('file'), addKnowledgeBase);
router.delete('/business/crm/knowledge-base/:docId', protect, deleteKnowledgeBase);

module.exports = router;