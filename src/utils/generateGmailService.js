const nodemailer = require("nodemailer");
require('dotenv').config();
const fromGmail = process.env.FROM_Gmail
const gmailPassKey = process.env.Gmail_Pass_Key

async function sendGmailService(PatientDetails) {
    try {
        const transporter = nodemailer.createTransport({
            service: "Gmail", 
            secure: true,  
            port: 465,
            auth: {
                user: fromGmail,
                pass: gmailPassKey,
            },
        });

        const mailOptions = {
            from: fromGmail,
            to: PatientDetails.patientEmail,
            subject: "Booked Appointment Successfully and wait for Confirmation",
            html: `<p>Your appointment is booked.</p>
                   <p><b>Date:</b> ${PatientDetails.date}</p>
                   <p><b>Time:</b> ${PatientDetails.time}</p>
                   <p>Thank you for booking with us!</p>`,
        };

        const MailResult = await transporter.sendMail(mailOptions);
        // console.log("Email sent successfully:", MailResult);
    } catch (error) {
        console.error("Failed to send email:", error.message);
    }
}

module.exports = sendGmailService