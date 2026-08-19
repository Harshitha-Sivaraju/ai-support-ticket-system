const API = 'http://localhost:3000/api';
let currentRole = 'employee';

const switchTab = (role) => {
    currentRole = role;
    document.getElementById('employeeTab').classList.toggle('active', role === 'employee');
    document.getElementById('adminTab').classList.toggle('active', role === 'admin');
    hideAlert();
};

const showAlert = (message, type = 'error') => {
    const box = document.getElementById('alertBox');
    document.getElementById('alertMsg').textContent = message;
    document.getElementById('alertIcon').className = type === 'error' ? 'bi bi-exclamation-circle-fill' : 'bi bi-check-circle-fill';
    box.className = `alert-box ${type}`;
};

const hideAlert = () => { document.getElementById('alertBox').className = 'alert-box'; };

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    const btnText = document.getElementById('btnText');
    btn.disabled = true;
    btnText.textContent = 'Signing in...';

    try {
        const res = await fetch(`${API}/auth/login/${currentRole}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: document.getElementById('email').value.trim(),
                password: document.getElementById('password').value
            })
        });

        const data = await res.json();

        if (!res.ok) {
            showAlert(data.error || 'Login failed');
            return;
        }

        localStorage.setItem('token', data.token);
        localStorage.setItem('role', currentRole);
        localStorage.setItem('user', JSON.stringify(data));

        showAlert('Login successful! Redirecting...', 'success');
        setTimeout(() => {
            window.location.href = currentRole === 'employee' ? 'employee.html' : 'admin.html';
        }, 800);

    } catch {
        showAlert('Cannot connect to server. Make sure backend is running.');
    } finally {
        btn.disabled = false;
        btnText.textContent = 'Sign In';
    }
});
