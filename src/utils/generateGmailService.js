const nodemailer = require("nodemailer");
require("dotenv").config();
const fromGmail = process.env.FROM_Gmail;
const gmailPassKey = process.env.Gmail_Pass_Key;

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

    // html for booking
    const html1 = `<p>Your appointment is booked.</p>
                   <p><b>Date:</b> ${PatientDetails.date}</p>
                   <p><b>Time:</b> ${PatientDetails.time}</p>
                   <p>Thank you for booking with us!</p>`;

    const html2 = `<p>Your Appointment Status has been Changed.</p>
                   <p><b>New Status:</b> ${PatientDetails.status}</p>
                   <p>Thank you for booking with us!</p>`;
    const mailOptions = {
      from: fromGmail,
      to: PatientDetails.patientEmail,
      subject: PatientDetails.date
        ? "Booked Appointment Successfully and wait for Confirmation"
        : "Appointment Status Updated by Therapist",
      html: PatientDetails.date ? html1 : html2,
    };

    const MailResult = await transporter.sendMail(mailOptions);
    // console.log("Email sent successfully:", MailResult);
  } catch (error) {
    console.error("Failed to send email:", error.message);
  }
}

module.exports = sendGmailService;
