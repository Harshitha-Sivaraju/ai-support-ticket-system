const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');

router.get('/', teamController.getAllTeams);
router.get('/available', teamController.getAvailableTeams);
router.post('/', teamController.createTeam);

module.exports = router;
