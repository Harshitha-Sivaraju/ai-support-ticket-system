const express = require('express');
const router = express.Router();

const transactionController = require('../controllers/transactionController');
const { protect, allowOnly } = require('../middleware/authMiddleware');

router.get(
    '/',
    protect,
    allowOnly('customer'),
    transactionController.getTransactions
);

router.get(
    '/:id',
    protect,
    allowOnly('customer'),
    transactionController.getTransactionById
);

module.exports = router;