const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Get list of conversations
router.get('/', authMiddleware, (req, res) => {
    try {
        const conversations = db.prepare(`
      SELECT * FROM conversations 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `).all(req.user.id);
        res.json(conversations);
    } catch (error) {
        console.error('[History Fetch Error]', error.message);
        res.status(500).json({ error: 'Failed to load your study history.' });
    }
});

// Get messages for a specific conversation
router.get('/:id', authMiddleware, (req, res) => {
    try {
        const messages = db.prepare(`
      SELECT m.* FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE c.id = ? AND c.user_id = ?
      ORDER BY m.created_at ASC
    `).all(req.params.id, req.user.id);
        res.json(messages);
    } catch (error) {
        console.error('[History Detail Error]', error.message);
        res.status(500).json({ error: 'Failed to load conversation details.' });
    }
});

// Delete all conversations for the user
router.delete('/all/clear', authMiddleware, (req, res) => {
    try {
        console.log(`[History] Intent: Clear all history for user ID: ${req.user.id}`);

        // Single query is enough because PRAGMA foreign_keys = ON is enabled in db.js
        const result = db.prepare('DELETE FROM conversations WHERE user_id = ?').run(req.user.id);

        console.log(`[History] Success: Deleted ${result.changes} conversations.`);
        res.json({
            message: 'All history cleared successfully',
            conversationsDeleted: result.changes
        });
    } catch (error) {
        console.error('[History Bulk Delete Error]', error);
        res.status(500).json({ error: 'Failed to clear history database records.', details: error.message });
    }
});

// Delete a specific conversation
router.delete('/:id', authMiddleware, (req, res) => {
    try {
        db.prepare('DELETE FROM conversations WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
        res.json({ message: 'Conversation deleted successfully' });
    } catch (error) {
        console.error('[History Delete Error]', error.message);
        res.status(500).json({ error: 'Failed to delete conversation.' });
    }
});

module.exports = router;
