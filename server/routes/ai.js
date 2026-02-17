const express = require('express');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

router.post('/chat', authMiddleware, async (req, res) => {
    const { toolType, message, conversationId, toolData } = req.body;

    if (!toolType || !message || message.trim() === '') {
        return res.status(400).json({ error: 'Message content is required.' });
    }

    if (message.length > 5000) {
        return res.status(400).json({ error: 'Message is too long. Please shorten it.' });
    }

    const trimmedMessage = message.trim();

    try {
        // 1. Get User's API Key and Profile from DB
        const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(req.user.id);
        if (!profile) {
            return res.status(400).json({ error: 'Debug: Profile row not found in database.' });
        }
        if (!profile.gemini_api_key) {
            return res.status(400).json({ error: 'Debug: Gemini API Key is empty in your database profile.' });
        }

        // 2. Load System Prompt
        const promptPath = path.join(__dirname, `../prompts/${toolType}.txt`);
        if (!fs.existsSync(promptPath)) {
            return res.status(400).json({ error: 'Invalid tool type' });
        }
        let systemPrompt = fs.readFileSync(promptPath, 'utf8');

        // 3. Append dynamic tool-specific context
        let dynamicPrompt = systemPrompt;
        if (toolData) {
            // Inject subject into ANY prompt that has the placeholder [Specify Subject Here]
            if (toolData.subject) {
                dynamicPrompt = dynamicPrompt.replace('[Specify Subject Here]', toolData.subject);
            }

            if (toolType === 'answerMaker') {
                const marks = toolData.marks || '1';
                dynamicPrompt += `\nSTRICT INSTRUCTION: The answer must be suitable for a ${marks}-mark question.`;
            } else if (toolType === 'exerciseMaker') {
                const short = toolData.shortQty || 0;
                const med = toolData.medQty || 0;
                const long = toolData.longQty || 0;

                const sectionDetails = `
- Section A: ${short} Short Questions (2 Marks each)
- Section B: ${med} Medium Questions (5 Marks each)
- Section C: ${long} Long Questions (10 Marks each)
        `;

                dynamicPrompt = dynamicPrompt.replace('{University_Name}', profile.university || 'General University');
                dynamicPrompt = dynamicPrompt.replace('{Course_Name}', profile.course || 'Degree Program');
                dynamicPrompt = dynamicPrompt.replace('{Subject_Name}', toolData.subject || 'Academic Subject');
                dynamicPrompt = dynamicPrompt.replace('{Chapter_Topics}', message);
                dynamicPrompt = dynamicPrompt.replace('{Sections_Details}', sectionDetails);
            }
        }

        // Safety: If placeholders still exist (rare), clean them up
        dynamicPrompt = dynamicPrompt.replace(/\{.*?\}/g, 'N/A').replace(/\[.*?\]/g, 'N/A');

        const context = `\nContext: Student at ${profile.university || 'University'}, Semester ${profile.semester || 'N/A'}, Course: ${profile.course || 'BSc CS'}. Goal: Study Smart, Not Hard.`;
        const fullPrompt = dynamicPrompt + context;

        // 4. Initialize Gemini
        const modelName = "gemini-flash-latest"; // Verified identifier from your diagnostic results
        const sdkVersion = require('@google/generative-ai/package.json').version;
        console.log(`[TutorIQ] SDK Version: ${sdkVersion} | Using Model: ${modelName}`);

        const genAI = new GoogleGenerativeAI(profile.gemini_api_key);
        const model = genAI.getGenerativeModel({ model: modelName });

        // 5. Manage Conversation
        let currentConversationId = conversationId;
        if (!currentConversationId) {
            const result = db.prepare('INSERT INTO conversations (user_id, tool_name) VALUES (?, ?)').run(req.user.id, toolType);
            currentConversationId = result.lastInsertRowid;
        }

        // Save User Message
        db.prepare('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)').run(currentConversationId, 'user', trimmedMessage);

        const result = await model.generateContent(`${fullPrompt}\n\nUser Question: ${trimmedMessage}\n\nStrictly follow the response guidelines.`);
        const response = await result.response;
        const aiText = response.text();

        // Save AI Response
        db.prepare('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)').run(currentConversationId, 'assistant', aiText);

        res.json({
            response: aiText,
            conversationId: currentConversationId
        });

    } catch (error) {
        console.error('AI Error:', error.message);

        // Clear and helpful error messages for the user
        let userErrorMessage = 'AI processing failed. Please check your API key.';

        if (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID')) {
            userErrorMessage = 'Your Gemini API key is invalid. Please update it in your Profile.';
        } else if (error.message.includes('models/gemini-1.5-flash is not found') || error.message.includes('404')) {
            userErrorMessage = 'Model error (404). Please run "npm install" in the tutoriq folder to update the AI libraries.';
        } else if (error.message.includes('User location is not supported')) {
            userErrorMessage = 'Gemini API is not available in your region.';
        } else if (error.message.includes('quota') || error.message.includes('limit: 0')) {
            userErrorMessage = 'API Quota Error (Limit 0). Please check your Google AI Studio billing or "Pay-as-you-go" settings. You might need to enable the Free Tier explicitly.';
        }

        res.status(500).json({ error: userErrorMessage, details: error.message });
    }
});

module.exports = router;
