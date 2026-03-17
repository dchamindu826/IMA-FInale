const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const safeJson = (data) => JSON.parse(JSON.stringify(data, (key, value) => typeof value === 'bigint' ? value.toString() : value));

// --- 1. Create User (Register) ---
const createUser = async (req, res) => {
    try {
        const { fName, lName, phone, nic, password, role } = req.body;

        // Check if phone or NIC already exists
        const existingUser = await prisma.users.findFirst({
            where: { OR: [{ phone: phone }, { nic: nic }] }
        });

        if (existingUser) {
            return res.status(401).json({ message: "Validation error: Phone number or NIC already exists!" });
        }

        let imageName = 'default.png';

        if (req.file) {
            imageName = req.file.filename;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.users.create({
            data: {
                fName,
                lName,
                password: hashedPassword,
                phone,
                nic,
                role,
                image: imageName,
                status: 1,
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        return res.status(200).json({
            message: 'User Created Successfully',
            user: safeJson(user)
        });

    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// --- 2. Login User ---
const loginUser = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(401).json({ message: 'Validation error: Username and Password are required.' });
        }

        // Determine if username is Phone or NIC (Logic from your PHP code)
        // is_numeric checks if it's a number, length < 11 checks if it's a phone number length
        const isNumeric = /^\d+$/.test(username);
        const field = (isNumeric && username.length < 11) ? 'phone' : 'nic';

        // Find user by phone or nic
        const user = await prisma.users.findFirst({
            where: { [field]: username }
        });

        if (!user) {
            return res.status(401).json({ message: 'NIC / Phone & Password does not match with our record.' });
        }

        // Check password
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ message: 'NIC / Phone & Password does not match with our record.' });
        }

        // Check active status
        if (user.status === 0 || user.status === -1) {
            return res.status(401).json({ message: 'The account is inactive.' });
        }

        // 🔥 අලුතෙන් දාපු Audit Trail කෑල්ල (Admin/Staff ලොග් වෙද්දි)
        if (user.role !== 'user') {
    await prisma.audit_trails.create({
        data: {
            user_id: user.id,
            action: 'User Login',
            description: `User ${user.fName} logged into the system via portal.`, // 👈 මේ පේළිය එකතු කරන්න
            created_at: new Date(),
            updated_at: new Date()
        }
    });
}

        // Generate JWT Token (Equivalent to Laravel Sanctum)
        const token = jwt.sign(
            { id: user.id.toString(), role: user.role }, 
            process.env.JWT_SECRET || 'YOUR_SUPER_SECRET_KEY', 
            { expiresIn: '30d' } // Token is valid for 30 days
        );

        return res.status(200).json({
            message: 'User Logged In Successfully',
            user: safeJson(user),
            token: token
        });

    } catch (error) {
        return res.status(500).json({ message: error.message, user: null, token: null });
    }
};

// --- 3. Logout User (For Audit Trail) ---
const logoutUser = async (req, res) => {
    try {
        const user = req.user; // protect middleware එකෙන් එන user
        
        if (user && user.role !== 'user') {
    await prisma.audit_trails.create({
        data: {
            user_id: BigInt(user.id),
            action: 'User Logout',
            description: `User ${user.fName} logged out from the system.`, // 👈 මේකත් දාන්න
            created_at: new Date(),
            updated_at: new Date()
        }
    });
}

if (user && user.role !== 'user') {
            await prisma.audit_trails.create({
                data: {
                    user_id: BigInt(user.id),
                    action: 'User Logout',
                    created_at: new Date(),
                    updated_at: new Date()
                }
            });
        }
        return res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createUser,
    loginUser,
    logoutUser // 🔥 අලුතෙන් එකතු කරපු export එක
};