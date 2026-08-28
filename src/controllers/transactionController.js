const fs = require('fs');
const path = require('path');

const transactionsPath = path.join(__dirname, '../data/transactions.json');

const getTransactions = (req, res) => {
    try {
        const transactions = JSON.parse(
            fs.readFileSync(transactionsPath, 'utf8')
        );

        // Logged-in employee/customer ID comes from JWT
        const userId = `USER${String(req.user.id).padStart(3, '0')}`;

        const userTransactions = transactions.filter(
            transaction => transaction.userId === userId
        );

        res.json(userTransactions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getTransactionById = (req, res) => {
    try {
        const transactions = JSON.parse(
            fs.readFileSync(transactionsPath, 'utf8')
        );

        const transaction = transactions.find(
            transaction => transaction.transactionId === req.params.id
        );

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        res.json(transaction);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    getTransactions,
    getTransactionById
};