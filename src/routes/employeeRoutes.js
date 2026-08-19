const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, employeeController.getAllEmployees);
router.post('/', protect, employeeController.createEmployee);
router.get('/:id', protect, employeeController.getEmployeeById);

module.exports = router;
