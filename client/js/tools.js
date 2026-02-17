/**
 * TutorIQ Tools Chat Logic
 */
document.addEventListener('DOMContentLoaded', () => {
    const toolBtns = document.querySelectorAll('.tool-btn');
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const descText = document.getElementById('descText');

    const descriptions = {
        answerMaker: 'Get high-yield, exam-focused academic answers in seconds.',
        exerciseMaker: 'Generate practice questions tailored to your syllabus.',
        learnerBuddy: 'Deep dive into concepts with a 4-part structured journey.',
        problemSolver: 'Step-by-step C++ & DBMS problem solving with expert logic.'
    };

    let activeTool = 'answerMaker';
    let conversationId = null;

    // Tool Selection
    toolBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            toolBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeTool = btn.dataset.tool;
            descText.textContent = descriptions[activeTool];

            // Toggle Config Sections
            document.querySelectorAll('.config-section').forEach(s => s.classList.add('hidden'));
            const activeConfig = document.getElementById(`config-${activeTool}`);
            if (activeConfig) {
                activeConfig.classList.remove('hidden');
            } else {
                document.getElementById('config-generic').classList.remove('hidden');
            }

            // Reset Chat for new tool
            chatMessages.innerHTML = `
        <div class="message message-assistant">
          Switched to <strong>${btn.textContent}</strong>. Adjust the settings on the left if needed, then type your topic below!
        </div>
      `;
            conversationId = null;

            // Load Draft for this tool
            chatInput.value = localStorage.getItem(`draft_${activeTool}`) || '';
            chatInput.focus();

            // Load sidebar settings
            if (activeTool === 'answerMaker') {
                document.getElementById('ans-subject').value = localStorage.getItem(`setting_${activeTool}_subject`) || '';
                document.getElementById('ans-marks').value = localStorage.getItem(`setting_${activeTool}_marks`) || '2';
            } else if (activeTool === 'exerciseMaker') {
                document.getElementById('exe-subject').value = localStorage.getItem(`setting_${activeTool}_subject`) || '';
                document.getElementById('exe-short-qty').value = localStorage.getItem(`setting_${activeTool}_shortQty`) || '5';
                document.getElementById('exe-med-qty').value = localStorage.getItem(`setting_${activeTool}_medQty`) || '2';
                document.getElementById('exe-long-qty').value = localStorage.getItem(`setting_${activeTool}_longQty`) || '1';
            } else {
                document.getElementById('gen-subject').value = localStorage.getItem(`setting_${activeTool}_subject`) || '';
            }
        });
    });

    // Save sidebar settings on input
    document.querySelectorAll('.tool-config-panel input, .tool-config-panel select').forEach(input => {
        input.addEventListener('input', () => {
            const tool = input.closest('.config-section').id.replace('config-', '');
            const key = input.id.split('-').pop(); // e.g. 'subject' from 'ans-subject'
            localStorage.setItem(`setting_${tool}_${key}`, input.value);
        });
    });

    // Save Draft on Input
    chatInput.addEventListener('input', () => {
        localStorage.setItem(`draft_${activeTool}`, chatInput.value);
    });

    // Initial Draft Load
    chatInput.value = localStorage.getItem(`draft_${activeTool}`) || '';

    // Sending Messages
    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        // Collect Dynamic Data
        let toolData = {};
        if (activeTool === 'answerMaker') {
            toolData.subject = document.getElementById('ans-subject').value;
            toolData.marks = document.getElementById('ans-marks').value;
        } else if (activeTool === 'exerciseMaker') {
            toolData.subject = document.getElementById('exe-subject').value;
            toolData.shortQty = document.getElementById('exe-short-qty').value;
            toolData.medQty = document.getElementById('exe-med-qty').value;
            toolData.longQty = document.getElementById('exe-long-qty').value;
        } else {
            toolData.subject = document.getElementById('gen-subject').value;
        }

        // Persist sidebar settings manually (or just rely on the existing inputs)
        // Actually, we should save these to localStorage so they survive page navigation
        Object.keys(toolData).forEach(key => {
            localStorage.setItem(`setting_${activeTool}_${key}`, toolData[key]);
        });

        // Append User Message
        appendMessage('user', text);
        chatInput.value = '';
        localStorage.removeItem(`draft_${activeTool}`); // Clear draft after sending

        // Show Typing Indicator
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message message-assistant typing';
        typingDiv.innerHTML = 'Thinking about your success';
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Call API
        const result = await API.post('/api/ai/chat', {
            toolType: activeTool,
            message: text,
            conversationId: conversationId,
            toolData: toolData // Send extra data
        });

        // Remove Typing Indicator
        chatMessages.removeChild(typingDiv);

        if (result.error) {
            appendMessage('assistant', `⚠️ **Oops!** ${result.error}\n\n*Pro Tip: Ensure your Gemini API Key is active in the Profile!*`);
        } else {
            conversationId = result.conversationId;
            appendMessage('assistant', result.response);
        }
    }

    function appendMessage(role, content) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message message-${role}`;

        if (role === 'assistant') {
            // Add Entire Message Copy Button
            const copyBtn = document.createElement('button');
            copyBtn.className = 'message-copy-btn';
            copyBtn.innerHTML = '<span>📄</span> Copy All';
            copyBtn.title = 'Copy entire response';
            copyBtn.onclick = () => copyToClipboard(content, copyBtn);
            msgDiv.appendChild(copyBtn);

            // Parse Markdown for AI
            const contentDiv = document.createElement('div');
            contentDiv.innerHTML = marked.parse(content);
            msgDiv.appendChild(contentDiv);

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

            // Highlight code blocks
            contentDiv.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });

            // Render Math (KaTeX)
            if (typeof renderMathInElement === 'function') {
                renderMathInElement(contentDiv, {
                    delimiters: [
                        { left: '$$', right: '$$', display: true },
                        { left: '$', right: '$', display: false },
                        { left: '\\(', right: '\\)', display: false },
                        { left: '\\[', right: '\\]', display: true }
                    ],
                    throwOnError: false
                });
            }
        } else {
            // Text only for user (safe)
            msgDiv.textContent = content;
        }

        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
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

    const scrollBtn = document.getElementById('scrollToBottom');

    // Scroll to Bottom Logic
    if (scrollBtn) {
        chatMessages.addEventListener('scroll', () => {
            if (chatMessages.scrollTop < chatMessages.scrollHeight - chatMessages.clientHeight - 100) {
                scrollBtn.classList.add('visible');
            } else {
                scrollBtn.classList.remove('visible');
            }
        });

        scrollBtn.addEventListener('click', () => {
            chatMessages.scrollTo({
                top: chatMessages.scrollHeight,
                behavior: 'smooth'
            });
        });
    }

    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
});

