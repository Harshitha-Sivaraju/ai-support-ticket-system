const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, notificationController.getAllNotifications);
router.post('/', protect, notificationController.createNotification);
router.get('/issue/:id', protect, notificationController.getNotificationsByIssue);
router.get('/:id', protect, notificationController.getNotificationById);
router.patch('/:id/status', protect, notificationController.updateNotificationStatus);

module.exports = router;
