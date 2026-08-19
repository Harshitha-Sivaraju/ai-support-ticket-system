const db = require('../config/db');

const getAllEmployees = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT e.*, t.team_name 
            FROM employee e 
            JOIN team t ON e.team_id = t.team_id
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getEmployeeById = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query(`
            SELECT e.*, t.team_name 
            FROM employee e 
            JOIN team t ON e.team_id = t.team_id
            WHERE e.employee_id = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const createEmployee = async (req, res) => {
    const { name, email, phone, team_id } = req.body;

    if (!name || !email || !phone || !team_id) {
        return res.status(400).json({ error: 'name, email, phone and team_id are required' });
    }

    try {
        // check if team exists
        const [team] = await db.query('SELECT team_id FROM team WHERE team_id = ?', [team_id]);
        if (team.length === 0) {
            return res.status(404).json({ error: 'Team not found' });
        }

        const [result] = await db.query(
            'INSERT INTO employee (name, email, phone, team_id) VALUES (?, ?, ?, ?)',
            [name, email, phone, team_id]
        );
        res.status(201).json({ employee_id: result.insertId, name, email, phone, team_id });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getAllEmployees, getEmployeeById, createEmployee };
