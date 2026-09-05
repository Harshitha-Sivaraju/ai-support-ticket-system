const db = require('../config/db');
const fs = require('fs');
const path = require('path');


const { analyzeSupportTicket } = require('../services/geminiService');

const transactionsPath = path.join(
    __dirname,
    '../data/transactions.json'
);

const getTransactions = () => {
    const data = fs.readFileSync(transactionsPath, 'utf8');
    return JSON.parse(data);
};

// CREATE SUPPORT TICKET
const createSupportTicket = async (req, res) => {
    const { transaction_id, customer_message } = req.body;

    if (!transaction_id || !customer_message) {
        return res.status(400).json({
            error: 'Transaction ID and customer message are required'
        });
    }

    try {
        const customerId = req.user.id;

        // Find transaction
        const transactions = getTransactions();

        const transaction = transactions.find(
            t => t.transactionId === transaction_id
        );

        if (!transaction) {
            return res.status(404).json({
                error: 'Transaction not found'
            });
        }

        // Ask Gemini to analyze the support request
        const aiAnalysis = await analyzeSupportTicket(
            customer_message,
            transaction
        );
        console.log('GEMINI ANALYSIS:', aiAnalysis);

        // Save ticket + AI analysis
        const [result] = await db.query(
            `INSERT INTO support_ticket
            (
                customer_id,
                transaction_id,
                customer_message,
                ai_summary,
                ai_priority,
                ai_recommendation
            )
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                customerId,
                transaction_id,
                customer_message,
                aiAnalysis.summary,
                aiAnalysis.priority,
                aiAnalysis.recommendation
            ]
        );

        res.status(201).json({
            message: 'Support ticket created successfully',
            ticket_id: result.insertId,
            priority: aiAnalysis.priority,
            summary: aiAnalysis.summary,
            recommendation: aiAnalysis.recommendation,
            transaction
        });

    } catch (err) {
        console.error('Create support ticket error:', err);

        res.status(500).json({
            error: err.message
        });
    }
};

// GET SUPPORT TICKETS FOR LOGGED-IN CUSTOMER
const getMySupportTickets = async (req, res) => {
    try {
        const customerId = req.user.id;

        const [tickets] = await db.query(
            `SELECT
                ticket_id,
                transaction_id,
                customer_message,
                status,
                created_at,
                updated_at
             FROM support_ticket
             WHERE customer_id = ?
             ORDER BY created_at DESC`,
            [customerId]
        );

        res.json(tickets);

    } catch (err) {
        console.error('Get support tickets error:', err);

        res.status(500).json({
            error: err.message
        });
    }
};


// GET ALL SUPPORT TICKETS FOR ADMIN
const getAllSupportTickets = async (req, res) => {
    try {
        const [tickets] = await db.query(
            `SELECT
                st.ticket_id,
                st.customer_id,
                c.name AS customer_name,
                c.email AS customer_email,
                st.transaction_id,
                st.customer_message,
                st.ai_summary,
                st.ai_priority,
                st.ai_recommendation,
                st.status,
                st.created_at,
                st.updated_at
             FROM support_ticket st
             JOIN customer c
                ON st.customer_id = c.customer_id
             ORDER BY
                FIELD(st.ai_priority, 'critical', 'high', 'medium', 'low'),
                st.created_at DESC`
        );

        res.json(tickets);

    } catch (err) {
        console.error('Get all support tickets error:', err);

        res.status(500).json({
            error: err.message
        });
    }
};

// UPDATE SUPPORT TICKET STATUS
const updateSupportTicketStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
        'open',
        'in_progress',
        'resolved',
        'recovery'
    ];

    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
            error: 'Invalid support ticket status'
        });
    }

    try {
        const [result] = await db.query(
            `UPDATE support_ticket
             SET status = ?
             WHERE ticket_id = ?`,
            [status, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: 'Support ticket not found'
            });
        }

        res.json({
            message: 'Support ticket status updated successfully'
        });

    } catch (err) {
        console.error('Update support ticket status error:', err);

        res.status(500).json({
            error: err.message
        });
    }
};

module.exports = {
    createSupportTicket,
    getMySupportTickets,
    getAllSupportTickets,
    updateSupportTicketStatus
};