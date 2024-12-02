
const twilio = require('twilio');
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

async function sendMobileMessage(message) {
    try {
        const response = await client.messages.create({
            body: `Your appointment is booked for ${message.date} at ${message.time}.`,
            from: '+17753208517',
            to: `+91${message.patientNumber}`
        });
        console.log("SMS sent successfully:", response.sid);
    } catch (error) {
        console.error("Failed to send SMS:", error.message);
    }
}


module.exports = sendMobileMessage;