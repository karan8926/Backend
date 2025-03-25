const nodemailer = require("nodemailer");
require("dotenv").config();
const fromGmail = "t66113956@gmail.com";
const gmailPassKey = "graj pbgn ysyf qeih";

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

    const html3 = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Appointment Confirmation</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            color: #333;
            line-height: 1.6;
        }
        .container {
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
            border-radius: 8px;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
        }
        .header h1 {
            color: #2c3e50;
        }
        .content {
            margin: 20px 0;
        }
        .btn {
            background-color: #3498db;
            color: white;
            padding: 10px 20px;
            text-align: center;
            text-decoration: none;
            display: inline-block;
            border-radius: 4px;
            margin-top: 10px;
        }
        .footer {
            font-size: 12px;
            color: #7f8c8d;
            text-align: center;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Your Appointment is Confirmed!</h1>
        </div>
        <div class="content">
            <p>Dear ${PatientDetails.patientName},</p>
            <p>We are pleased to confirm your appointment with ${PatientDetails.therapistName}. To attend your appointment, please click on the link below to join the video chat room:</p>
            <p><a href="${PatientDetails.link}}" class="btn">Join Video Chat</a></p>
            <p><strong>Date and Time of Appointment:</strong> ${PatientDetails.appointementDate} and ${PatientDetails.appointementTime}</p>
            <p>If you have any questions or need assistance, please don't hesitate to contact us.</p>
        </div>
        <div class="footer">
            <p>Best regards, <br>clinicName</p>
            <p>For any inquiries, please contact us at: clinicContactInfo</p>
        </div>
    </div>
</body>
</html>
`;

    const html4 = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thank You for Your Appointment</title>
</head>
<body>
    <p>Dear ${PatientDetails.name},</p>
    
    <p>Thank you for meeting with us today. We appreciate your time and trust in our services. If you need any further assistance or have any questions, please don’t hesitate to reach out. We’re here to help!</p>
    
    <p>Take care,</p>
</body>
</html>
`;

    const html5 = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Appointment Reminder</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f4f4f4;
      color: #333;
      margin: 0;
      padding: 0;
    }
    .email-container {
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      padding: 20px;
      border-radius: 5px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }
    h1 {
      color: #2d87f0;
    }
    p {
      font-size: 16px;
      line-height: 1.6;
    }
    .highlight {
      font-weight: bold;
      color: #2d87f0;
    }
    .footer {
      font-size: 14px;
      color: #888;
      text-align: center;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <h1>Appointment Reminder</h1>
    <p>Hello ${PatientDetails.patientName},</p>
    <p>This is a friendly reminder that your upcoming appointment with <span class="highlight">${PatientDetails.therapistName}}</span> is ${PatientDetails.status}:</p>
    
    <p><span class="highlight">Appointment Date & Time:</span> ${PatientDetails.date} and ${PatientDetails.time}</p>
    
    <p>If you need to reschedule or have any questions, please feel free to contact our office at your earliest convenience.</p>
    
    <p>Thank you for choosing us!</p>
    
    <div class="footer">
      <p>Best regards, <br>{{clinic_name}} Team</p>
      <p>{{clinic_phone}} | <a href="mailto:{{clinic_email}}">{{clinic_email}}</a></p>
    </div>
  </div>
</body>
</html>
`;
    const mailOptions = {
      from: fromGmail,
      to: PatientDetails.patientEmail,
      subject: PatientDetails.date
        ? "Booked Appointment Successfully and wait for Confirmation"
        : PatientDetails.link
        ? "Your Appointment is Confirmed! Access Your Video Chat Here"
        : PatientDetails.name
        ? "Thank You for Your Appointment"
        : PatientDetails.therapistName
        ? "Appointment Reminder"
        : "Appointment Status Updated",
      html: PatientDetails.date
        ? html1
        : PatientDetails.link
        ? html3
        : PatientDetails.name
        ? html4
        : PatientDetails.therapistName
        ? html5
        : html2,
    };

    const MailResult = await transporter.sendMail(mailOptions);
    // console.log("Email sent successfully:", MailResult);
  } catch (error) {
    console.error("Failed to send email:", error.message);
  }
}

module.exports = sendGmailService;
