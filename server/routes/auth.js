const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'secret-key';

// Register
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    // Strict Gmail Validation
    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!gmailRegex.test(email.toLowerCase())) {
        return res.status(400).json({ error: 'Only valid @gmail.com addresses are allowed.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)').run(name, email, hashedPassword);

        // Create empty profile
        db.prepare('INSERT INTO profiles (user_id) VALUES (?)').run(result.lastInsertRowid);

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('[Registration Error]', error);
        if (error.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'This email is already registered.' });
        }
        res.status(500).json({ error: 'Something went wrong during signup. Please try again later.' });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!gmailRegex.test(email.toLowerCase())) {
        return res.status(400).json({ error: 'Please use your @gmail.com account.' });
    }

    try {
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '1d' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });

        res.json({ message: 'Login successful', user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Logout
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
});

module.exports = router;
