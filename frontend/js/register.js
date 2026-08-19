const API = 'http://localhost:3000/api';
let currentRole = 'employee';
let allTeams = [];
let takenTeamIds = [];

// load teams on page load
const loadTeams = async () => {
    try {
        const res = await fetch(`${API}/teams`);
        allTeams = await res.json();

        const availRes = await fetch(`${API}/teams/available`);
        const availTeams = await availRes.json();
        takenTeamIds = allTeams
            .filter(t => !availTeams.find(a => a.team_id === t.team_id))
            .map(t => t.team_id);
    } catch {
        allTeams = [];
    }
    populateTeamDropdown();
};

const populateTeamDropdown = () => {
    const select = document.getElementById('team_id');
    select.innerHTML = '<option value="" disabled selected>Select a team</option>';

    const teams = currentRole === 'admin'
        ? allTeams.filter(t => !takenTeamIds.includes(t.team_id))
        : allTeams;

    if (teams.length === 0) {
        select.innerHTML = currentRole === 'admin'
            ? '<option value="" disabled selected>No available teams (all teams have admins)</option>'
            : '<option value="" disabled selected>No teams found</option>';
        return;
    }

    teams.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.team_id;
        opt.textContent = `${t.team_name} (ID: ${t.team_id})`;
        select.appendChild(opt);
    });
};

const switchTab = (role) => {
    currentRole = role;
    document.getElementById('employeeTab').classList.toggle('active', role === 'employee');
    document.getElementById('adminTab').classList.toggle('active', role === 'admin');
    document.getElementById('phoneField').style.display = role === 'employee' ? 'block' : 'none';
    populateTeamDropdown();
    hideAlert();
};

const showAlert = (message, type = 'error') => {
    const box = document.getElementById('alertBox');
    const icon = document.getElementById('alertIcon');
    document.getElementById('alertMsg').textContent = message;
    box.className = `alert-box ${type}`;
    icon.className = type === 'error' ? 'bi bi-exclamation-circle-fill' : 'bi bi-check-circle-fill';
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
        team_id: parseInt(document.getElementById('team_id').value),
    };

    if (currentRole === 'employee') {
        body.phone = document.getElementById('phone').value.trim();
    }

    try {
        const res = await fetch(`${API}/auth/register/${currentRole}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
            window.location.href = currentRole === 'employee' ? 'employee.html' : 'admin.html';
        }, 1000);

    } catch (err) {
        showAlert('Cannot connect to server. Make sure backend is running.');
    } finally {
        btn.disabled = false;
        btnText.textContent = 'Create Account';
    }
});

loadTeams();
