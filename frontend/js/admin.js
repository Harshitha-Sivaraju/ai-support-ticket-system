const API = "http://localhost:3000/api";

const token = localStorage.getItem("token");
const role = localStorage.getItem("role");
const user = JSON.parse(localStorage.getItem("user") || "{}");

if (!token || role !== "admin") {
  window.location.href = "login.html";
}

document.getElementById("userName").textContent = user.name || "Admin";

// show team info in topbar
const teamChip = document.getElementById("teamChip");
if (teamChip)
  teamChip.textContent = user.team_name
    ? `${user.team_name} (ID: ${user.team_id})`
    : `Team ${user.team_id}`;

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
});

const formatDate = (str) =>
  new Date(str).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

let allIssues = [];
let allSupportTickets = [];

// SECTION SWITCHING
const showSection = (name, el) => {
  document
    .querySelectorAll(".page-section")
    .forEach((s) => s.classList.remove("active"));
  document
    .querySelectorAll(".nav-item")
    .forEach((n) => n.classList.remove("active"));
  document.getElementById(`section-${name}`).classList.add("active");
  el.classList.add("active");
};

const statusBadge = (issue) => {
  const s = issue.status || (issue.resolved ? "resolved" : "open");
  const map = {
    open: { cls: "badge-open", icon: "bi-clock", label: "Open" },
    in_progress: {
      cls: "badge-open",
      icon: "bi-arrow-repeat",
      label: "In Progress",
    },
    resolved: {
      cls: "badge-done",
      icon: "bi-check-circle-fill",
      label: "Resolved",
    },
    escalated: {
      cls: "badge-escalated",
      icon: "bi-exclamation-triangle-fill",
      label: "Escalated",
    },
  };
  const b = map[s] || map.open;
  return `<span class="badge ${b.cls}"><i class="bi ${b.icon}"></i> ${b.label}</span>`;
};

const buildRow = (i, showResolve = false) => `
    <tr>
        <td style="color:var(--butter);font-weight:700">#${i.issue_id}</td>
        <td>
            <div style="font-weight:600;font-size:0.84rem">${i.employee_name || "-"}</div>
            <div style="font-size:0.72rem;color:var(--text-faint)">${i.employee_email || ""}</div>
        </td>
        ${showResolve ? `<td style="font-size:0.82rem;color:var(--text-muted)">${i.team_name || "-"}</td>` : ""}
        <td class="td-query">${i.query}</td>
        <td>${statusBadge(i)}</td>
        <td style="font-size:0.78rem;color:var(--text-faint)">${formatDate(i.created_at)}</td>
        ${showResolve ? `<td>${!i.resolved && i.status !== "resolved" ? `<button class="btn-resolve" onclick="resolveIssue(${i.issue_id})">Resolve</button>` : ""}</td>` : ""}
    </tr>
`;

const loadIssues = async () => {
  try {
    const res = await fetch(`${API}/issues`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) return;

    allIssues = data; // already filtered to admin's team by backend
    const open = data.filter(
      (i) => !i.resolved && i.status !== "resolved",
    ).length;
    const resolved = data.filter(
      (i) => i.resolved || i.status === "resolved",
    ).length;
    const escalated = data.filter((i) => i.status === "escalated").length;

    document.getElementById("statTotal").textContent = data.length;
    document.getElementById("statOpen").textContent = open;
    document.getElementById("statResolved").textContent = resolved;
    document.getElementById("openCount").textContent = open;

    const escalatedEl = document.getElementById("statEscalated");
    if (escalatedEl) escalatedEl.textContent = escalated;

    const recent = [...data].slice(0, 5);
    document.getElementById("recentIssuesBody").innerHTML = recent.length
      ? recent.map((i) => buildRow(i, false)).join("")
      : `<tr><td colspan="5" style="text-align:center;color:var(--text-faint);padding:30px">No issues yet</td></tr>`;

    document.getElementById("allIssuesBody").innerHTML = data.length
      ? data.map((i) => buildRow(i, true)).join("")
      : `<tr><td colspan="7" style="text-align:center;color:var(--text-faint);padding:30px">No issues yet</td></tr>`;
  } catch {
    console.error("Failed to load issues");
  }
};

const supportTicketStatusBadge = (status) => {
  const map = {
    open: {
      cls: "badge-open",
      icon: "bi-clock",
      label: "Open",
    },
    in_progress: {
      cls: "badge-open",
      icon: "bi-arrow-repeat",
      label: "In Progress",
    },
    resolved: {
      cls: "badge-done",
      icon: "bi-check-circle-fill",
      label: "Resolved",
    },
    recovery: {
      cls: "badge-escalated",
      icon: "bi-cash-coin",
      label: "Recovery",
    },
  };

  const b = map[status] || map.open;

  return `<span class="badge ${b.cls}">
        <i class="bi ${b.icon}"></i> ${b.label}
    </span>`;
};

const supportTicketPriorityBadge = (priority) => {
  const map = {
    critical: {
      cls: "badge-escalated",
      label: "Critical",
    },
    high: {
      cls: "badge-escalated",
      label: "High",
    },
    medium: {
      cls: "badge-open",
      label: "Medium",
    },
    low: {
      cls: "badge-done",
      label: "Low",
    },
  };

  const b = map[priority] || map.medium;

  return `<span class="badge ${b.cls}">${b.label}</span>`;
};

const loadSupportTickets = async () => {
    try {
        const res = await fetch(`${API}/support-tickets`, {
            headers: authHeaders()
        });

        const data = await res.json();

        if (!res.ok) {
            console.error(data.error || 'Failed to load support tickets');
            return;
        }

        allSupportTickets = data;

        // -----------------------------
        // SIDEBAR COUNT
        // -----------------------------
        const countEl = document.getElementById('supportTicketCount');

        const openTickets = data.filter(
            t => t.status !== 'resolved'
        ).length;

        if (countEl) {
            countEl.textContent = openTickets;
        }


        // -----------------------------
        // OVERVIEW STATS
        // -----------------------------
        const total = data.length;

        const open = data.filter(
            t => t.status === 'open' ||
                 t.status === 'in_progress'
        ).length;

        const recovery = data.filter(
            t => t.status === 'recovery'
        ).length;

        const resolved = data.filter(
            t => t.status === 'resolved'
        ).length;

        const statTickets = document.getElementById('statTickets');
        const statOpenTickets = document.getElementById('statOpenTickets');
        const statRecovery = document.getElementById('statRecovery');
        const statResolvedTickets = document.getElementById('statResolvedTickets');

        if (statTickets) {
            statTickets.textContent = total;
        }

        if (statOpenTickets) {
            statOpenTickets.textContent = open;
        }

        if (statRecovery) {
            statRecovery.textContent = recovery;
        }

        if (statResolvedTickets) {
            statResolvedTickets.textContent = resolved;
        }


        // -----------------------------
        // RECENT TICKETS - OVERVIEW
        // -----------------------------
        const recentBody =
            document.getElementById('recentSupportTicketsBody');

        if (recentBody) {

            const recent = data.slice(0, 5);

            if (!recent.length) {

                recentBody.innerHTML = `
                    <tr>
                        <td colspan="6"
                            style="
                                text-align:center;
                                color:var(--text-faint);
                                padding:30px;
                            ">
                            No support tickets yet
                        </td>
                    </tr>
                `;

            } else {

                recentBody.innerHTML = recent.map(t => `
                    <tr>

                        <td style="color:var(--butter);font-weight:700">
                            #${t.ticket_id}
                        </td>

                        <td>
                            <div style="font-weight:600;font-size:0.84rem">
                                ${t.customer_name || '-'}
                            </div>
                            <div style="font-size:0.72rem;color:var(--text-faint)">
                                ${t.customer_email || ''}
                            </div>
                        </td>

                        <td style="font-size:0.82rem;color:var(--text-muted)">
                            ${t.transaction_id}
                        </td>

                        <td>
                            ${supportTicketPriorityBadge(t.ai_priority)}
                        </td>

                        <td>
                            ${supportTicketStatusBadge(t.status)}
                        </td>

                        <td style="font-size:0.78rem;color:var(--text-faint)">
                            ${formatDate(t.created_at)}
                        </td>

                    </tr>
                `).join('');
            }
        }


        // -----------------------------
        // SUPPORT TICKETS PAGE
        // -----------------------------
        const tbody =
            document.getElementById('supportTicketsBody');

        if (!tbody) return;

        if (!data.length) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="8"
                        style="
                            text-align:center;
                            color:var(--text-faint);
                            padding:30px;
                        ">
                        No support tickets yet
                    </td>
                </tr>
            `;

            return;
        }

        tbody.innerHTML = data.map(t => `
            <tr>

                <td style="color:var(--butter);font-weight:700">
                    #${t.ticket_id}
                </td>

                <td>
                    <div style="font-weight:600;font-size:0.84rem">
                        ${t.customer_name || '-'}
                    </div>

                    <div style="font-size:0.72rem;color:var(--text-faint)">
                        ${t.customer_email || ''}
                    </div>
                </td>

                <td style="font-size:0.82rem;color:var(--text-muted)">
                    ${t.transaction_id}
                </td>

                <td class="td-query">
                    ${t.customer_message}
                </td>

                <td>
                    ${supportTicketPriorityBadge(t.ai_priority)}
                </td>

                <td>
                    ${supportTicketStatusBadge(t.status)}
                </td>

                <td style="font-size:0.78rem;color:var(--text-faint)">
                    ${formatDate(t.created_at)}
                </td>

                <td>
                    <button
                        class="btn-resolve"
                        onclick="updateSupportTicketStatus(${t.ticket_id}, '${t.status}')">
                        Manage
                    </button>
                </td>

            </tr>
        `).join('');

    } catch (err) {

        console.error('Failed to load support tickets:', err);

        const tbody =
            document.getElementById('supportTicketsBody');

        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8"
                        style="
                            text-align:center;
                            color:var(--text-faint);
                            padding:30px;
                        ">
                        Failed to load support tickets
                    </td>
                </tr>
            `;
        }
    }
};


const updateSupportTicketStatus = async (id, currentStatus) => {

    const ticket = allSupportTickets.find(
        t => Number(t.ticket_id) === Number(id)
    );

    if (!ticket) {
        alert('Support ticket not found.');
        return;
    }

    const transaction = ticket.transaction || {};

    document.getElementById('supportTicketModalId').textContent =
        `Ticket #${ticket.ticket_id}`;

    const priorityLabels = {
        critical: 'Critical',
        high: 'High',
        medium: 'Medium',
        low: 'Low'
    };

    const statusLabels = {
        open: 'Open',
        in_progress: 'In Progress',
        recovery: 'Recovery',
        resolved: 'Resolved'
    };


    document.getElementById('supportTicketDetails').innerHTML = `

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px;">

            <div>
                <div style="font-size:0.7rem;color:var(--text-faint);margin-bottom:4px;">
                    CUSTOMER
                </div>
                <div style="font-weight:600;">
                    ${ticket.customer_name || '-'}
                </div>
                <div style="font-size:0.75rem;color:var(--text-muted);">
                    ${ticket.customer_email || ''}
                </div>
            </div>

            <div>
                <div style="font-size:0.7rem;color:var(--text-faint);margin-bottom:4px;">
                    TRANSACTION
                </div>
                <div style="font-weight:600;">
                    ${ticket.transaction_id}
                </div>
            </div>

            <div>
                <div style="font-size:0.7rem;color:var(--text-faint);margin-bottom:4px;">
                    AI PRIORITY
                </div>
                ${supportTicketPriorityBadge(ticket.ai_priority)}
            </div>

            <div>
                <div style="font-size:0.7rem;color:var(--text-faint);margin-bottom:4px;">
                    STATUS
                </div>
                ${supportTicketStatusBadge(ticket.status)}
            </div>

        </div>

        <div style="padding:15px;border:1px solid var(--border);border-radius:10px;margin-bottom:14px;">
            <div style="font-size:0.7rem;color:var(--text-faint);margin-bottom:7px;">
                CUSTOMER ISSUE
            </div>
            <div style="font-size:0.86rem;line-height:1.5;">
                ${ticket.customer_message || '-'}
            </div>
        </div>

        <div style="padding:15px;border:1px solid var(--border);border-radius:10px;margin-bottom:14px;">
            <div style="font-size:0.7rem;color:var(--text-faint);margin-bottom:7px;">
                AI SUMMARY
            </div>
            <div style="font-size:0.86rem;line-height:1.5;">
                ${ticket.ai_summary || 'No AI summary available.'}
            </div>
        </div>

        <div style="padding:15px;border:1px solid var(--border);border-radius:10px;margin-bottom:20px;">
            <div style="font-size:0.7rem;color:var(--text-faint);margin-bottom:7px;">
                AI RECOMMENDATION
            </div>
            <div style="font-size:0.86rem;line-height:1.5;">
                ${ticket.ai_recommendation || 'No recommendation available.'}
            </div>
        </div>

        ${
            transaction.amount !== undefined
            ? `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px;">

                <div>
                    <div style="font-size:0.7rem;color:var(--text-faint);margin-bottom:4px;">
                        AMOUNT
                    </div>
                    <div style="font-weight:600;">
                        ₹${Number(transaction.amount).toLocaleString('en-IN')}
                    </div>
                </div>

                <div>
                    <div style="font-size:0.7rem;color:var(--text-faint);margin-bottom:4px;">
                        PAYMENT STATUS
                    </div>
                    <div style="font-weight:600;">
                        ${transaction.status || '-'}
                    </div>
                </div>

                ${
                    transaction.failureReason
                    ? `
                    <div style="grid-column:1 / -1;">
                        <div style="font-size:0.7rem;color:var(--text-faint);margin-bottom:4px;">
                            FAILURE REASON
                        </div>
                        <div style="font-size:0.84rem;color:var(--text-muted);">
                            ${transaction.failureReason}
                        </div>
                    </div>
                    `
                    : ''
                }

            </div>
            `
            : ''
        }

        <div style="display:flex;gap:10px;">

    ${
        currentStatus === 'open'
        ? `
            <button
                class="btn-primary"
                style="flex:1;padding:10px 8px;"
                onclick="changeSupportTicketStatus(${ticket.ticket_id}, 'in_progress')">
                Mark In Progress
            </button>

            <button
                class="btn-resolve"
                style="flex:1;padding:10px 8px;"
                onclick="changeSupportTicketStatus(${ticket.ticket_id}, 'resolved')">
                Resolve
            </button>
        `
        : currentStatus === 'in_progress'
        ? `
            <button
                class="btn-primary"
                style="flex:1;padding:10px 8px;"
                onclick="changeSupportTicketStatus(${ticket.ticket_id}, 'recovery')">
                Start Recovery
            </button>

            <button
                class="btn-resolve"
                style="flex:1;padding:10px 8px;"
                onclick="changeSupportTicketStatus(${ticket.ticket_id}, 'resolved')">
                Resolve
            </button>
        `
        : currentStatus === 'recovery'
        ? `
            <button
                class="btn-primary"
                style="flex:1;padding:10px 8px;"
                onclick="changeSupportTicketStatus(${ticket.ticket_id}, 'resolved')">
                Resolve
            </button>
        `
        : `
            <div style="
                flex:1;
                text-align:center;
                color:var(--text-muted);
                font-size:0.82rem;
                padding:10px;
            ">
                This ticket has been resolved.
            </div>
        `
    }

    <button
        class="btn-escalate"
        style="padding:10px 18px;"
        onclick="closeSupportTicketModal()">
        Close
    </button>

    </div>
    `;

    document.getElementById('supportTicketModal').style.display = 'flex';
};


const changeSupportTicketStatus = async (id, newStatus) => {

    const labels = {
        in_progress: 'In Progress',
        recovery: 'Recovery',
        resolved: 'Resolved'
    };

    if (!confirm(`Change ticket #${id} status to ${labels[newStatus]}?`)) {
        return;
    }

    try {

        const res = await fetch(`${API}/support-tickets/${id}/status`, {
            method: 'PATCH',
            headers: authHeaders(),
            body: JSON.stringify({
                status: newStatus
            })
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.error || 'Failed to update support ticket');
            return;
        }

        closeSupportTicketModal();

        await loadSupportTickets();

    } catch (err) {
        console.error('Failed to update support ticket:', err);
        alert('Failed to update support ticket');
    }
};


const closeSupportTicketModal = () => {
    const modal = document.getElementById('supportTicketModal');

    if (modal) {
        modal.style.display = 'none';
    }
};


window.updateSupportTicketStatus = updateSupportTicketStatus;
window.changeSupportTicketStatus = changeSupportTicketStatus;
window.closeSupportTicketModal = closeSupportTicketModal;

const resolveIssue = async (id) => {
  try {
    const res = await fetch(`${API}/issues/${id}/resolve`, {
      method: "PATCH",
      headers: authHeaders(),
    });
    if (!res.ok) {
      const d = await res.json();
      alert(d.error || "Failed to resolve");
      return;
    }
    await loadIssues();
  } catch {
    console.error("Failed to resolve issue");
  }
};

const loadEmployees = async () => {
  try {
    const res = await fetch(`${API}/employees/team`, {
      headers: authHeaders(),
    });
    const data = await res.json();
    const tbody = document.getElementById("employeesBody");
    const sidebarEl = document.getElementById("sidebarEmployeeList");

    if (!res.ok || !data.length) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-faint);padding:30px">No employees in your team yet</td></tr>`;
      if (sidebarEl)
        sidebarEl.innerHTML = `<div class="sidebar-emp-empty">No employees yet</div>`;
      return;
    }

    tbody.innerHTML = data
      .map(
        (e) => `
            <tr>
                <td style="color:var(--butter);font-weight:700">${e.employee_id}</td>
                <td style="font-weight:600">${e.name}</td>
                <td style="color:var(--text-muted);font-size:0.84rem">${e.email}</td>
                <td style="color:var(--text-muted);font-size:0.84rem">${e.phone || "-"}</td>
            </tr>
        `,
      )
      .join("");

    if (sidebarEl) {
      sidebarEl.innerHTML = data
        .map(
          (e) =>
            `<div class="sidebar-emp-item"><i class="bi bi-person"></i>${e.name}</div>`,
        )
        .join("");
    }
  } catch {
    document.getElementById("employeesBody").innerHTML =
      `<tr><td colspan="4" style="text-align:center;color:var(--text-faint);padding:30px">Failed to load employees</td></tr>`;
  }
};

const loadNotifications = async () => {
  try {
    const res = await fetch(`${API}/notifications`, { headers: authHeaders() });
    const data = await res.json();
    const list = document.getElementById("notifList");

    if (!res.ok || !data.length) {
      list.innerHTML = `<div class="empty-state"><i class="bi bi-bell-slash"></i>No notifications yet</div>`;
      return;
    }

    list.innerHTML = data
      .map(
        (n) => `
            <div class="notif-item">
                <div class="notif-top">
                    <span class="notif-employee"><i class="bi bi-person" style="margin-right:5px"></i>${n.employee_name || "Employee #" + n.employee_id}</span>
                    <span class="notif-date">${formatDate(n.sent_at)}</span>
                </div>
                <div class="notif-message">${n.message}</div>
                <span class="notif-status ${n.status === "sent" ? "status-sent" : "status-pending"}">
                    <i class="bi ${n.status === "sent" ? "bi-check2-circle" : "bi-hourglass-split"}"></i>
                    ${n.status}
                </span>
            </div>
        `,
      )
      .join("");
  } catch {
    document.getElementById("notifList").innerHTML =
      `<div class="empty-state"><i class="bi bi-bell-slash"></i>Failed to load notifications</div>`;
  }
};

const logout = () => {
  localStorage.clear();
  window.location.href = "login.html";
};

loadIssues();
loadEmployees();
loadNotifications();
loadSupportTickets();
