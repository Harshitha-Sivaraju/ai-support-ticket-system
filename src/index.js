const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./config/db');
const teamRoutes = require('./routes/teamRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const adminRoutes = require('./routes/adminRoutes');
const issueRoutes = require('./routes/issueRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const authRoutes = require('./routes/authRoutes');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check route
app.get('/', (req, res) => {
    res.json({ message: 'AI Support Ticket System is running' });
});

// DB connection test route
app.get('/db-test', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT 1 + 1 AS result');
        res.json({ db_status: 'connected', result: rows[0].result });
    } catch (err) {
        res.status(500).json({ db_status: 'failed', error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
// 404 handler - unknown routes
app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
});

// global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.message);
    res.status(500).json({ error: 'Something went wrong, please try again' });
});
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
