const API = 'http://localhost:3000/api';

const token = localStorage.getItem('token');
const role  = localStorage.getItem('role');
const user  = JSON.parse(localStorage.getItem('user') || '{}');

if (!token || role !== 'admin') {
    window.location.href = 'login.html';
}

document.getElementById('userName').textContent = user.name || 'Admin';

// show team info in topbar
const teamChip = document.getElementById('teamChip');
if (teamChip) teamChip.textContent = user.team_name ? `${user.team_name} (ID: ${user.team_id})` : `Team ${user.team_id}`;

const authHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
});

const formatDate = (str) => new Date(str).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
});

let allIssues = [];

// SECTION SWITCHING
const showSection = (name, el) => {
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(`section-${name}`).classList.add('active');
    el.classList.add('active');
};

const statusBadge = (issue) => {
    const s = issue.status || (issue.resolved ? 'resolved' : 'open');
    const map = {
        open:        { cls: 'badge-open',      icon: 'bi-clock',                    label: 'Open' },
        in_progress: { cls: 'badge-open',      icon: 'bi-arrow-repeat',             label: 'In Progress' },
        resolved:    { cls: 'badge-done',      icon: 'bi-check-circle-fill',        label: 'Resolved' },
        escalated:   { cls: 'badge-escalated', icon: 'bi-exclamation-triangle-fill', label: 'Escalated' },
    };
    const b = map[s] || map.open;
    return `<span class="badge ${b.cls}"><i class="bi ${b.icon}"></i> ${b.label}</span>`;
};

const buildRow = (i, showResolve = false) => `
    <tr>
        <td style="color:var(--butter);font-weight:700">#${i.issue_id}</td>
        <td>
            <div style="font-weight:600;font-size:0.84rem">${i.employee_name || '-'}</div>
            <div style="font-size:0.72rem;color:var(--text-faint)">${i.employee_email || ''}</div>
        </td>
        ${showResolve ? `<td style="font-size:0.82rem;color:var(--text-muted)">${i.team_name || '-'}</td>` : ''}
        <td class="td-query">${i.query}</td>
        <td>${statusBadge(i)}</td>
        <td style="font-size:0.78rem;color:var(--text-faint)">${formatDate(i.created_at)}</td>
        ${showResolve ? `<td>${(!i.resolved && i.status !== 'resolved') ? `<button class="btn-resolve" onclick="resolveIssue(${i.issue_id})">Resolve</button>` : ''}</td>` : ''}
    </tr>
`;

const loadIssues = async () => {
    try {
        const res = await fetch(`${API}/issues`, { headers: authHeaders() });
        const data = await res.json();
        if (!res.ok) return;

        allIssues = data; // already filtered to admin's team by backend
        const open = data.filter(i => !i.resolved && i.status !== 'resolved').length;
        const resolved = data.filter(i => i.resolved || i.status === 'resolved').length;
        const escalated = data.filter(i => i.status === 'escalated').length;

        document.getElementById('statTotal').textContent = data.length;
        document.getElementById('statOpen').textContent = open;
        document.getElementById('statResolved').textContent = resolved;
        document.getElementById('openCount').textContent = open;

        const escalatedEl = document.getElementById('statEscalated');
        if (escalatedEl) escalatedEl.textContent = escalated;

        const recent = [...data].slice(0, 5);
        document.getElementById('recentIssuesBody').innerHTML =
            recent.length ? recent.map(i => buildRow(i, false)).join('') :
            `<tr><td colspan="5" style="text-align:center;color:var(--text-faint);padding:30px">No issues yet</td></tr>`;

        document.getElementById('allIssuesBody').innerHTML =
            data.length ? data.map(i => buildRow(i, true)).join('') :
            `<tr><td colspan="7" style="text-align:center;color:var(--text-faint);padding:30px">No issues yet</td></tr>`;

    } catch {
        console.error('Failed to load issues');
    }
};

const resolveIssue = async (id) => {
    try {
        const res = await fetch(`${API}/issues/${id}/resolve`, {
            method: 'PATCH', headers: authHeaders()
        });
        if (!res.ok) {
            const d = await res.json();
            alert(d.error || 'Failed to resolve');
            return;
        }
        await loadIssues();
    } catch {
        console.error('Failed to resolve issue');
    }
};

const loadEmployees = async () => {
    try {
        const res = await fetch(`${API}/employees/team`, { headers: authHeaders() });
        const data = await res.json();
        const tbody = document.getElementById('employeesBody');
        const sidebarEl = document.getElementById('sidebarEmployeeList');

        if (!res.ok || !data.length) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-faint);padding:30px">No employees in your team yet</td></tr>`;
            if (sidebarEl) sidebarEl.innerHTML = `<div class="sidebar-emp-empty">No employees yet</div>`;
            return;
        }

        tbody.innerHTML = data.map(e => `
            <tr>
                <td style="color:var(--butter);font-weight:700">${e.employee_id}</td>
                <td style="font-weight:600">${e.name}</td>
                <td style="color:var(--text-muted);font-size:0.84rem">${e.email}</td>
                <td style="color:var(--text-muted);font-size:0.84rem">${e.phone || '-'}</td>
            </tr>
        `).join('');

        if (sidebarEl) {
            sidebarEl.innerHTML = data.map(e =>
                `<div class="sidebar-emp-item"><i class="bi bi-person"></i>${e.name}</div>`
            ).join('');
        }
    } catch {
        document.getElementById('employeesBody').innerHTML =
            `<tr><td colspan="4" style="text-align:center;color:var(--text-faint);padding:30px">Failed to load employees</td></tr>`;
    }
};

const loadNotifications = async () => {
    try {
        const res = await fetch(`${API}/notifications`, { headers: authHeaders() });
        const data = await res.json();
        const list = document.getElementById('notifList');

        if (!res.ok || !data.length) {
            list.innerHTML = `<div class="empty-state"><i class="bi bi-bell-slash"></i>No notifications yet</div>`;
            return;
        }

        list.innerHTML = data.map(n => `
            <div class="notif-item">
                <div class="notif-top">
                    <span class="notif-employee"><i class="bi bi-person" style="margin-right:5px"></i>${n.employee_name || 'Employee #' + n.employee_id}</span>
                    <span class="notif-date">${formatDate(n.sent_at)}</span>
                </div>
                <div class="notif-message">${n.message}</div>
                <span class="notif-status ${n.status === 'sent' ? 'status-sent' : 'status-pending'}">
                    <i class="bi ${n.status === 'sent' ? 'bi-check2-circle' : 'bi-hourglass-split'}"></i>
                    ${n.status}
                </span>
            </div>
        `).join('');
    } catch {
        document.getElementById('notifList').innerHTML =
            `<div class="empty-state"><i class="bi bi-bell-slash"></i>Failed to load notifications</div>`;
    }
};

const logout = () => {
    localStorage.clear();
    window.location.href = 'login.html';
};

loadIssues();
loadEmployees();
loadNotifications();
