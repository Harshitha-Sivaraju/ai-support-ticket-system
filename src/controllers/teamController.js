const db = require('../config/db');

const getAllTeams = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM team');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getAvailableTeams = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT t.* FROM team t
            LEFT JOIN admin a ON t.team_id = a.team_id
            WHERE a.team_id IS NULL
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const createTeam = async (req, res) => {
    const { team_name } = req.body;

    if (!team_name) {
        return res.status(400).json({ error: 'team_name is required' });
    }

    try {
        const [result] = await db.query(
            'INSERT INTO team (team_name) VALUES (?)',
            [team_name]
        );
        res.status(201).json({ team_id: result.insertId, team_name });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getAllTeams, getAvailableTeams, createTeam };