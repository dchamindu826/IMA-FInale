const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const safeJson = (data) => JSON.parse(JSON.stringify(data, (key, value) => typeof value === 'bigint' ? value.toString() : value));

// 1. Task එකක් හදනවා (Manager Action)
const createTask = async (req, res) => {
    try {
        const { staff_id, batch_id, task_type, description, start_time, deadline } = req.body;
        
        const newTask = await prisma.daily_tasks.create({
            data: {
                staff_id: parseInt(staff_id),
                batch_id: BigInt(batch_id),
                task_type,
                description,
                start_time: start_time ? new Date(start_time) : null,
                deadline: new Date(deadline),
                unlock_status: 'NONE'
            }
        });

        return res.status(201).json({ message: "Task assigned to staff successfully", task: safeJson(newTask) });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// 2. Task එක Complete කරනවා (Staff Action)
const completeTask = async (req, res) => {
    try {
        const { task_id } = req.body;
        const task = await prisma.daily_tasks.findUnique({ where: { id: parseInt(task_id) } });

        if (!task) return res.status(404).json({ message: "Task not found" });

        const now = new Date();
        
        // Deadline එක පැනලද නැත්නම් කලින්ම Lock වෙලද බලනවා
        if (task.is_locked || now > new Date(task.deadline)) {
            await prisma.daily_tasks.update({
                where: { id: parseInt(task_id) },
                data: { is_locked: true }
            });
            return res.status(403).json({ message: "Task deadline passed. System auto-locked this task. Please request an unlock." });
        }

        // වෙලාවට කලින් කරලා නම් Complete කරනවා
        await prisma.daily_tasks.update({
            where: { id: parseInt(task_id) },
            data: { 
                is_completed: true, 
                completed_at: now 
            }
        });

        return res.status(200).json({ message: "Task completed successfully!" });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// 3. Lock වුණු Task එකක් Unlock කරන්න හේතුවක් එක්ක Request එකක් දානවා (Staff Action)
const requestUnlock = async (req, res) => {
    try {
        const { task_id, reason } = req.body;

        await prisma.daily_tasks.update({
            where: { id: parseInt(task_id) },
            data: { 
                unlock_status: 'REQUESTED',
                unlock_reason: reason
            }
        });

        return res.status(200).json({ message: "Unlock request sent to manager with your reason." });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// 4. Unlock Request එක Approve කරලා අලුත් Deadline එකක් දෙනවා (Manager Action)
const approveUnlock = async (req, res) => {
    try {
        const { task_id, new_deadline } = req.body;

        await prisma.daily_tasks.update({
            where: { id: parseInt(task_id) },
            data: {
                is_locked: false,
                unlock_status: 'APPROVED',
                deadline: new Date(new_deadline) // අලුත් වෙලාව දෙනවා
            }
        });

        return res.status(200).json({ message: "Task unlocked and deadline extended." });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// 5. Staff එකේ කෙනාගේ Dashboard එකට Tasks ටික අරන් යනවා
const getMyTasks = async (req, res) => {
    try {
        const staff_id = req.user.id;
        const tasks = await prisma.daily_tasks.findMany({
            where: { staff_id: parseInt(staff_id) },
            orderBy: { deadline: 'asc' }
        });
        
        // GET කරද්දිත් Deadline පැනපු ඒවා තියෙනවද බලලා ඉබේම Lock කරනවා
        const now = new Date();
        const updatedTasks = await Promise.all(tasks.map(async (task) => {
            if (!task.is_completed && !task.is_locked && now > new Date(task.deadline)) {
                return await prisma.daily_tasks.update({
                    where: { id: task.id },
                    data: { is_locked: true }
                });
            }
            return task;
        }));

        return res.status(200).json(safeJson({ tasks: updatedTasks }));
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createTask, completeTask, requestUnlock, approveUnlock, getMyTasks
};