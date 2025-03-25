const nodemailer = require("nodemailer");

// Function to generate .ics file
function generateLinkForGoogle(eventDetails) {
  const baseGoogleURL = "https://calendar.google.com/calendar/r/eventedit";

  const { title, date, startTime, endTime, therapistName } = eventDetails;

  const startDate = new Date(startTime);
  const endDate = new Date(endTime);

  const startFormatted = startDate
    .toISOString()
    .replace(/[-:]/g, "")
    .split(".")[0];
  const endFormatted = endDate.toISOString().replace(/[-:]/g, "").split(".")[0];

  const googleLink = `${baseGoogleURL}?text=${encodeURIComponent(
    title
  )}&dates=${startFormatted}/${endFormatted}&details=${encodeURIComponent(
    `Session with ${therapistName}`
  )}&location=${encodeURIComponent("Online")}`;

  return googleLink;
}


function therapistTemplate(templateDetails) {
  const { link, patientName, therapistName, startTime, endTime, date } =
    templateDetails;
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Therapist Appointment</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            color: #333;
            margin: 0;
            padding: 0;
        }
        .email-container {
            width: 100%;
            max-width: 600px;
            margin: 20px auto;
            background-color: #f4f4f4;
            padding: 20px;
            border-radius: 8px;
        }
        .email-header {
            background-color: #4CAF50;
            color: #fff;
            padding: 10px;
            text-align: center;
            font-size: 18px;
        }
        .email-body {
            background-color: #fff;
            padding: 20px;
            border-radius: 8px;
            font-size: 14px;
        }
        .email-footer {
            font-size: 12px;
            color: #888;
            text-align: center;
            margin-top: 20px;
        }
        .btn {
            display: inline-block;
            padding: 10px 20px;
            background-color: #4CAF50;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 20px;
        }
        .btn:hover {
            background-color: #45a049;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            Therapy Session Appointment Date ${date} with Patient Name ${patientName}
        </div>
        <div class="email-body">
            <p>Dear Therapist ${therapistName},</p>
            <p>This is a reminder that you have a scheduled therapy session with <strong>${patientName}</strong> on <strong>${date}</strong> from <strong>${startTime}</strong> to <strong>${endTime}</strong>.</p>
            <p>Please click the button below to add this appointment to your calendar:</p>
            <a href=${link} class="btn">Add to Calendar</a>
            <p>If you have any issues or need to reschedule, please feel free to reach out.</p>
        </div>
        <div class="email-footer">
            <p>Best regards,<br>[Your Name]<br>[Your Contact Information]</p>
        </div>
    </div>
</body>
</html>
`;
}

function patientTemplate(templateDetails) {
  const { link, patientName, therapistName, startTime, endTime, date } =
    templateDetails;
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Therapist Appointment</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            color: #333;
            margin: 0;
            padding: 0;
        }
        .email-container {
            width: 100%;
            max-width: 600px;
            margin: 20px auto;
            background-color: #f4f4f4;
            padding: 20px;
            border-radius: 8px;
        }
        .email-header {
            background-color: #4CAF50;
            color: #fff;
            padding: 10px;
            text-align: center;
            font-size: 18px;
        }
        .email-body {
            background-color: #fff;
            padding: 20px;
            border-radius: 8px;
            font-size: 14px;
        }
        .email-footer {
            font-size: 12px;
            color: #888;
            text-align: center;
            margin-top: 20px;
        }
        .btn {
            display: inline-block;
            padding: 10px 20px;
            background-color: #4CAF50;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 20px;
        }
        .btn:hover {
            background-color: #45a049;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            Therapy Session Appointment Date ${date} with Dr.${therapistName}
        </div>
        <div class="email-body">
            <p>Dear ${patientName},</p>
            <p>This is a reminder of your upcoming therapy session with <strong>Dr. ${therapistName}</strong> on <strong>${date}</strong> from <strong>${startTime}</strong> to <strong>${endTime}</strong>.</p>
            <p>Please click the button below to add this appointment to your calendar:</p>
            <a href=${link} class="btn">Add to Calendar</a>
            <p>If you need to make any changes or have questions, don't hesitate to reach out.</p>
        </div>
        <div class="email-footer">
            <p>Looking forward to seeing you at your appointment!<br>Best regards,<br>[Your Name]<br>[Your Contact Information]</p>
        </div>
    </div>
</body>
</html>
`;
}

async function sendCalendarLink({ mailTo, mailId, templateDetails }) {
  try {
    const fromGmail = "t66113956@gmail.com";
    const gmailPassKey = "graj pbgn ysyf qeih";
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
      to: mailId,
      subject:
        mailTo === "therapist"
          ? `Therapy Session Appointment ${templateDetails.date} with ${templateDetails.patientName}`
          : `Therapy Session Appointment ${templateDetails.date} with ${templateDetails.therapistName}`,
      html:
        mailTo === "therapist"
          ? therapistTemplate(templateDetails)
          : patientTemplate(templateDetails),
    };

    const MailResult = await transporter.sendMail(mailOptions);
    return;
  } catch (error) {
    console.error("Failed to send email:", error.message);
    return error;
  }
}

module.exports = { generateLinkForGoogle, sendCalendarLink };
