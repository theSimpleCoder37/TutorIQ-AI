/**
 * TutorIQ Authentication Logic
 */
document.addEventListener('DOMContentLoaded', () => {
    // Show body after load (prevents FOUC)
    document.body.classList.add('loaded');

    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const logoutBtn = document.getElementById('logoutBtn');
    const messageDiv = document.getElementById('message');

    // Signup Logic
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;

            if (!email.toLowerCase().endsWith('@gmail.com')) {
                messageDiv.textContent = 'Error: Only @gmail.com addresses are supported.';
                messageDiv.style.color = '#D32F2F';
                return;
            }

            if (password.length < 6) {
                messageDiv.textContent = 'Error: Password must be at least 6 characters.';
                messageDiv.style.color = '#D32F2F';
                return;
            }

            messageDiv.textContent = 'Creating account...';
            messageDiv.style.color = 'var(--primary)';

            const result = await API.post('/api/auth/register', { name, email, password });

            if (result.error) {
                messageDiv.textContent = result.error;
            } else {
                alert('Registration successful! Please login.');
                window.location.href = 'login.html';
            }
        });
    }

    // Login Logic
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;

            if (!email.toLowerCase().endsWith('@gmail.com')) {
                messageDiv.textContent = 'Error: Please use your @gmail.com account.';
                messageDiv.style.color = '#D32F2F';
                return;
            }

            messageDiv.textContent = 'Signing in...';
            messageDiv.style.color = 'var(--primary)';

            const result = await API.post('/api/auth/login', { email, password });

            if (result.error) {
                messageDiv.textContent = result.error;
            } else {
                localStorage.setItem('user', JSON.stringify(result.user));
                window.location.href = 'dashboard.html';
            }
        });
    }

    // Logout Logic
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await API.post('/api/auth/logout', {});
            localStorage.removeItem('user');
            window.location.href = 'login.html';
        });
    }

    // Check if protected page
    if (document.body.classList.contains('protected')) {
        const user = localStorage.getItem('user');
        if (!user) {
            window.location.href = 'login.html';
        }
    }
});
