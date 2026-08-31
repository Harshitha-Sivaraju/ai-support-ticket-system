const express = require('express');
const router = express.Router();

const paymentController = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

router.get(
    '/provider-health',
    protect,
    paymentController.checkPaymentProviderHealth
);

router.get(
    '/bank-health',
    protect,
    paymentController.checkBankHealth
);

router.post(
    '/pay',
    protect,
    paymentController.processPayment
);
module.exports = router;