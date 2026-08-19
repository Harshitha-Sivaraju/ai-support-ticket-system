const db = require('../config/db');
const { getITSupportResponse, getChatResponse } = require('../services/geminiService');
const { sendSMS } = require('../services/twilioService');

// GET all issues — admin sees only their team's issues, employee sees only their own
const getAllIssues = async (req, res) => {
    try {
        let rows;
        if (req.user.role === 'admin') {
            [rows] = await db.query(`
                SELECT i.*, e.name AS employee_name, e.email AS employee_email, t.team_name
                FROM issue i
                JOIN employee e ON i.employee_id = e.employee_id
                JOIN team t ON e.team_id = t.team_id
                WHERE e.team_id = ?
                ORDER BY i.created_at DESC
            `, [req.user.team_id]);
        } else {
            // employee — only their own issues
            [rows] = await db.query(`
                SELECT i.*, e.name AS employee_name, e.email AS employee_email, t.team_name
                FROM issue i
                JOIN employee e ON i.employee_id = e.employee_id
                JOIN team t ON e.team_id = t.team_id
                WHERE i.employee_id = ?
                ORDER BY i.created_at DESC
            `, [req.user.id]);
        }
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

        // employees can only view their own issues
        if (req.user.role === 'employee' && rows[0].employee_id !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const createIssue = async (req, res) => {
    const { query } = req.body;
    const employee_id = req.user.id; // always from JWT, never trust frontend

    if (!query) {
        return res.status(400).json({ error: 'query is required' });
    }

    try {
        const [result] = await db.query(
            'INSERT INTO issue (employee_id, query, status) VALUES (?, ?, ?)',
            [employee_id, query, 'open']
        );

        const issue_id = result.insertId;

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
            status: 'open',
            gemini_response: gemini_response || 'AI response unavailable, your issue has been logged.',
            resolved: false,
            sms_sent: false
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Employee resolves their own issue
const resolveByEmployee = async (req, res) => {
    const { id } = req.params;
    const employee_id = req.user.id;

    try {
        const [issue] = await db.query('SELECT * FROM issue WHERE issue_id = ?', [id]);
        if (issue.length === 0) return res.status(404).json({ error: 'Issue not found' });
        if (issue[0].employee_id !== employee_id) return res.status(403).json({ error: 'Access denied' });
        if (issue[0].resolved) return res.status(400).json({ error: 'Issue is already resolved' });

        await db.query(
            "UPDATE issue SET resolved = TRUE, status = 'resolved' WHERE issue_id = ?", [id]
        );
        res.json({ message: 'Issue marked as resolved', issue_id: Number(id) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Admin resolves an issue (existing flow — also creates notification)
const resolveIssue = async (req, res) => {
    const { id } = req.params;
    try {
        const [issue] = await db.query('SELECT * FROM issue WHERE issue_id = ?', [id]);
        if (issue.length === 0) return res.status(404).json({ error: 'Issue not found' });
        if (issue[0].resolved) return res.status(400).json({ error: 'Issue is already resolved' });

        // verify this issue belongs to admin's team
        const [emp] = await db.query('SELECT team_id FROM employee WHERE employee_id = ?', [issue[0].employee_id]);
        if (emp.length > 0 && emp[0].team_id !== req.user.team_id) {
            return res.status(403).json({ error: 'Access denied — issue belongs to another team' });
        }

        await db.query("UPDATE issue SET resolved = TRUE, status = 'resolved' WHERE issue_id = ?", [id]);

        try {
            const admin_id = req.user.id;
            const { employee_id, query } = issue[0];
            const [adminCheck] = await db.query('SELECT admin_id FROM admin WHERE admin_id = ?', [admin_id]);
            if (adminCheck.length > 0) {
                const message = `Your issue has been resolved: "${query.substring(0, 80)}${query.length > 80 ? '...' : ''}"`;
                await db.query(
                    'INSERT INTO notification (issue_id, employee_id, admin_id, message, status) VALUES (?, ?, ?, ?, ?)',
                    [id, employee_id, admin_id, message, 'pending']
                );
            }
        } catch (notifErr) {
            console.error('Notification insert failed:', notifErr.message);
        }

        res.json({ message: 'Issue marked as resolved', issue_id: Number(id) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Employee escalates issue to admin — triggers Twilio SMS
const escalateIssue = async (req, res) => {
    const { id } = req.params;
    const employee_id = req.user.id;
    const team_id = req.user.team_id;

    try {
        const [issue] = await db.query('SELECT * FROM issue WHERE issue_id = ?', [id]);
        if (issue.length === 0) return res.status(404).json({ error: 'Issue not found' });
        if (issue[0].employee_id !== employee_id) return res.status(403).json({ error: 'Access denied' });
        if (issue[0].resolved) return res.status(400).json({ error: 'Issue is already resolved' });
        if (issue[0].status === 'escalated') return res.status(400).json({ error: 'Issue is already escalated' });

        await db.query("UPDATE issue SET status = 'escalated' WHERE issue_id = ?", [id]);

        // find the admin for this employee's team
        const [admins] = await db.query(
            'SELECT a.admin_id, a.name, a.phone FROM admin a WHERE a.team_id = ?', [team_id]
        );

        if (admins.length === 0) {
            return res.json({ message: 'Issue escalated. No admin found for your team yet.', issue_id: Number(id), sms_sent: false });
        }

        const admin = admins[0];

        // get employee name and team name for SMS
        const [empRows] = await db.query(`
            SELECT e.name AS emp_name, t.team_name
            FROM employee e JOIN team t ON e.team_id = t.team_id
            WHERE e.employee_id = ?
        `, [employee_id]);

        const empName = empRows[0]?.emp_name || 'Employee';
        const teamName = empRows[0]?.team_name || 'Unknown Team';

        const smsMessage = `New IT support issue requires attention.\nEmployee: ${empName}\nIssue ID: #${id}\nTeam: ${teamName}\nQuery: ${issue[0].query.substring(0, 100)}`;

        // send SMS via Twilio
        const smsResult = await sendSMS(admin.phone, smsMessage);

        // create notification record
        const notifStatus = smsResult.success ? 'sent' : 'pending';
        await db.query(
            'INSERT INTO notification (issue_id, employee_id, admin_id, message, status) VALUES (?, ?, ?, ?, ?)',
            [id, employee_id, admin.admin_id, smsMessage, notifStatus]
        );

        if (smsResult.success) {
            await db.query('UPDATE issue SET sms_sent = TRUE WHERE issue_id = ?', [id]);
        }

        res.json({
            message: 'Issue escalated to admin.',
            issue_id: Number(id),
            admin_notified: admin.name,
            sms_sent: smsResult.success,
            sms_note: smsResult.success ? 'SMS delivered' : smsResult.reason
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Employee sends a follow-up chat message for an existing issue
const chatWithIssue = async (req, res) => {
    const { id } = req.params;
    const { message, history } = req.body; // history: [{role, parts:[{text}]}]
    const employee_id = req.user.id;

    if (!message) return res.status(400).json({ error: 'message is required' });

    try {
        const [issue] = await db.query('SELECT * FROM issue WHERE issue_id = ?', [id]);
        if (issue.length === 0) return res.status(404).json({ error: 'Issue not found' });
        if (issue[0].employee_id !== employee_id) return res.status(403).json({ error: 'Access denied' });

        const reply = await getChatResponse(issue[0].query, history || [], message);
        res.json({ reply });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getAllIssues, getIssueById, createIssue, resolveByEmployee, resolveIssue, escalateIssue, chatWithIssue };
