const db = require('../config/db');
const { getITSupportResponse } = require('../services/geminiService');

const getAllIssues = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT i.*, e.name AS employee_name, e.email AS employee_email, t.team_name
            FROM issue i
            JOIN employee e ON i.employee_id = e.employee_id
            JOIN team t ON e.team_id = t.team_id
            ORDER BY i.created_at DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getIssueById = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query(`
            SELECT i.*, e.name AS employee_name, e.email AS employee_email, t.team_name
            FROM issue i
            JOIN employee e ON i.employee_id = e.employee_id
            JOIN team t ON e.team_id = t.team_id
            WHERE i.issue_id = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Issue not found' });
        }
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const createIssue = async (req, res) => {
    const { employee_id, query } = req.body;

    if (!employee_id || !query) {
        return res.status(400).json({ error: 'employee_id and query are required' });
    }

    try {
        // check if employee exists
        const [employee] = await db.query('SELECT employee_id FROM employee WHERE employee_id = ?', [employee_id]);
        if (employee.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        const [result] = await db.query(
            'INSERT INTO issue (employee_id, query) VALUES (?, ?)',
            [employee_id, query]
        );

        const issue_id = result.insertId;

        // call Gemini and save response
        let gemini_response = null;
        try {
            gemini_response = await getITSupportResponse(query);
            await db.query(
                'UPDATE issue SET gemini_response = ? WHERE issue_id = ?',
                [gemini_response, issue_id]
            );
        } catch (geminiErr) {
            console.error('Gemini error:', geminiErr.message);
        }

        res.status(201).json({
            issue_id,
            employee_id,
            query,
            gemini_response: gemini_response || 'AI response unavailable, your issue has been logged.',
            resolved: false,
            sms_sent: false
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const resolveIssue = async (req, res) => {
    const { id } = req.params;
    try {
        const [issue] = await db.query('SELECT issue_id, resolved FROM issue WHERE issue_id = ?', [id]);
        if (issue.length === 0) {
            return res.status(404).json({ error: 'Issue not found' });
        }
        if (issue[0].resolved) {
            return res.status(400).json({ error: 'Issue is already resolved' });
        }

        await db.query('UPDATE issue SET resolved = TRUE WHERE issue_id = ?', [id]);
        res.json({ message: 'Issue marked as resolved', issue_id: Number(id) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getAllIssues, getIssueById, createIssue, resolveIssue };
