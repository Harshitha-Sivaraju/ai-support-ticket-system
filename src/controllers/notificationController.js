const db = require('../config/db');

const VALID_STATUSES = ['pending', 'sent', 'failed'];

const getAllNotifications = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT n.*,
                   i.query AS issue_query,
                   e.name  AS employee_name,
                   a.name  AS admin_name
            FROM notification n
            JOIN issue    i ON n.issue_id    = i.issue_id
            JOIN employee e ON n.employee_id = e.employee_id
            JOIN admin    a ON n.admin_id    = a.admin_id
            ORDER BY n.sent_at DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getNotificationById = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query(`
            SELECT n.*,
                   i.query AS issue_query,
                   e.name  AS employee_name,
                   a.name  AS admin_name
            FROM notification n
            JOIN issue    i ON n.issue_id    = i.issue_id
            JOIN employee e ON n.employee_id = e.employee_id
            JOIN admin    a ON n.admin_id    = a.admin_id
            WHERE n.notification_id = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getNotificationsByIssue = async (req, res) => {
    const { id } = req.params;
    try {
        // check if issue exists
        const [issue] = await db.query('SELECT issue_id FROM issue WHERE issue_id = ?', [id]);
        if (issue.length === 0) {
            return res.status(404).json({ error: 'Issue not found' });
        }

        const [rows] = await db.query(`
            SELECT n.*,
                   e.name AS employee_name,
                   a.name AS admin_name
            FROM notification n
            JOIN employee e ON n.employee_id = e.employee_id
            JOIN admin    a ON n.admin_id    = a.admin_id
            WHERE n.issue_id = ?
            ORDER BY n.sent_at DESC
        `, [id]);

        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const createNotification = async (req, res) => {
    const { issue_id, employee_id, admin_id, message } = req.body;

    if (!issue_id || !employee_id || !admin_id || !message) {
        return res.status(400).json({ error: 'issue_id, employee_id, admin_id and message are required' });
    }

    try {
        // validate all 3 foreign keys exist
        const [issue] = await db.query('SELECT issue_id FROM issue WHERE issue_id = ?', [issue_id]);
        if (issue.length === 0) {
            return res.status(404).json({ error: 'Issue not found' });
        }

        const [employee] = await db.query('SELECT employee_id FROM employee WHERE employee_id = ?', [employee_id]);
        if (employee.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        const [admin] = await db.query('SELECT admin_id FROM admin WHERE admin_id = ?', [admin_id]);
        if (admin.length === 0) {
            return res.status(404).json({ error: 'Admin not found' });
        }

        const [result] = await db.query(
            'INSERT INTO notification (issue_id, employee_id, admin_id, message) VALUES (?, ?, ?, ?)',
            [issue_id, employee_id, admin_id, message]
        );

        res.status(201).json({
            notification_id: result.insertId,
            issue_id,
            employee_id,
            admin_id,
            message,
            status: 'pending'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const updateNotificationStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
        return res.status(400).json({ error: 'status is required' });
    }

    if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    try {
        const [notification] = await db.query(
            'SELECT notification_id FROM notification WHERE notification_id = ?', [id]
        );
        if (notification.length === 0) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        await db.query('UPDATE notification SET status = ? WHERE notification_id = ?', [status, id]);
        res.json({ message: 'Status updated', notification_id: Number(id), status });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    getAllNotifications,
    getNotificationById,
    getNotificationsByIssue,
    createNotification,
    updateNotificationStatus
};
