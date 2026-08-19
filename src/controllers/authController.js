const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const generateToken = (id, role, team_id) => {
    return jwt.sign(
        { id, role, team_id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );
};

// REGISTER EMPLOYEE
const registerEmployee = async (req, res) => {
    const { name, email, phone, team_id, password } = req.body;

    if (!name || !email || !phone || !team_id || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const [team] = await db.query('SELECT team_id FROM team WHERE team_id = ?', [team_id]);
        if (team.length === 0) {
            return res.status(404).json({ error: 'Team not found' });
        }

        const [existing] = await db.query('SELECT email FROM employee WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await db.query(
            'INSERT INTO employee (name, email, phone, team_id, password) VALUES (?, ?, ?, ?, ?)',
            [name, email, phone, team_id, hashedPassword]
        );

        const token = generateToken(result.insertId, 'employee', team_id);
        res.status(201).json({ employee_id: result.insertId, name, email, team_id, token });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// REGISTER ADMIN
const registerAdmin = async (req, res) => {
    const { name, email, phone, team_id, password } = req.body;

    if (!name || !email || !team_id || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const [team] = await db.query('SELECT team_id FROM team WHERE team_id = ?', [team_id]);
        if (team.length === 0) {
            return res.status(404).json({ error: 'Team not found' });
        }

        // check one-admin-per-team rule with a clear message
        const [teamAdmin] = await db.query('SELECT admin_id FROM admin WHERE team_id = ?', [team_id]);
        if (teamAdmin.length > 0) {
            return res.status(409).json({ error: 'This team already has an admin. Please select another team.' });
        }

        const [existing] = await db.query('SELECT email FROM admin WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await db.query(
            'INSERT INTO admin (name, email, phone, team_id, password) VALUES (?, ?, ?, ?, ?)',
            [name, email, phone || null, team_id, hashedPassword]
        );

        const token = generateToken(result.insertId, 'admin', team_id);
        res.status(201).json({ admin_id: result.insertId, name, email, team_id, token });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// LOGIN EMPLOYEE
const loginEmployee = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'email and password are required' });
    }

    try {
        const [rows] = await db.query(`
            SELECT e.*, t.team_name FROM employee e
            JOIN team t ON e.team_id = t.team_id
            WHERE e.email = ?
        `, [email]);
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const employee = rows[0];
        const isMatch = await bcrypt.compare(password, employee.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = generateToken(employee.employee_id, 'employee', employee.team_id);
        res.json({
            employee_id: employee.employee_id,
            name: employee.name,
            email: employee.email,
            team_id: employee.team_id,
            team_name: employee.team_name,
            token
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// LOGIN ADMIN
const loginAdmin = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'email and password are required' });
    }

    try {
        const [rows] = await db.query(`
            SELECT a.*, t.team_name FROM admin a
            JOIN team t ON a.team_id = t.team_id
            WHERE a.email = ?
        `, [email]);
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const admin = rows[0];
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = generateToken(admin.admin_id, 'admin', admin.team_id);
        res.json({
            admin_id: admin.admin_id,
            name: admin.name,
            email: admin.email,
            team_id: admin.team_id,
            team_name: admin.team_name,
            token
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { registerEmployee, registerAdmin, loginEmployee, loginAdmin };
