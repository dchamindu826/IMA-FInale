const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const crmRoutes = require('./routes/crmRoutes'); // 👈 CRM සහ Leads ඔක්කොම තියෙන්නේ මේකේ
const whatsappRoutes = require('./routes/whatsappRoutes');
const taskRoutes = require('./routes/taskRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const financeRoutes = require('./routes/financeRoutes');
const publicRoutes = require('./routes/publicRoutes');


const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files for images
app.use('/storage', express.static('public'));

// API Routes Map කිරීම
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/crm', crmRoutes); // 👈 Leads routes වැඩ කරන්නෙත් මේක හරහා (/api/crm/leads/...)
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api', financeRoutes);
app.use('/api', publicRoutes); 

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});