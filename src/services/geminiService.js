const { GoogleGenerativeAI } = require('@google/generative-ai');

if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is missing from .env');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
    model: 'gemini-3.5-flash-lite'
});


// =========================================
// Single Payment-Support Response
// =========================================
const getPaymentSupportResponse = async (query, transaction = null) => {

    const transactionContext = transaction
        ? JSON.stringify(transaction, null, 2)
        : 'No transaction information was provided.';

    const prompt = `
You are a helpful and professional Payment Support Assistant.

The customer has asked:

"${query}"

Here is the transaction information associated with the request:

${transactionContext}

Important rules:

- Answer specifically about the customer's transaction when transaction data is available.
- Do not invent transaction details.
- If the transaction status is FAILED, explain the failureReason when relevant.
- If the transaction status is SUCCESS, explain that the payment completed successfully.
- If the transaction status is PROCESSING, explain that the payment is still being processed.
- If the transaction status is REVERSED, explain that the transaction was reversed.
- Never claim that money was deducted, refunded, or recovered unless the transaction data supports it.
- Keep the answer concise, clear, practical, and beginner-friendly.
- Stay focused on payment-related questions.
- If the question is unrelated to payments, politely explain that you can help with payment-related questions.

Provide the answer directly to the customer.
`;

    try {

        const result = await model.generateContent(prompt);

        return result.response.text();

    } catch (err) {

        if (err.status === 429) {
            throw new Error(
                'Gemini rate limit reached, please try again later'
            );
        }

        if (err.status === 403) {
            throw new Error(
                'Gemini API key is invalid or unauthorized'
            );
        }

        throw new Error(`Gemini failed: ${err.message}`);
    }
};


// =========================================
// Multi-Turn Payment-Support Chat
// =========================================
const getChatResponse = async (
    originalQuery,
    history,
    newMessage,
    transaction = null,
    paymentHealth = null
) => {

    const transactionContext = transaction
        ? JSON.stringify(transaction, null, 2)
        : 'No transaction information was provided.';

    const healthContext = paymentHealth
        ? JSON.stringify(paymentHealth, null, 2)
        : 'Current payment service health is unavailable.';


    const systemContext = `
You are a helpful and professional Payment Support Assistant.

The customer is asking about a payment or transaction.

Original support request:

"${originalQuery}"

Selected transaction:

${transactionContext}

Current payment service health:

${healthContext}


Use the selected transaction as the primary source of truth.

Important rules:

- Answer specifically about the selected transaction.
- Do not invent transaction information.
- Use transaction information such as transactionId, amount, paymentMethod, upiApp, status, failureReason, refundStatus, timestamp and updatedAt when relevant.
- Do not simply repeat information that is already visible to the customer. Explain or interpret it when useful.

Transaction status rules:

- FAILED means the payment attempt was unsuccessful.
- PROCESSING means the payment is still being processed.
- SUCCESS means the payment completed successfully.
- REVERSED means the payment was reversed.

- If the transaction is FAILED and the customer asks why it failed, explain the failureReason when available.
- Explain refundStatus when it is relevant.
- Never claim a payment succeeded if its status is not SUCCESS.
- Never claim that money was deducted, refunded or recovered unless the transaction information supports it.


Payment health rules:

- Use the current payment health information ONLY when the customer's question is about retrying, trying again, making the payment now, or whether payment services are currently available.
- The current payment health data is provided above as JSON.
- If the health data says "bankHealthy": false, the bank service is currently unavailable.
- If the health data says "providerHealthy": false, the payment provider is currently unavailable.
- If either service is unavailable and the customer asks whether they can retry, tell them NOT to retry right now and explain which service is unavailable.
- If both "bankHealthy": true and "providerHealthy": true and the transaction status is FAILED, explain that the customer can retry the payment.
- Do NOT mention payment health when it is not relevant to the customer's question.
- Do NOT give a health-related response to unrelated questions.


General rules:

- Keep responses concise, clear, practical and beginner-friendly.
- Stay focused on payment support.
- Maintain conversation context during follow-up questions.
- Continue using the selected transaction as the source of truth.
- Never invent information.

Provide the answer directly to the customer.
`;


    const fullHistory = [
        {
            role: 'user',
            parts: [
                {
                    text: systemContext
                }
            ]
        },
        {
            role: 'model',
            parts: [
                {
                    text:
                        'Understood. I will help the customer with their payment using the selected transaction and current payment service information.'
                }
            ]
        },
        ...history
    ];


    try {

        const chat = model.startChat({
            history: fullHistory
        });

        const result = await chat.sendMessage(newMessage);

        return result.response.text();

    } catch (err) {

        if (err.status === 429) {
            throw new Error(
                'Gemini rate limit reached, please try again later'
            );
        }

        if (err.status === 403) {
            throw new Error(
                'Gemini API key is invalid or unauthorized'
            );
        }

        throw new Error(`Gemini failed: ${err.message}`);
    }
};


// =========================================
// Exports
// =========================================
module.exports = {
    getPaymentSupportResponse,
    getChatResponse
};