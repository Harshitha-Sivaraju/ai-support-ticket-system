CREATE TABLE team (
    team_id   INT          NOT NULL AUTO_INCREMENT,
    team_name VARCHAR(100) NOT NULL,
    PRIMARY KEY (team_id)
);

CREATE TABLE employee (
    employee_id INT          NOT NULL AUTO_INCREMENT,
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(150) NOT NULL UNIQUE,
    phone       VARCHAR(20)  NOT NULL,
    team_id     INT          NOT NULL,
    PRIMARY KEY (employee_id),
    CONSTRAINT fk_employee_team FOREIGN KEY (team_id) REFERENCES team(team_id)
);

CREATE TABLE admin (
    admin_id INT          NOT NULL AUTO_INCREMENT,
    name     VARCHAR(100) NOT NULL,
    email    VARCHAR(150) NOT NULL UNIQUE,
    team_id  INT          NOT NULL UNIQUE,
    PRIMARY KEY (admin_id),
    CONSTRAINT fk_admin_team FOREIGN KEY (team_id) REFERENCES team(team_id)
);

CREATE TABLE issue (
    issue_id         INT      NOT NULL AUTO_INCREMENT,
    employee_id      INT      NOT NULL,
    query            TEXT     NOT NULL,
    gemini_response  TEXT,
    resolved         BOOLEAN  NOT NULL DEFAULT FALSE,
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sms_sent         BOOLEAN  NOT NULL DEFAULT FALSE,
    PRIMARY KEY (issue_id),
    CONSTRAINT fk_issue_employee FOREIGN KEY (employee_id) REFERENCES employee(employee_id)
);

CREATE TABLE notification (
    notification_id INT          NOT NULL AUTO_INCREMENT,
    issue_id        INT          NOT NULL,
    employee_id     INT          NOT NULL,
    admin_id        INT          NOT NULL,
    message         TEXT         NOT NULL,
    sent_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status          ENUM('pending', 'sent', 'failed') NOT NULL DEFAULT 'pending',
    PRIMARY KEY (notification_id),
    CONSTRAINT fk_notif_issue    FOREIGN KEY (issue_id)    REFERENCES issue(issue_id),
    CONSTRAINT fk_notif_employee FOREIGN KEY (employee_id) REFERENCES employee(employee_id),
    CONSTRAINT fk_notif_admin    FOREIGN KEY (admin_id)    REFERENCES admin(admin_id)
);
