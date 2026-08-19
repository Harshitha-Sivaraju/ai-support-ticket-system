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
        if (err.status === 429) {
            throw new Error('Gemini rate limit reached, please try again later');
        }
        if (err.status === 403) {
            throw new Error('Gemini API key is invalid or unauthorized');
        }
        throw new Error(`Gemini failed: ${err.message}`);
    }
};

module.exports = { getITSupportResponse };
