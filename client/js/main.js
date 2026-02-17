/**
 * TutorIQ General UI Interactions
 */
document.addEventListener('DOMContentLoaded', () => {
    // Show body after load (prevents FOUC)
    document.body.classList.add('loaded');

    // 1. Welcome Message on Dashboard
    const welcomeMsg = document.getElementById('welcomeMessage');
    if (welcomeMsg) {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) welcomeMsg.textContent = `Welcome back, ${user.name.split(' ')[0]}!`;
    }

    // 2. Profile Management
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        // Load existing profile
        async function loadProfile() {
            const profile = await API.get('/api/profile');
            const keyStatus = document.getElementById('keyStatus');
            if (!profile.error) {
                document.getElementById('university').value = profile.university || '';
                document.getElementById('semester').value = profile.semester || '';
                document.getElementById('course').value = profile.course || '';

                // Show key status
                if (profile.gemini_api_key) {
                    document.getElementById('gemini_api_key').placeholder = '••••••••••••••••';
                    if (keyStatus) {
                        keyStatus.textContent = 'Saved ✅';
                        keyStatus.style.backgroundColor = '#d4edda';
                        keyStatus.style.color = '#155724';
                    }
                } else {
                    if (keyStatus) {
                        keyStatus.textContent = 'Missing ❌';
                        keyStatus.style.backgroundColor = '#f8d7da';
                        keyStatus.style.color = '#721c24';
                    }
                }
            }
        }
        loadProfile();

        const keyInput = document.getElementById('gemini_api_key');
        let keyWasModified = false;
        if (keyInput) {
            keyInput.addEventListener('input', () => keyWasModified = true);
        }

        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                university: document.getElementById('university').value,
                semester: document.getElementById('semester').value,
                course: document.getElementById('course').value
            };

            // ONLY send the key if the user actually typed something in this session
            if (keyWasModified && keyInput.value.trim() !== '') {
                data.gemini_api_key = keyInput.value.trim();
            }

            const result = await API.post('/api/profile/update', data);
            const msgDiv = document.getElementById('message');
            const keyStatus = document.getElementById('keyStatus');

            if (result.error) {
                msgDiv.textContent = result.error;
                msgDiv.style.color = 'red';
            } else {
                msgDiv.textContent = result.message;
                msgDiv.style.color = 'green';

                // Update status UI if a key was provided
                if (data.gemini_api_key) {
                    if (keyStatus) {
                        keyStatus.textContent = 'Saved ✅';
                        keyStatus.style.backgroundColor = '#d4edda';
                        keyStatus.style.color = '#155724';
                    }
                    keyInput.value = ''; // Clear the input
                    keyInput.placeholder = '••••••••••••••••';
                    keyWasModified = false;
                }
            }
        });
    }

    // 3. History Management
    const historyList = document.getElementById('historyList');
    if (historyList) {
        async function loadHistory() {
            const history = await API.get('/api/history');
            if (history.error) {
                historyList.innerHTML = `<p>${history.error}</p>`;
                return;
            }

            if (history.length === 0) {
                historyList.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 2.5rem; color: var(--on-surface-variant);">
                        <p style="font-size: 1.1rem; margin-bottom: 1rem; font-weight: 500;">Your study journey is just beginning!</p>
                        <p style="font-size: 0.9rem; margin-bottom: 1.5rem; opacity: 0.8;">Start a new session with our AI tools to see your history here.</p>
                        <a href="tools.html" class="btn btn-primary">Open AI Tools</a>
                    </div>
                `;
                return;
            }

            historyList.innerHTML = history.map(item => `
        <div class="card">
          <h3>${capitalize(item.tool_name)}</h3>
          <p>Created: ${new Date(item.created_at).toLocaleDateString()}</p>
          <div class="mt-1">
            <button class="btn btn-secondary btn-sm view-btn" data-id="${item.id}">View</button>
            <button class="btn btn-secondary btn-sm delete-btn" data-id="${item.id}" style="color:red">Delete</button>
          </div>
        </div>
      `).join('');

            // Add listeners
            document.querySelectorAll('.view-btn').forEach(btn => {
                btn.addEventListener('click', () => viewConversation(btn.dataset.id));
            });
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', () => deleteConversation(btn.dataset.id));
            });
        }

        async function viewConversation(id) {
            const messages = await API.get(`/api/history/${id}`);
            const list = document.getElementById('historyList');
            const detail = document.getElementById('chatDetailContainer');
            const detailMessages = document.getElementById('detailMessages');

            list.classList.add('hidden');
            detail.classList.remove('hidden');

            detailMessages.innerHTML = ''; // Clear

            messages.forEach(m => {
                const msgDiv = document.createElement('div');
                msgDiv.className = `message message-${m.role}`;

                if (m.role === 'assistant') {
                    // Add Entire Message Copy Button
                    const copyBtn = document.createElement('button');
                    copyBtn.className = 'message-copy-btn';
                    copyBtn.innerHTML = '<span>📄</span> Copy All';
                    copyBtn.title = 'Copy entire response';
                    copyBtn.onclick = () => copyToClipboard(m.content, copyBtn);
                    msgDiv.appendChild(copyBtn);

                    const contentDiv = document.createElement('div');
                    contentDiv.innerHTML = typeof marked !== 'undefined' ? marked.parse(m.content) : m.content.replace(/\n/g, '<br>');

                    // Add Copy Buttons to each Code Block
                    contentDiv.querySelectorAll('pre').forEach((pre) => {
                        const code = pre.querySelector('code');
                        if (code) {
                            const codeCopyBtn = document.createElement('button');
                            codeCopyBtn.className = 'code-copy-btn';
                            codeCopyBtn.innerHTML = 'Copy';
                            codeCopyBtn.onclick = () => copyToClipboard(code.innerText, codeCopyBtn);
                            pre.appendChild(codeCopyBtn);
                        }
                    });

                    msgDiv.appendChild(contentDiv);
                } else {
                    msgDiv.textContent = m.content;
                }

                detailMessages.appendChild(msgDiv);
            });

            // Highlight and Math
            if (typeof hljs !== 'undefined') {
                detailMessages.querySelectorAll('pre code').forEach((block) => {
                    hljs.highlightElement(block);
                });
            }
            if (typeof renderMathInElement === 'function') {
                renderMathInElement(detailMessages, {
                    delimiters: [
                        { left: '$$', right: '$$', display: true },
                        { left: '$', right: '$', display: false },
                        { left: '\\(', right: '\\)', display: false },
                        { left: '\\[', right: '\\]', display: true }
                    ],
                    throwOnError: false
                });
            }
        }

        async function copyToClipboard(text, btn) {
            try {
                await navigator.clipboard.writeText(text);
                const originalHTML = btn.innerHTML;
                btn.innerHTML = btn.classList.contains('code-copy-btn') ? 'Copied!' : '<span>✅</span> Copied!';
                btn.classList.add('copied');
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.classList.remove('copied');
                }, 2000);
            } catch (err) {
                console.error('Failed to copy: ', err);
                btn.innerHTML = '❌ Error';
            }
        }

        async function deleteConversation(id) {
            if (confirm('Are you sure you want to delete this conversation?')) {
                await API.delete(`/api/history/${id}`);
                loadHistory();
            }
        }

        const backBtn = document.getElementById('backToHistory');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                document.getElementById('historyList').classList.remove('hidden');
                document.getElementById('chatDetailContainer').classList.add('hidden');
            });
        }

        const clearAllBtn = document.getElementById('clearAllBtn');
        if (clearAllBtn) {
            console.log('Found clearAllBtn, adding listener');
            clearAllBtn.addEventListener('click', async () => {
                console.log('clearAllBtn clicked');
                if (confirm('Are you sure you want to delete ALL of your study history? This cannot be undone.')) {
                    console.log('Confirmation received, calling API...');
                    const result = await API.delete('/api/history/all/clear');
                    console.log('API Result:', result);
                    if (result.error) {
                        alert('Error: ' + result.error);
                    } else {
                        alert('Success: All history has been cleared.');
                        loadHistory();
                    }
                }
            });
        }

        loadHistory();
    }

    function capitalize(s) {
        return s.charAt(0).toUpperCase() + s.slice(1);
    }
});
