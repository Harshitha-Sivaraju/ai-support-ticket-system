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
    let box = document.getElementById("alertBox");

    if (!box) {
        box = document.createElement("div");
        box.id = "alertBox";

        box.style.position = "fixed";
        box.style.top = "90px";
        box.style.left = "50%";
        box.style.transform = "translateX(-50%)";
        box.style.zIndex = "9999";
        box.style.padding = "14px 20px";
        box.style.borderRadius = "10px";
        box.style.maxWidth = "600px";
        box.style.fontSize = "0.85rem";
        box.style.fontWeight = "600";
        box.style.background = "#241519";
        box.style.border = "1px solid #5a343d";
        box.style.color = "#f8df9a";

        document.body.appendChild(box);
    }

    box.textContent = msg;

    if (type === "error") {
        box.style.borderColor = "#8b3a46";
    } else {
        box.style.borderColor = "#5b8c68";
    }

    if (type === "success") {
        setTimeout(() => {
            box.remove();
        }, 3000);
    }
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

        // Remember the transaction currently selected
        const savedTransactionId =
            sessionStorage.getItem("selectedTransactionId");

        if (savedTransactionId) {
            const exists = transactions.some(
                (t) => t.transactionId === savedTransactionId
            );

            if (exists) {
                showTransactionDetail(savedTransactionId);
                return;
            }
        }

        // Only use the first transaction if nothing was selected before
        if (transactions.length > 0) {
            showTransactionDetail(transactions[0].transactionId);
        }

    } catch {
        showAlert("Cannot connect to server.");
    }
};

const switchLeftPanel = async (panel) => {
    const transactionsTab = document.getElementById("transactionsTab");
    const paymentHealthTab = document.getElementById("paymentHealthTab");
    const list = document.getElementById("transactionsList");

    if (panel === "transactions") {
        transactionsTab.classList.add("active");
        paymentHealthTab.classList.remove("active");

        renderTransactions();
        return;
    }

    transactionsTab.classList.remove("active");
    paymentHealthTab.classList.add("active");

    list.innerHTML = `
        <div class="empty-state">
            <i class="bi bi-arrow-repeat"></i>
            Checking payment services...
        </div>
    `;

    try {
        const [providerRes, bankRes] = await Promise.all([
            fetch(`${API}/payments/provider-health`, {
                headers: authHeaders()
            }),
            fetch(`${API}/payments/bank-health`, {
                headers: authHeaders()
            })
        ]);

        const provider = await providerRes.json();
        const bank = await bankRes.json();

        list.innerHTML = `
            <div style="padding:20px">

                <div style="
                    font-size:0.78rem;
                    font-weight:700;
                    text-transform:uppercase;
                    letter-spacing:0.8px;
                    color:var(--text-muted);
                    margin-bottom:16px;
                ">
                    Payment Services
                </div>

                <div style="
                    padding:14px;
                    border:1px solid var(--divider);
                    border-radius:12px;
                    margin-bottom:10px;
                ">
                    <div style="
                        display:flex;
                        justify-content:space-between;
                        align-items:center;
                    ">
                        <span style="color:var(--text-main);font-size:0.85rem">
                            <i class="bi bi-credit-card"></i>
                            Payment Provider
                        </span>

                        <span style="
                            color:${provider.healthy ? '#5fcf8b' : '#ff6b6b'};
                            font-size:0.8rem;
                            font-weight:700;
                        ">
                            ● ${provider.healthy ? "Available" : "Unavailable"}
                        </span>
                    </div>
                </div>

                <div style="
                    padding:14px;
                    border:1px solid var(--divider);
                    border-radius:12px;
                ">
                    <div style="
                        display:flex;
                        justify-content:space-between;
                        align-items:center;
                    ">
                        <span style="color:var(--text-main);font-size:0.85rem">
                            <i class="bi bi-bank"></i>
                            Bank Service
                        </span>

                        <span style="
                            color:${bank.healthy ? '#5fcf8b' : '#ff6b6b'};
                            font-size:0.8rem;
                            font-weight:700;
                        ">
                            ● ${bank.healthy ? "Available" : "Unavailable"}
                        </span>
                    </div>
                </div>

                <button
                    class="btn-primary"
                    onclick="switchLeftPanel('health')"
                    style="width:100%;margin-top:14px;padding:9px"
                >
                    <i class="bi bi-arrow-clockwise"></i>
                    Refresh
                </button>

            </div>
        `;

    } catch {
        list.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-exclamation-circle"></i>
                Unable to check payment services
            </div>
        `;
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
  sessionStorage.setItem("selectedTransactionId", id);

  document
    .querySelectorAll(".issue-item")
    .forEach((el) => el.classList.remove("active"));

  document.getElementById(`item-${id}`)?.classList.add("active");

  document.getElementById("detailPlaceholder").style.display = "none";

  const detail = document.getElementById("issueDetail");
  detail.classList.add("visible");

  document.getElementById("detailId").textContent = transaction.transactionId;

  document.getElementById("detailDate").innerHTML = `
    ${formatDate(transaction.timestamp)}
    <br>
    <span style="font-size:0.75rem;color:var(--text-faint)">
        Updated: ${formatDate(transaction.updatedAt || transaction.timestamp)}
    </span>
`;

  if (transaction.status === "FAILED" && transaction.updatedAt) {
    document.getElementById("detailDate").innerHTML = `
        ${formatDate(transaction.timestamp)}
        <br>
        <span style="font-size:0.75rem;color:var(--text-faint)">
            Updated: ${formatDate(transaction.updatedAt)}
        </span>
    `;
}

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

    if (transaction.status === "FAILED") {
      actionsEl.innerHTML = `
          <button
            type="button"
            class="btn-primary"
            id="retryPaymentBtn"
            onclick="event.preventDefault(); event.stopPropagation(); retryPayment('${transaction.transactionId}')"
            style="width:100%;"
          >
              <i class="bi bi-arrow-repeat"></i>
              Retry Payment
          </button>

          <div style="
              font-size:0.75rem;
              color:var(--text-faint);
              margin-top:8px;
              text-align:center;
          ">
              We'll check payment provider and bank availability before retrying.
          </div>
      `;
  } else {
      actionsEl.innerHTML = `
          <div style="font-size:0.8rem;color:var(--text-faint)">
              Transaction selected. Ask the AI for help.
          </div>
      `;
  }
};

const retryPayment = async (transactionId) => {
    const btn = document.getElementById("retryPaymentBtn");

    if (!btn) return;

    btn.disabled = true;
    btn.innerHTML = `
        <i class="bi bi-arrow-repeat"></i>
        Processing payment...
    `;

    try {
        const transaction = transactions.find(
            (t) => t.transactionId === transactionId
        );

        if (!transaction) {
            showAlert("Transaction not found.");
            return;
        }

        // Call backend
        const res = await fetch(`${API}/payments/pay`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({
                transactionId: transaction.transactionId,
                amount: transaction.amount
            })
        });

        const data = await res.json();

        // Bank/provider unavailable
        if (!res.ok) {
            showAlert(
                data.message ||
                data.error ||
                "Payment could not be processed."
            );

            return;
        }

        // Simulate realistic payment processing
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // NOW update the timestamp
        transaction.updatedAt = new Date().toISOString();

        // NOW the payment has successfully completed
        transaction.status = "SUCCESS";
        transaction.failureReason = null;
        transaction.refundStatus = "NONE";

        // Update time ONLY after successful processing
        transaction.updatedAt = new Date().toISOString();

        // Update left-side transaction list
        renderTransactions();

        // Update ONLY the existing detail fields
        document.getElementById("detailBadge").outerHTML =
            transactionStatusBadge(transaction).replace(
                "span class=",
                'span id="detailBadge" class='
            );

        document.getElementById("detailQuery").innerHTML = `
            <strong>Amount:</strong> ₹${transaction.amount.toLocaleString("en-IN")}<br>
            <strong>Payment Method:</strong> ${transaction.paymentMethod}
            ${transaction.upiApp ? `<br><strong>UPI App:</strong> ${transaction.upiApp}` : ""}
            <br><strong>Payment Status:</strong> ${transaction.status}
            <br><strong>Refund Status:</strong> ${transaction.refundStatus || "NONE"}
        `;

        // Update the date WITHOUT reloading the page
        document.getElementById("detailDate").innerHTML = `
            ${formatDate(transaction.timestamp)}
            <br>
            <span style="font-size:0.75rem;color:var(--text-faint)">
                Updated: ${formatDate(transaction.updatedAt)}
            </span>
        `;

        // Replace retry button area
        const actionsEl = document.getElementById("detailActions");

        actionsEl.innerHTML = `
            <div style="font-size:0.8rem;color:var(--text-faint)">
                Transaction selected. Ask the AI for help.
            </div>
        `;

        // Success message AFTER processing finishes
        showAlert(
            "Payment successful! Your transaction has been updated.",
            "success"
        );

    } catch (err) {
        console.error("Retry payment error:", err);
        showAlert("Cannot connect to payment service.");

    } finally {
        const currentBtn =
            document.getElementById("retryPaymentBtn");

        if (currentBtn) {
            currentBtn.disabled = false;
        }
    }
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

window.retryPayment = retryPayment;
window.switchLeftPanel = switchLeftPanel;

loadTransactions();
