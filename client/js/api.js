/**
 * TutorIQ API Wrapper
 */
const API = {
    async post(url, data) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                const text = await response.text();
                try {
                    const json = JSON.parse(text);
                    return { error: json.error || `Server error: ${response.status}`, details: json.details };
                } catch (e) {
                    return { error: `Server error: ${response.status}`, details: text };
                }
            }
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            return { error: 'Network error. Please ensure the server is running.' };
        }
    },

    async get(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                const text = await response.text();
                try {
                    const json = JSON.parse(text);
                    return { error: json.error || `Server error: ${response.status}`, details: json.details };
                } catch (e) {
                    return { error: `Server error: ${response.status}`, details: text };
                }
            }
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            return { error: 'Network error. Please try again.' };
        }
    },

    async delete(url) {
        try {
            const response = await fetch(url, { method: 'DELETE' });
            if (!response.ok) {
                const text = await response.text();
                try {
                    const json = JSON.parse(text);
                    return { error: json.error || `Server error: ${response.status}`, details: json.details };
                } catch (e) {
                    return { error: `Server error: ${response.status}`, details: text };
                }
            }
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            return { error: 'Network error. Please ensure the server is running and try again.' };
        }
    }
};
