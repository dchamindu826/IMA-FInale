const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

const { 
    createTask, completeTask, requestUnlock, approveUnlock, getMyTasks,
    getDailyTasks, createDailyTask, getScheduleTemplates, createScheduleWithTasks,
    getBatchSchedule, addSubjectTemplate, getPendingApprovals, deleteSubjectTemplate, 
    deleteSchedule, approveStaffTask, rejectStaffTask, addTaskTemplate, 
    deleteTaskTemplate, getStaffList, getBatchStaff, assignStaffToBatch, 
    getCoordinatorOverview, removeStaffFromBatch, assignTaskToExistingSchedule, 
    getTasksForSchedule, deleteAssignedTask,lockTask, managerUnlockTask
} = require('../controllers/taskController');

// --- Multer Configuration for Proof Uploads ---
const proofStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../public/documents')); 
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '_proof_' + path.extname(file.originalname));
    }
});

const uploadProof = multer({ storage: proofStorage });


// ==========================================
// 🔴 STAFF / COORDINATOR ROUTES
// ==========================================
router.get('/my-tasks', protect, getMyTasks);
router.post('/complete', protect, uploadProof.single('file'), completeTask);
router.post('/request-unlock', protect, requestUnlock);
router.get('/coordinator/overview', protect, getCoordinatorOverview);


// ==========================================
// 🔴 MANAGER ROUTES
// ==========================================
router.post('/create', protect, createTask);
router.post('/approve-unlock', protect, approveUnlock);

router.get('/manager/tasks', protect, getDailyTasks);
router.post('/manager/tasks/add', protect, createDailyTask);

// Templates & Subjects
router.get('/manager/templates', protect, getScheduleTemplates);
router.post('/manager/subjects/add', protect, addSubjectTemplate);
router.delete('/manager/subjects/:id', protect, deleteSubjectTemplate);
router.post('/manager/task-templates/add', protect, addTaskTemplate);
router.delete('/manager/task-templates/:id', protect, deleteTaskTemplate);

// Scheduling
router.post('/manager/schedule/add', protect, createScheduleWithTasks);
router.get('/manager/schedule', protect, getBatchSchedule);
router.delete('/manager/schedule/:id', protect, deleteSchedule);
router.post('/manager/schedule/:scheduleId/tasks', protect, assignTaskToExistingSchedule);
router.get('/manager/schedule/:scheduleId/tasks', protect, getTasksForSchedule);
router.delete('/manager/tasks/:taskId', protect, deleteAssignedTask);

// 🔥 Approvals (මේ ටික තමයි මගහැරිලා තිබ්බේ) 🔥
router.get('/manager/approvals', protect, getPendingApprovals);
router.post('/manager/approvals/approve', protect, approveStaffTask);
router.post('/manager/approvals/reject', protect, rejectStaffTask);

// Staff Assignment
router.get('/manager/staff-list', protect, getStaffList);
router.get('/manager/batch-staff/:batchId', protect, getBatchStaff);
router.post('/manager/batch-staff/assign', protect, assignStaffToBatch);
router.delete('/manager/batch-staff/remove/:batchId/:staffId', protect, removeStaffFromBatch);

router.post('/lock', protect, lockTask); // Staff/Coordinator route එකක් විදියට
router.post('/manager/approvals/unlock', protect, managerUnlockTask); // Manager route එකක් විදියට


module.exports = router;