const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { protect, allowOnly } = require('../middleware/authMiddleware');

router.get('/',       protect, employeeController.getAllEmployees);
router.get('/team',   protect, allowOnly('admin'), employeeController.getMyTeamEmployees);
router.post('/',      protect, employeeController.createEmployee);
router.get('/:id',    protect, employeeController.getEmployeeById);

module.exports = router;
