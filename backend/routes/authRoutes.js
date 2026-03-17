const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const { createUser, loginUser } = require('../controllers/authController');

// User Profile Image upload config
const userImgStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../public/userImages'));
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const uploadUserImg = multer({ storage: userImgStorage });

// --- Auth Routes ---
router.post('/register', uploadUserImg.single('profileImg'), createUser);
router.post('/login', loginUser);

module.exports = router;