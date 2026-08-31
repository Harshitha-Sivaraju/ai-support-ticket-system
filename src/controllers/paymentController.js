const fs = require('fs');
const path = require('path');

const transactionsPath = path.join(
    __dirname,
    '../data/transactions.json'
);

// Simulated payment service health
// Change these values during demo/testing.
let paymentProviderHealthy = true;
let bankHealthy = true;


// ===============================
// Payment Provider Health
// ===============================
const checkPaymentProviderHealth = async (req, res) => {
    try {
        res.json({
            healthy: paymentProviderHealthy,
            message: paymentProviderHealthy
                ? 'Payment provider is available.'
                : 'Payment provider is currently unavailable.'
        });
    } catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
};


// ===============================
// Bank Health
// ===============================
const checkBankHealth = async (req, res) => {
    try {
        res.json({
            healthy: bankHealthy,
            message: bankHealthy
                ? 'Bank service is available.'
                : 'Bank service is currently unavailable.'
        });
    } catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
};


// ===============================
// Process / Retry Payment
// ===============================
const processPayment = async (req, res) => {
    try {
        const { transactionId, amount } = req.body;

        // Validate request
        if (!transactionId || !amount) {
            return res.status(400).json({
                success: false,
                error: 'Transaction ID and amount are required'
            });
        }

        // 1. Check payment provider
        if (!paymentProviderHealthy) {
            return res.status(503).json({
                success: false,
                message:
                    'Payment provider is currently unavailable. Please try again later.'
            });
        }

        // 2. Check bank
        if (!bankHealthy) {
            return res.status(503).json({
                success: false,
                message:
                    'Bank service is currently unavailable. No payment was attempted.'
            });
        }

        // 3. Read transactions.json
        const transactions = JSON.parse(
            fs.readFileSync(transactionsPath, 'utf8')
        );

        // 4. Find transaction
        const transaction = transactions.find(
            t => t.transactionId === transactionId
            
        );
        
        transaction.updatedAt = new Date().toISOString();
        
        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found.'
            });
        }


        // 5. Update transaction
        transaction.amount = amount;
        transaction.status = 'SUCCESS';
        transaction.failureReason = null;
        transaction.refundStatus = 'NONE';

        // 6. Save updated transactions.json
        fs.writeFileSync(
            transactionsPath,
            JSON.stringify(transactions, null, 2)
        );

        // 7. Return success
        res.json({
            success: true,
            transactionId: transaction.transactionId,
            amount: transaction.amount,
            status: transaction.status,
            message: 'Payment completed successfully.'
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
};


// ===============================
// Export Controllers
// ===============================
module.exports = {
    checkPaymentProviderHealth,
    checkBankHealth,
    processPayment
};