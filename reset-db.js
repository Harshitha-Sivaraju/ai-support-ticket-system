const db = require('./src/config/db');

async function reset() {
    console.log('Starting database reset...');

    await db.query('SET FOREIGN_KEY_CHECKS = 0');
    await db.query('DELETE FROM notification');
    await db.query('DELETE FROM issue');
    await db.query('DELETE FROM employee');
    await db.query('DELETE FROM admin');
    await db.query('DELETE FROM team');
    await db.query('ALTER TABLE notification AUTO_INCREMENT = 1');
    await db.query('ALTER TABLE issue AUTO_INCREMENT = 1');
    await db.query('ALTER TABLE employee AUTO_INCREMENT = 1');
    await db.query('ALTER TABLE admin AUTO_INCREMENT = 1');
    await db.query('ALTER TABLE team AUTO_INCREMENT = 1');
    await db.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('All test data cleared.');

    // add status column to issue if missing
    const [statusCol] = await db.query("SHOW COLUMNS FROM issue LIKE 'status'");
    if (statusCol.length === 0) {
        await db.query("ALTER TABLE issue ADD COLUMN status ENUM('open','in_progress','resolved','escalated') NOT NULL DEFAULT 'open'");
        console.log('Added: issue.status column');
    } else {
        console.log('OK: issue.status already exists');
    }

    // add phone column to admin if missing
    const [phoneCol] = await db.query("SHOW COLUMNS FROM admin LIKE 'phone'");
    if (phoneCol.length === 0) {
        await db.query('ALTER TABLE admin ADD COLUMN phone VARCHAR(20)');
        console.log('Added: admin.phone column');
    } else {
        console.log('OK: admin.phone already exists');
    }

    // seed 3 clean teams
    await db.query("INSERT INTO team (team_name) VALUES ('IT Support'), ('HR'), ('Finance')");
    const [teams] = await db.query('SELECT * FROM team');
    console.log('Teams seeded:', JSON.stringify(teams));

    // verify all tables empty except team
    const [[{c:n}]] = await db.query('SELECT COUNT(*) as c FROM notification');
    const [[{c:i}]] = await db.query('SELECT COUNT(*) as c FROM issue');
    const [[{c:e}]] = await db.query('SELECT COUNT(*) as c FROM employee');
    const [[{c:a}]] = await db.query('SELECT COUNT(*) as c FROM admin');
    console.log(`Verification — notifications:${n} issues:${i} employees:${e} admins:${a}`);
    console.log('Reset complete. Ready for fresh testing.');
    process.exit(0);
}

reset().catch(err => { console.error('Reset failed:', err.message); process.exit(1); });
