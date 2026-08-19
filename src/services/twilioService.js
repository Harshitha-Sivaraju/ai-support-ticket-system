const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken  = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_FROM_NUMBER;

const isConfigured =
    accountSid && accountSid !== 'your_twilio_account_sid' &&
    authToken  && authToken  !== 'your_twilio_auth_token'  &&
    fromNumber && fromNumber !== '+1your_twilio_number';

const sendSMS = async (toNumber, message) => {
    if (!isConfigured) {
        console.log('[Twilio] Not configured — SMS skipped. Message would be:', message);
        return { success: false, reason: 'Twilio not configured' };
    }

    if (!toNumber) {
        console.log('[Twilio] No phone number for recipient — SMS skipped.');
        return { success: false, reason: 'No recipient phone number' };
    }

    try {
        const client = twilio(accountSid, authToken);
        const result = await client.messages.create({
            body: message,
            from: fromNumber,
            to: toNumber
        });
        console.log('[Twilio] SMS sent, SID:', result.sid);
        return { success: true, sid: result.sid };
    } catch (err) {
        console.error('[Twilio] SMS failed:', err.message);
        return { success: false, reason: err.message };
    }
};

module.exports = { sendSMS, isConfigured };
