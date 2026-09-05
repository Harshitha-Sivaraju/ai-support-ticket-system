const API = 'http://localhost:3000/api';

let currentRole = 'customer';

const switchTab = (role) => {
    currentRole = role;

    document.getElementById('adminTab').classList.toggle('active', role === 'admin');
    document.getElementById('customerTab').classList.toggle('active', role === 'customer');

    const phoneField = document.getElementById('phoneField');

    if (phoneField) {
        phoneField.style.display = 'block';
    }

    hideAlert();
};

const showAlert = (message, type = 'error') => {
    const box = document.getElementById('alertBox');
    const icon = document.getElementById('alertIcon');

    document.getElementById('alertMsg').textContent = message;

    box.className = `alert-box ${type}`;

    icon.className =
        type === 'error'
            ? 'bi bi-exclamation-circle-fill'
            : 'bi bi-check-circle-fill';
};

const hideAlert = () => {
    document.getElementById('alertBox').className = 'alert-box';
};

document.getElementById('registerForm').addEventListener('submit', async (e) => {

    e.preventDefault();

    const btn = document.getElementById('registerBtn');
    const btnText = document.getElementById('btnText');

    btn.disabled = true;
    btnText.textContent = 'Creating Account...';

    const body = {
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value,
        phone: document.getElementById('phone').value.trim()
    };

    try {

        const res = await fetch(`${API}/auth/register/${currentRole}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const data = await res.json();

        if (!res.ok) {
            showAlert(data.error || 'Registration failed');
            return;
        }

        localStorage.setItem('token', data.token);
        localStorage.setItem('role', currentRole);
        localStorage.setItem('user', JSON.stringify(data));

        showAlert('Account created! Redirecting...', 'success');

        setTimeout(() => {
            window.location.href =
                currentRole === 'admin'
                    ? 'admin.html'
                    : 'employee.html';
        }, 1000);

    } catch (err) {

        showAlert(
            'Cannot connect to server. Make sure backend is running.'
        );

    } finally {

        btn.disabled = false;
        btnText.textContent = 'Create Account';

    }
});