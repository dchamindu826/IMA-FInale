const express = require('express');
const router = express.Router();
// 🔴 මෙතන Import කරන නමත් අනිවාර්යයෙන්ම සමාන වෙන්න ඕනේ
const { getLandingPageData } = require('../controllers/publicController');

router.get('/public/landing-data', getLandingPageData);

module.exports = router;