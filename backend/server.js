const express = require('express');
const cors = require('cors');
require('dotenv').config();


const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const crmRoutes = require('./routes/crmRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const taskRoutes = require('./routes/taskRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files for images (apita mobile app eken image eka balanna puluwan wenna)
app.use('/storage', express.static('public'));

// API Routes Map kireema
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/payments', paymentRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

app.use(cors());