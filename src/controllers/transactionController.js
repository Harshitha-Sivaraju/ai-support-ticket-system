const fs = require('fs');
const path = require('path');

const transactionsPath = path.join(__dirname, '../data/transactions.json');
const { getChatResponse } = require('../services/geminiService');
const { getPaymentHealth } = require('./paymentController');

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

const chatWithTransaction = async (req, res) => {
    const { id } = req.params;
    const { message, history, transaction } = req.body;

    if (!message) {
        return res.status(400).json({
            error: 'message is required'
        });
    }

    try {
        const transactions = JSON.parse(
            fs.readFileSync(transactionsPath, 'utf8')
        );

        const transactionData = transactions.find(
            t => t.transactionId === id
        );

        if (!transactionData) {
            return res.status(404).json({
                error: 'Transaction not found'
            });
        }

        // Make sure the customer can only chat about their own transaction
        const userId = `USER${String(req.user.id).padStart(3, '0')}`;

        if (transactionData.userId !== userId) {
            return res.status(403).json({
                error: 'Access denied'
            });
        }

        // Use the backend transaction as the source of truth.
        // This keeps failureReason available to Gemini even though
        // it is not displayed directly in the frontend.
        const paymentHealth = getPaymentHealth();
        const reply = await getChatResponse(
            `Payment transaction ${transactionData.transactionId}`,
            history || [],
            message,
            transactionData,
            paymentHealth
        );

        res.json({ reply });

    } catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
};

module.exports = {
    getTransactions,
    getTransactionById,
    chatWithTransaction
};