const http = require('http');

const post = (path, body, token) => new Promise((resolve, reject) => {
    const d = JSON.stringify(body);
    const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(d) };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const req = http.request({ host: 'localhost', port: 3000, path, method: 'POST', headers }, r => {
        let s = ''; r.on('data', c => s += c); r.on('end', () => resolve({ status: r.statusCode, body: JSON.parse(s) }));
    });
    req.on('error', reject); req.write(d); req.end();
});

const get = (path, token) => new Promise((resolve, reject) => {
    const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
    const req = http.request({ host: 'localhost', port: 3000, path, method: 'GET', headers }, r => {
        let s = ''; r.on('data', c => s += c); r.on('end', () => resolve({ status: r.statusCode, body: JSON.parse(s) }));
    });
    req.on('error', reject); req.end();
});

const patch = (path, token) => new Promise((resolve, reject) => {
    const d = '{}';
    const req = http.request({ host: 'localhost', port: 3000, path, method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Content-Length': 2, 'Authorization': 'Bearer ' + token } }, r => {
        let s = ''; r.on('data', c => s += c); r.on('end', () => resolve({ status: r.statusCode, body: JSON.parse(s) }));
    });
    req.on('error', reject); req.write(d); req.end();
});

const ok  = (label, cond, detail) => console.log((cond ? '  PASS' : '  FAIL'), label, detail || '');
const log = (label, val) => console.log('      ', label, val);

async function runTests() {
    console.log('\n=== END-TO-END TEST SUITE ===\n');

    // TEST 1
    console.log('TEST 1: Teams');
    const teams = await get('/api/teams');
    ok('Teams loaded', teams.status === 200);
    log('Teams:', teams.body.map(t => t.team_id + ' - ' + t.team_name).join(', '));

    // TEST 2
    console.log('\nTEST 2: Register Admin A (IT Support team 1)');
    const a1 = await post('/api/auth/register/admin', { name: 'Admin IT', email: 'admin.it@test.com', phone: '+1234567890', team_id: 1, password: 'pass123' });
    ok('Admin IT registered', a1.status === 201, a1.body.error || '');

    // TEST 3
    console.log('\nTEST 3: Duplicate admin for team 1 — should be rejected');
    const a1dup = await post('/api/auth/register/admin', { name: 'Admin IT2', email: 'admin.it2@test.com', team_id: 1, password: 'pass123' });
    ok('Duplicate rejected with 409', a1dup.status === 409);
    log('Message:', a1dup.body.error);

    // TEST 4
    console.log('\nTEST 4: Register Admin B (HR team 2)');
    const a2 = await post('/api/auth/register/admin', { name: 'Admin HR', email: 'admin.hr@test.com', phone: '+9876543210', team_id: 2, password: 'pass123' });
    ok('Admin HR registered', a2.status === 201, a2.body.error || '');

    // TEST 5
    console.log('\nTEST 5: Register multiple employees for IT Support');
    const e1 = await post('/api/auth/register/employee', { name: 'Alice IT', email: 'alice@test.com', phone: '111', team_id: 1, password: 'pass123' });
    const e2 = await post('/api/auth/register/employee', { name: 'Bob IT', email: 'bob@test.com', phone: '222', team_id: 1, password: 'pass123' });
    ok('Alice registered', e1.status === 201);
    ok('Bob registered', e2.status === 201);

    // TEST 6
    console.log('\nTEST 6: Register employee for HR');
    const e3 = await post('/api/auth/register/employee', { name: 'Carol HR', email: 'carol@test.com', phone: '333', team_id: 2, password: 'pass123' });
    ok('Carol HR registered', e3.status === 201);

    // TEST 7
    console.log('\nTEST 7: Login as IT admin');
    const loginA = await post('/api/auth/login/admin', { email: 'admin.it@test.com', password: 'pass123' });
    ok('IT admin login', loginA.status === 200);
    log('team_id:', loginA.body.team_id, '| team_name:', loginA.body.team_name);
    const adminToken = loginA.body.token;

    // TEST 8
    console.log('\nTEST 8: Login as HR admin');
    const loginA2 = await post('/api/auth/login/admin', { email: 'admin.hr@test.com', password: 'pass123' });
    ok('HR admin login', loginA2.status === 200);
    log('team_id:', loginA2.body.team_id);
    const hrAdminToken = loginA2.body.token;

    // Employee login
    const loginE = await post('/api/auth/login/employee', { email: 'alice@test.com', password: 'pass123' });
    const empToken = loginE.body.token;

    // TEST 9
    console.log('\nTEST 9: Employee creates issue');
    const issue1 = await post('/api/issues', { query: 'My laptop cannot connect to WiFi' }, empToken);
    ok('Issue created', issue1.status === 201);
    log('issue_id:', issue1.body.issue_id, '| status:', issue1.body.status);
    const issueId = issue1.body.issue_id;

    // TEST 10
    console.log('\nTEST 10: Gemini response');
    ok('Gemini response present', !!issue1.body.gemini_response);
    log('Response preview:', (issue1.body.gemini_response || '').substring(0, 80) + '...');

    // TEST 11
    console.log('\nTEST 11: Employee marks own issue as resolved');
    const resolve = await patch('/api/issues/' + issueId + '/resolve-self', empToken);
    ok('Resolved by employee', resolve.status === 200, resolve.body.error || '');

    // TEST 12
    console.log('\nTEST 12: Employee escalates a new issue');
    const issue2 = await post('/api/issues', { query: 'Printer not working, need human help' }, empToken);
    const esc = await patch('/api/issues/' + issue2.body.issue_id + '/escalate', empToken);
    ok('Issue escalated', esc.status === 200, esc.body.error || '');
    log('SMS sent:', esc.body.sms_sent, '| Note:', esc.body.sms_note);

    // TEST 13
    console.log('\nTEST 13: IT admin sees escalated issue');
    const adminIssues = await get('/api/issues', adminToken);
    ok('Admin sees issues', adminIssues.status === 200);
    log('Issues:', adminIssues.body.map(i => '#' + i.issue_id + ':' + i.status).join(', '));

    // TEST 14
    console.log('\nTEST 14: HR admin sees only HR issues (not IT issues)');
    const hrIssues = await get('/api/issues', hrAdminToken);
    ok('HR admin sees 0 IT issues', hrIssues.body.length === 0);
    log('HR issues count:', hrIssues.body.length);

    // TEST 15
    console.log('\nTEST 15: No token — access denied');
    const noAuth = await get('/api/issues', 'badtoken');
    ok('Rejected with 401', noAuth.status === 401);

    // Employees endpoint
    console.log('\nBONUS: Admin sees team employees');
    const empList = await get('/api/employees/team', adminToken);
    ok('Employees loaded', empList.status === 200);
    log('IT employees:', empList.body.map(e => e.name).join(', '));

    console.log('\n=== TESTS COMPLETE ===\n');
    process.exit(0);
}

runTests().catch(e => { console.error('Test error:', e.message); process.exit(1); });
