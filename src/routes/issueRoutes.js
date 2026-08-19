const express = require('express');
const router = express.Router();
const issueController = require('../controllers/issueController');
const { protect, allowOnly } = require('../middleware/authMiddleware');

router.get('/', protect, issueController.getAllIssues);
router.post('/', protect, issueController.createIssue);
router.get('/:id', protect, issueController.getIssueById);
router.patch('/:id/resolve', protect, allowOnly('admin'), issueController.resolveIssue);

module.exports = router;
