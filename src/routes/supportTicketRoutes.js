const express = require('express');
const router = express.Router();

const {
    createSupportTicket,
    getMySupportTickets,
    getAllSupportTickets,
    updateSupportTicketStatus
} = require('../controllers/supportTicketController');

const { protect, allowOnly } = require('../middleware/authMiddleware');


// CUSTOMER - CREATE SUPPORT TICKET
router.post(
    '/',
    protect,
    allowOnly('customer'),
    createSupportTicket
);


// CUSTOMER - GET OWN SUPPORT TICKETS
router.get(
    '/my',
    protect,
    allowOnly('customer'),
    getMySupportTickets
);


// ADMIN - GET ALL SUPPORT TICKETS
router.get(
    '/',
    protect,
    allowOnly('admin'),
    getAllSupportTickets
);


// ADMIN - UPDATE SUPPORT TICKET STATUS
router.patch(
    '/:id/status',
    protect,
    allowOnly('admin'),
    updateSupportTicketStatus
);


module.exports = router;