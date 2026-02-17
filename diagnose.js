const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('./server/db');

async function test() {
    console.log('--- TutorIQ AI Diagnostic ---');
    try {
        const profile = db.prepare('SELECT gemini_api_key FROM profiles LIMIT 1').get();
        if (!profile || !profile.gemini_api_key) {
            console.error('Error: No API key found in database. Please set it in your Profile.');
            return;
        }

        const key = profile.gemini_api_key;
        console.log(`Using API Key: ${key.substring(0, 4)}...${key.substring(key.length - 4)}`);

        const genAI = new GoogleGenerativeAI(key);

        console.log('1. Attempting to list available models...');
        try {
            // listModels is the best way to see what's actually available
            // but it requires a newer SDK version
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
            const data = await response.json();
            if (data.models) {
                console.log('Available models found:');
                data.models.forEach(m => console.log(`  - ${m.name}`));
            } else {
                console.log('No models listed in response:', JSON.stringify(data));
            }
        } catch (e) {
            console.log('Could not list models via REST:', e.message);
        }

        console.log('\n2. Testing specific model variants...');
        const modelsToTry = [
            'gemini-1.5-flash',
            'gemini-1.5-flash-8b',
            'gemini-2.0-flash-exp',
            'gemini-pro'
        ];

        for (const modelName of modelsToTry) {
            console.log(`\nTesting model: ${modelName}...`);
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent('Hi');
                const response = await result.response;
                console.log(`  SUCCESS: Response from ${modelName}: ${response.text()}`);
                break; // Stop if we find a working one
            } catch (err) {
                console.error(`  FAILED: ${modelName} - ${err.message}`);
            }
        }

    } catch (error) {
        console.error('\nCRITICAL DIAGNOSTIC ERROR:', error.message);
    }
    console.log('\n-------------------------------');
}

test();
