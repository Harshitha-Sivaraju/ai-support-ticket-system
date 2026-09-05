# AI Payment Support System

An AI-powered payment support system that helps customers understand payment issues, troubleshoot failed transactions, and raise support requests when further assistance is required.

The system uses Google Gemini AI to analyze payment-related issues and assist with support ticket prioritization. Admins can review AI-generated insights and manually manage the recovery/support process.

## Features

### Customer

- Customer registration and login
- JWT-based authentication
- View payment transaction history
- View detailed transaction information
- Get AI-powered payment assistance using Gemini
- Continue conversations with Gemini
- Retry failed payments
- Contact support for unresolved payment issues
- Create support tickets for failed transactions
- View previous support requests
- Track support ticket status

### Admin

- Admin registration and login
- Admin dashboard for payment support
- View support ticket statistics
- View recent support tickets
- View all customer support tickets
- View customer and transaction details
- AI-powered ticket priority classification
- AI-generated issue summary
- AI-generated recommended resolution
- Manually update support ticket status
- Manage recovery cases
- Resolve customer support requests

## AI Capabilities

The system uses Google Gemini AI to:

- Understand customer payment-related queries
- Provide transaction-aware troubleshooting
- Analyze support tickets
- Classify ticket priority as:
  - Critical
  - High
  - Medium
  - Low
- Generate a summary of the customer's issue
- Recommend an appropriate next action for the support team

AI recommendations are used to assist the admin. Final support and recovery actions remain under human control.

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

```text
project/
│
├── frontend/
│   ├── employee.html
│   ├── admin.html
│   ├── login.html
│   ├── register.html
│   ├── css/
│   └── js/
│
├── src/
│   ├── controllers/
│   ├── routes/
│   ├── services/
│   ├── middleware/
│   ├── config/
│   └── data/
│
├── database/
│   └── schema.sql
│
├── .env
├── package.json
└── README.md