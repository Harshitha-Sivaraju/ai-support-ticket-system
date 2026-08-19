# AI IT Support System

An AI-powered IT support system that helps employees troubleshoot technical issues using Gemini AI and allows unresolved issues to be escalated to the appropriate team admin.

## Features

### Employee
- Employee registration and login
- JWT-based authentication
- Submit IT support issues
- Get AI-powered troubleshooting using Gemini
- Continue the conversation with Gemini
- View previous issues
- Mark issues as resolved
- Contact the team admin for unresolved issues
- View team information

### Admin
- Admin registration and login
- One admin per team
- View employees belonging to the team
- Receive notifications for escalated issues
- View employee issues
- Resolve/manage support requests

## Technologies Used

### Frontend
- HTML
- CSS
- JavaScript
- Bootstrap Icons

### Backend
- Node.js
- Express.js
- JWT
- bcryptjs

### Database
- MySQL

### AI
- Google Gemini API

## Project Structure


project/
│
├── frontend/
│   ├── employee.html
│   ├── admin.html
│   ├── login.html
│   ├── css/
│   └── js/
│
├── src/
│   ├── controllers/
│   ├── routes/
│   ├── services/
│   └── config/
│
├── database/
│   └── schema.sql
│
├── .env
├── package.json
<<<<<<< HEAD
└── README.md
=======
└── README.md

