const API = "http://localhost:3000/api";

const token = localStorage.getItem("token");
const role = localStorage.getItem("role");
const user = JSON.parse(localStorage.getItem("user") || "{}");

if (!token || role !== "customer") {
  window.location.href = "login.html";
}

document.getElementById("userName").textContent = user.name || "Customer";

// team chip — same pattern as admin dashboard
const teamChip = document.getElementById("teamChip");
if (teamChip)
  teamChip.textContent = user.team_name
    ? `${user.team_name} (ID: ${user.team_id})`
    : `Team ${user.team_id}`;

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
});

const showAlert = (msg, type = "error") => {
  const box = document.getElementById("alertBox");
  document.getElementById("alertMsg").textContent = msg;
  document.getElementById("alertIcon").className =
    type === "error"
      ? "bi bi-exclamation-circle-fill"
      : "bi bi-check-circle-fill";
  box.className = `alert-box ${type}`;
  if (type === "success") setTimeout(() => (box.className = "alert-box"), 3000);
};

const formatDate = (str) =>
  new Date(str).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

let transactions = [];

// Per-issue chat history stored in memory: { [issue_id]: [{role, parts:[{text}]}] }
const chatHistories = {};

const transactionStatusBadge = (transaction) => {
  const s = transaction.status;
  const map = {
    SUCCESS: {
      cls: "badge-done",
      icon: "bi-check-circle-fill",
      label: "Successful",
    },
    FAILED: {
      cls: "badge-escalated",
      icon: "bi-x-circle-fill",
      label: "Failed",
    },
    PROCESSING: {
      cls: "badge-open",
      icon: "bi-arrow-repeat",
      label: "Processing",
    },
    REVERSED: {
      cls: "badge-open",
      icon: "bi-arrow-counterclockwise",
      label: "Reversed",
    },
  };
  const b = map[s] || map.PROCESSING;
  return `
        <span class="badge ${b.cls}">
            <i class="bi ${b.icon}"></i> ${b.label}
        </span>
    `;
};

const renderTransactions = () => {
  const list = document.getElementById("transactionsList");
  if (transactions.length === 0) {
    list.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-credit-card"></i>
                No transactions found
            </div>
        `;
    return;
  }
  list.innerHTML = transactions
    .map(
      (t) => `
        <div
            class="issue-item"
            id="item-${t.transactionId}"
            onclick="showTransactionDetail('${t.transactionId}')"
        >
            <div class="issue-item-top">
                <span class="issue-id">
                    ${t.transactionId}
                </span>
                <span class="issue-date">
                    ${formatDate(t.timestamp)}
                </span>
            </div>
            <div class="issue-query">
                ₹${t.amount.toLocaleString("en-IN")}
                · ${t.paymentMethod}
                ${t.upiApp ? `· ${t.upiApp}` : ""}
            </div>
            <div style="margin-top:6px">
                ${transactionStatusBadge(t)}
            </div>
        </div>
    `,
    )
    .join("");
};

const loadTransactions = async () => {
  try {
    const res = await fetch(`${API}/transactions`, {
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      showAlert(data.error || "Failed to load transactions");
      return;
    }
    transactions = data;
    renderTransactions();
    if (transactions.length > 0) {
      showTransactionDetail(transactions[0].transactionId);
    }
  } catch {
    showAlert("Cannot connect to server.");
  }
};

// Track which issue is currently open so chat knows the context
let activeIssueId = null;

const addChatBubble = (role, text) => {
  const container = document.getElementById("chatMessages");
  const isGemini = role === "model";
  const div = document.createElement("div");
  div.innerHTML = `
        <div class="chat-label ${isGemini ? "gemini" : "user"}">${isGemini ? "Gemini" : "You"}</div>
        <div class="chat-bubble ${isGemini ? "gemini" : "user"}">${text}</div>
    `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
};

const showTransactionDetail = (id) => {
  const transaction = transactions.find((t) => t.transactionId === id);

  if (!transaction) return;

  activeIssueId = id;

  document
    .querySelectorAll(".issue-item")
    .forEach((el) => el.classList.remove("active"));

  document.getElementById(`item-${id}`)?.classList.add("active");

  document.getElementById("detailPlaceholder").style.display = "none";

  const detail = document.getElementById("issueDetail");
  detail.classList.add("visible");

  document.getElementById("detailId").textContent = transaction.transactionId;

  document.getElementById("detailDate").textContent = formatDate(
    transaction.timestamp,
  );

  document.getElementById("detailQuery").innerHTML = `
        <strong>Amount:</strong> ₹${transaction.amount.toLocaleString("en-IN")}<br>
        <strong>Payment Method:</strong> ${transaction.paymentMethod}
        ${transaction.upiApp ? `<br><strong>UPI App:</strong> ${transaction.upiApp}` : ""}
        <br><strong>Payment Status:</strong> ${transaction.status}
        <br><strong>Refund Status:</strong> ${transaction.refundStatus || "NONE"}
    `;

  const badge = document.getElementById("detailBadge");

  badge.outerHTML = transactionStatusBadge(transaction).replace(
    "span class=",
    'span id="detailBadge" class=',
  );

  const chatContainer = document.getElementById("chatMessages");

  chatContainer.innerHTML = "";

  chatContainer.className = "ai-box chat-messages";

  chatContainer.innerHTML = `
        <div style="font-size:0.85rem;color:var(--text-faint)">
            Ask the AI about this transaction.
        </div>
    `;

  const chatInput = document.getElementById("chatInput");

  const chatSendBtn = document.getElementById("chatSendBtn");

  chatInput.disabled = false;
  chatSendBtn.disabled = false;

  const actionsEl = document.getElementById("detailActions");

  actionsEl.innerHTML = `
        <div style="font-size:0.8rem;color:var(--text-faint)">
            Transaction selected. Ask the AI for help.
        </div>
    `;
};

const sendChat = async () => {
  const input = document.getElementById("chatInput");
  const message = input.value.trim();

  if (!message) return;

  if (!activeIssueId) {
    addChatBubble(
      "model",
      "Please select a transaction first so I can help you with the payment.",
    );
    return;
  }

  const transaction = transactions.find(
    (t) => t.transactionId === activeIssueId,
  );

  if (!transaction) {
    addChatBubble(
      "model",
      "I need a valid transaction ID to help you with this payment. Please select a transaction from your transactions list.",
    );
    return;
  }

  const btn = document.getElementById("chatSendBtn");

  input.value = "";
  input.disabled = true;
  btn.disabled = true;

  addChatBubble("user", message);

  const history = chatHistories[activeIssueId] || [];

  history.push({
    role: "user",
    parts: [{ text: message }],
  });

  try {
    const res = await fetch(`${API}/transactions/${activeIssueId}/chat`, {
      method: "POST",
      headers: authHeaders(),

      body: JSON.stringify({
        message,
        transaction,
        history: history.slice(0, -1),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      addChatBubble("model", data.error || "Failed to get response.");

      history.pop();
    } else {
      addChatBubble("model", data.reply);

      history.push({
        role: "model",
        parts: [{ text: data.reply }],
      });
    }

    chatHistories[activeIssueId] = history;
  } catch {
    addChatBubble("model", "Cannot connect to server.");

    history.pop();
  } finally {
    input.disabled = false;
    btn.disabled = false;
    input.focus();
  }
};

// Allow Enter key to send chat
document.getElementById("chatInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendChat();
  }
});

const resolveOwn = async (id) => {
  try {
    const res = await fetch(`${API}/issues/${id}/resolve-self`, {
      method: "PATCH",
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      showAlert(data.error || "Failed to resolve");
      return;
    }
    showAlert("Issue marked as resolved!", "success");
    await loadIssues();
    showDetail(id);
  } catch {
    showAlert("Cannot connect to server.");
  }
};

const escalate = async (id) => {
  try {
    const res = await fetch(`${API}/issues/${id}/escalate`, {
      method: "PATCH",
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      showAlert(data.error || "Failed to escalate");
      return;
    }
    const note = data.sms_sent
      ? "Admin notified via SMS."
      : "Admin notified (SMS pending setup).";
    showAlert(`Escalated to admin. ${note}`, "success");
    await loadIssues();
    showDetail(id);
  } catch {
    showAlert("Cannot connect to server.");
  }
};

const issueForm = document.getElementById("issueForm");

if (issueForm) {
  issueForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const btn = document.getElementById("submitBtn");
    const btnText = document.getElementById("submitBtnText");
    const query = document.getElementById("queryInput").value.trim();

    if (!query) return;

    btn.disabled = true;
    btnText.textContent = "Submitting...";

    try {
      const res = await fetch(`${API}/issues`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ query }),
      });

      const data = await res.json();

      if (!res.ok) {
        showAlert(data.error || "Failed to submit issue");
        return;
      }

      showAlert("Issue submitted!", "success");
      document.getElementById("queryInput").value = "";

      await loadIssues();
      showDetail(data.issue_id);
    } catch {
      showAlert("Cannot connect to server.");
    } finally {
      btn.disabled = false;
      btnText.textContent = "Submit Issue";
    }
  });
}

window.logout = function () {
  localStorage.clear();
  window.location.href = "login.html";
};

loadTransactions();
