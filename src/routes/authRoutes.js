const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register/employee', authController.registerEmployee);
router.post('/register/admin', authController.registerAdmin);
router.post('/login/employee', authController.loginEmployee);
router.post('/login/admin', authController.loginAdmin);

module.exports = router;
