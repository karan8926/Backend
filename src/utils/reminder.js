const mySqlConn = require("../config/mysqlDb");
const moment = require("moment-timezone");
const cron = require("node-cron");
const sendGmailService = require("./generateGmailService");
async function reminderSchedule() {
  const [appointmentData] = await mySqlConn.query(
    `select * from TherapistAvailability where status='Confirmed'`
  );
  const defaultTimezone = "America/New_York";
  appointmentData.forEach(async (appointment) => {
    const appointmentDate = moment.utc(appointment.date);
    const reminderTime = appointmentDate.subtract(24, "hours");
    const localReminderTime = reminderTime.tz(defaultTimezone);
    const cronTime = localReminderTime.format("m H D M *");
    const [therapistDetails] = await mySqlConn.query(
      `select name from Therapist where id=${appointment.therapistsId}`
    );
    PatientDetails = {
      patientName: appointment.appointment_name,
      patientEmail: appointment.appointment_email,
      status: appointment.status,
      date: appointment.date,
      time: appointment.time,
      therapistName: therapistDetails[0].name,
    };
    cron.schedule(cronTime, () => {
      sendGmailService(PatientDetails);
    });
    console.log(
      `Reminder scheduled for appointment ${
        appointment.id
      } at ${localReminderTime.format("MMMM Do YYYY, h:mm a")} local time.`
    );
  });
}
module.exports = reminderSchedule;
