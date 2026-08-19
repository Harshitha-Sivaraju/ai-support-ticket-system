const API = 'http://localhost:3000/api';

const token = localStorage.getItem('token');
const role  = localStorage.getItem('role');
const user  = JSON.parse(localStorage.getItem('user') || '{}');

if (!token || role !== 'employee') {
    window.location.href = 'login.html';
}

document.getElementById('userName').textContent = user.name || 'Employee';

// team chip — same pattern as admin dashboard
const teamChip = document.getElementById('teamChip');
if (teamChip) teamChip.textContent = user.team_name ? `${user.team_name} (ID: ${user.team_id})` : `Team ${user.team_id}`;

const authHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
});

const showAlert = (msg, type = 'error') => {
    const box = document.getElementById('alertBox');
    document.getElementById('alertMsg').textContent = msg;
    document.getElementById('alertIcon').className = type === 'error' ? 'bi bi-exclamation-circle-fill' : 'bi bi-check-circle-fill';
    box.className = `alert-box ${type}`;
    if (type === 'success') setTimeout(() => box.className = 'alert-box', 3000);
};

const formatDate = (str) => new Date(str).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
});

let issues = [];

// Per-issue chat history stored in memory: { [issue_id]: [{role, parts:[{text}]}] }
const chatHistories = {};

const statusBadge = (issue) => {
    const s = issue.status || (issue.resolved ? 'resolved' : 'open');
    const map = {
        open:       { cls: 'badge-open',      icon: 'bi-clock',              label: 'Open' },
        in_progress:{ cls: 'badge-open',      icon: 'bi-arrow-repeat',       label: 'In Progress' },
        resolved:   { cls: 'badge-done',      icon: 'bi-check-circle-fill',  label: 'Resolved' },
        escalated:  { cls: 'badge-escalated', icon: 'bi-exclamation-triangle-fill', label: 'Escalated' },
    };
    const b = map[s] || map.open;
    return `<span class="badge ${b.cls}"><i class="bi ${b.icon}"></i> ${b.label}</span>`;
};

const renderIssues = () => {
    const list = document.getElementById('issuesList');
    if (issues.length === 0) {
        list.innerHTML = `<div class="empty-state"><i class="bi bi-inbox"></i>No issues submitted yet</div>`;
        return;
    }
    list.innerHTML = issues.map(i => `
        <div class="issue-item" id="item-${i.issue_id}" onclick="showDetail(${i.issue_id})">
            <div class="issue-item-top">
                <span class="issue-id">#${i.issue_id}</span>
                <span class="issue-date">${formatDate(i.created_at)}</span>
            </div>
            <div class="issue-query">${i.query}</div>
            <div style="margin-top:6px">${statusBadge(i)}</div>
        </div>
    `).join('');
};

const loadIssues = async () => {
    try {
        const res = await fetch(`${API}/issues`, { headers: authHeaders() });
        const data = await res.json();
        if (!res.ok) { showAlert(data.error || 'Failed to load issues'); return; }
        issues = data;
        renderIssues();
        if (issues.length > 0) showDetail(issues[0].issue_id);
    } catch {
        showAlert('Cannot connect to server.');
    }
};

// Track which issue is currently open so chat knows the context
let activeIssueId = null;

const addChatBubble = (role, text) => {
    const container = document.getElementById('chatMessages');
    const isGemini = role === 'model';
    const div = document.createElement('div');
    div.innerHTML = `
        <div class="chat-label ${isGemini ? 'gemini' : 'user'}">${isGemini ? 'Gemini' : 'You'}</div>
        <div class="chat-bubble ${isGemini ? 'gemini' : 'user'}">${text}</div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
};

const showDetail = (id) => {
    const issue = issues.find(i => i.issue_id === id);
    if (!issue) return;

    activeIssueId = id;

    document.querySelectorAll('.issue-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`item-${id}`)?.classList.add('active');

    document.getElementById('detailPlaceholder').style.display = 'none';
    const detail = document.getElementById('issueDetail');
    detail.classList.add('visible');

    document.getElementById('detailId').textContent = `Issue #${issue.issue_id}`;
    document.getElementById('detailDate').textContent = formatDate(issue.created_at);
    document.getElementById('detailQuery').textContent = issue.query;

    document.getElementById('detailBadge').outerHTML;
    document.getElementById('detailBadge').className = '';
    document.getElementById('detailBadge').innerHTML = '';
    document.getElementById('detailBadge').outerHTML = statusBadge(issue).replace('span class=', 'span id="detailBadge" class=');

    // Render chat — seed with initial Gemini response if no history yet
    const chatContainer = document.getElementById('chatMessages');
    chatContainer.innerHTML = '';
    chatContainer.className = 'ai-box chat-messages';

    if (!chatHistories[id]) {
        chatHistories[id] = [];
        // Seed history with the initial exchange so Gemini has context
        if (issue.gemini_response) {
            chatHistories[id].push({ role: 'user',  parts: [{ text: issue.query }] });
            chatHistories[id].push({ role: 'model', parts: [{ text: issue.gemini_response }] });
        }
    }

    // Render existing history (skip the seeded initial pair — show from index 0 as Gemini's first message)
    const history = chatHistories[id];
    if (history.length >= 2) {
        // First model message is the initial Gemini response
        addChatBubble('model', history[1].parts[0].text);
        // Render any subsequent turns
        for (let i = 2; i < history.length; i++) {
            addChatBubble(history[i].role, history[i].parts[0].text);
        }
    } else {
        chatContainer.innerHTML = `<div style="font-size:0.85rem;color:var(--text-faint)">AI response not available.</div>`;
    }

    // Enable/disable chat input based on status
    const status = issue.status || (issue.resolved ? 'resolved' : 'open');
    const chatInput = document.getElementById('chatInput');
    const chatSendBtn = document.getElementById('chatSendBtn');
    const isActive = status !== 'resolved' && status !== 'escalated';
    chatInput.disabled = !isActive;
    chatSendBtn.disabled = !isActive;

    // action buttons
    const actionsEl = document.getElementById('detailActions');
    if (status === 'resolved') {
        actionsEl.innerHTML = `<div style="font-size:0.8rem;color:var(--text-faint)">This issue has been resolved.</div>`;
    } else if (status === 'escalated') {
        actionsEl.innerHTML = `<div style="font-size:0.8rem;color:var(--text-faint)">Escalated to admin. Awaiting response.</div>`;
    } else {
        actionsEl.innerHTML = `
            <button class="btn-primary" style="font-size:0.82rem;padding:8px 16px" onclick="resolveOwn(${issue.issue_id})">
                <i class="bi bi-check-circle-fill"></i> Mark as Resolved
            </button>
            <button class="btn-escalate" onclick="escalate(${issue.issue_id})">
                <i class="bi bi-exclamation-triangle-fill"></i> Contact Admin
            </button>
        `;
    }
};

const sendChat = async () => {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message || !activeIssueId) return;

    const btn = document.getElementById('chatSendBtn');
    input.value = '';
    input.disabled = true;
    btn.disabled = true;

    addChatBubble('user', message);

    // Add user message to history before sending
    const history = chatHistories[activeIssueId] || [];
    history.push({ role: 'user', parts: [{ text: message }] });

    try {
        const res = await fetch(`${API}/issues/${activeIssueId}/chat`, {
            method: 'POST',
            headers: authHeaders(),
            // Send history BEFORE the new message (exclude the last user entry we just pushed)
            body: JSON.stringify({ message, history: history.slice(0, -1) })
        });
        const data = await res.json();
        if (!res.ok) {
            addChatBubble('model', data.error || 'Failed to get response.');
            history.pop(); // remove failed user message
        } else {
            addChatBubble('model', data.reply);
            history.push({ role: 'model', parts: [{ text: data.reply }] });
        }
        chatHistories[activeIssueId] = history;
    } catch {
        addChatBubble('model', 'Cannot connect to server.');
        history.pop();
    } finally {
        input.disabled = false;
        btn.disabled = false;
        input.focus();
    }
};

// Allow Enter key to send chat
document.getElementById('chatInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
});

const resolveOwn = async (id) => {
    try {
        const res = await fetch(`${API}/issues/${id}/resolve-self`, {
            method: 'PATCH', headers: authHeaders()
        });
        const data = await res.json();
        if (!res.ok) { showAlert(data.error || 'Failed to resolve'); return; }
        showAlert('Issue marked as resolved!', 'success');
        await loadIssues();
        showDetail(id);
    } catch {
        showAlert('Cannot connect to server.');
    }
};

const escalate = async (id) => {
    try {
        const res = await fetch(`${API}/issues/${id}/escalate`, {
            method: 'PATCH', headers: authHeaders()
        });
        const data = await res.json();
        if (!res.ok) { showAlert(data.error || 'Failed to escalate'); return; }
        const note = data.sms_sent ? 'Admin notified via SMS.' : 'Admin notified (SMS pending setup).';
        showAlert(`Escalated to admin. ${note}`, 'success');
        await loadIssues();
        showDetail(id);
    } catch {
        showAlert('Cannot connect to server.');
    }
};

document.getElementById('issueForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    const btnText = document.getElementById('submitBtnText');
    const query = document.getElementById('queryInput').value.trim();
    if (!query) return;

    btn.disabled = true;
    btnText.textContent = 'Submitting...';

    try {
        const res = await fetch(`${API}/issues`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ query })
        });

        const data = await res.json();
        if (!res.ok) { showAlert(data.error || 'Failed to submit issue'); return; }

        showAlert('Issue submitted!', 'success');
        document.getElementById('queryInput').value = '';
        await loadIssues();
        showDetail(data.issue_id);

    } catch {
        showAlert('Cannot connect to server.');
    } finally {
        btn.disabled = false;
        btnText.textContent = 'Submit Issue';
    }
});

const logout = () => {
    localStorage.clear();
    window.location.href = 'login.html';
};

loadIssues();
