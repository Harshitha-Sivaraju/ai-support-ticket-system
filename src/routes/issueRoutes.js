const express = require('express');
const router = express.Router();
const issueController = require('../controllers/issueController');
const { protect, allowOnly } = require('../middleware/authMiddleware');

router.get('/',                protect,                          issueController.getAllIssues);
router.post('/',               protect, allowOnly('employee'),   issueController.createIssue);
router.get('/:id',             protect,                          issueController.getIssueById);
router.patch('/:id/resolve',   protect, allowOnly('admin'),      issueController.resolveIssue);
router.patch('/:id/resolve-self', protect, allowOnly('employee'), issueController.resolveByEmployee);
router.patch('/:id/escalate',  protect, allowOnly('employee'),   issueController.escalateIssue);
router.post('/:id/chat',       protect, allowOnly('employee'),   issueController.chatWithIssue);

module.exports = router;
