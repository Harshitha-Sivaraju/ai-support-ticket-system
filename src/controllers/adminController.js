const db = require('../config/db');

const getAllAdmins = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT a.*, t.team_name
            FROM admin a
            JOIN team t ON a.team_id = t.team_id
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getAdminById = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query(`
            SELECT a.*, t.team_name
            FROM admin a
            JOIN team t ON a.team_id = t.team_id
            WHERE a.admin_id = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Admin not found' });
        }
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const createAdmin = async (req, res) => {
    const { name, email, team_id } = req.body;

    if (!name || !email || !team_id) {
        return res.status(400).json({ error: 'name, email and team_id are required' });
    }

    try {
        // check if team exists
        const [team] = await db.query('SELECT team_id FROM team WHERE team_id = ?', [team_id]);
        if (team.length === 0) {
            return res.status(404).json({ error: 'Team not found' });
        }

        const [result] = await db.query(
            'INSERT INTO admin (name, email, team_id) VALUES (?, ?, ?)',
            [name, email, team_id]
        );
        res.status(201).json({ admin_id: result.insertId, name, email, team_id });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY' && err.message.includes('email')) {
            return res.status(409).json({ error: 'Email already exists' });
        }
        if (err.code === 'ER_DUP_ENTRY' && err.message.includes('team_id')) {
            return res.status(409).json({ error: 'This team already has an admin' });
        }
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getAllAdmins, getAdminById, createAdmin };
