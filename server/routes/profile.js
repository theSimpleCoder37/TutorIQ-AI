const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Get profile
router.get('/', authMiddleware, (req, res) => {
    try {
        const profile = db.prepare(`
      SELECT p.*, u.name, u.email 
      FROM profiles p 
      JOIN users u ON p.user_id = u.id 
      WHERE p.user_id = ?
    `).get(req.user.id);
        res.json(profile);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Update profile / API Key
router.post('/update', authMiddleware, (req, res) => {
    const { university, semester, course, gemini_api_key } = req.body;
    const trimmedKey = gemini_api_key ? gemini_api_key.trim() : '';

    try {
        if (university && university.length > 100) return res.status(400).json({ error: 'University name is too long.' });
        if (semester && semester.length > 50) return res.status(400).json({ error: 'Semester info is too long.' });
        if (course && course.length > 100) return res.status(400).json({ error: 'Course name is too long.' });

        if (trimmedKey && trimmedKey !== '' && !trimmedKey.includes('•')) {
            db.prepare(`
                UPDATE profiles 
                SET university = ?, semester = ?, course = ?, gemini_api_key = ? 
                WHERE user_id = ?
            `).run(university || '', semester || '', course || '', trimmedKey, req.user.id);
        } else {
            db.prepare(`
                UPDATE profiles 
                SET university = ?, semester = ?, course = ? 
                WHERE user_id = ?
            `).run(university || '', semester || '', course || '', req.user.id);
        }

        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('[ProfileUpdate Error]', error.message);
        res.status(500).json({ error: 'Failed to update profile. Please try again later.', details: error.message });
    }
});

module.exports = router;
