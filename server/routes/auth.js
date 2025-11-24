const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database');
const router = express.Router();

require('dotenv').config();
const SECRET_KEY = process.env.JWT_SECRET || 'super_secret_key_change_this_in_prod';

// Register
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;

        const stmt = db.prepare("INSERT INTO users (username, email, password_hash, avatar_url) VALUES (?, ?, ?, ?)");
        stmt.run(username, email, hashedPassword, avatarUrl, function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(409).json({ error: 'Username or email already exists' });
                }
                return res.status(500).json({ error: err.message });
            }

            const userId = this.lastID;
            const token = jwt.sign({ id: userId, username }, SECRET_KEY);

            res.status(201).json({
                message: 'User created',
                token,
                user: { id: userId, username, email, avatar_url: avatarUrl }
            });
        });
        stmt.finalize();
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Login
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY);
        res.json({
            message: 'Login successful',
            token,
            user: { id: user.id, username: user.username, email: user.email, avatar_url: user.avatar_url }
        });
    });
});

module.exports = router;
