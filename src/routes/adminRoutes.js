const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, allowOnly } = require('../middleware/authMiddleware');

router.get('/', protect, allowOnly('admin'), adminController.getAllAdmins);
router.post('/', protect, allowOnly('admin'), adminController.createAdmin);
router.get('/:id', protect, allowOnly('admin'), adminController.getAdminById);

module.exports = router;
