const { GoogleGenerativeAI } = require('@google/generative-ai');

if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is missing from .env');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash-lite' });

const getITSupportResponse = async (query) => {
    const prompt = `
        You are a helpful IT support assistant.
        An employee has submitted the following support request:
        "${query}"
        Provide a clear, concise, step-by-step solution.
        Keep the response practical and beginner-friendly.
        If the issue is unclear, ask one clarifying question.
    `;

    try {
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (err) {
        if (err.status === 429) throw new Error('Gemini rate limit reached, please try again later');
        if (err.status === 403) throw new Error('Gemini API key is invalid or unauthorized');
        throw new Error(`Gemini failed: ${err.message}`);
    }
};

// Multi-turn chat: history = [{role:'user'|'model', parts:[{text}]}, ...]
const getChatResponse = async (originalQuery, history, newMessage) => {
    const systemContext = `You are a helpful IT support assistant. The employee originally reported: "${originalQuery}". Continue helping them based on the conversation.`;

    // Build Gemini chat history — prepend system context as first user/model exchange
    const fullHistory = [
        { role: 'user',  parts: [{ text: systemContext }] },
        { role: 'model', parts: [{ text: 'Understood. I will help resolve this IT issue.' }] },
        ...history
    ];

    try {
        const chat = model.startChat({ history: fullHistory });
        const result = await chat.sendMessage(newMessage);
        return result.response.text();
    } catch (err) {
        if (err.status === 429) throw new Error('Gemini rate limit reached, please try again later');
        if (err.status === 403) throw new Error('Gemini API key is invalid or unauthorized');
        throw new Error(`Gemini failed: ${err.message}`);
    }
};

module.exports = { getITSupportResponse, getChatResponse };
