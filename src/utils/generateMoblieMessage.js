const twilio = require("twilio");
require("dotenv").config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
async function sendMobileMessage(phone_number, messageData) {
  try {
    const client = new twilio(accountSid, authToken);

    const message = await client.messages.create({
      body: messageData,
      to: phone_number,
      from: process.env.TWILIO_PHONE_NUMBER,
    });
    console.log("Message Sent On Your Number");
    return message.sid;
  } catch (error) {
    console.log(error, error.status, "error");
    return error.status;
  }
}

module.exports = sendMobileMessage;
