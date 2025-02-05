const mySqlConn = require('../config/mysqlDb');
async function removeExpireAppointments() {
  try {
    const currentDate = new Date();

    console.log(currentDate, 'today');
    // Query to delete expired appointments
    const [data] = await mySqlConn.query(
      `DELETE FROM TherapistAvailability
       WHERE date < ? AND (patientsId IS NULL)`,
      [currentDate]
    );

    console.log(data, 'data'); 
    return;
  } catch (error) {
    console.log(error, 'error');
    return error;
  }
}

async function removeExpireCalendarAvailability() {
  try {
    // Query to delete expired calendar availability records
    const [data] = await mySqlConn.query(
      `DELETE FROM calendaravailability WHERE endTime < NOW()`
    );

    return;
  } catch (error) {
    console.log(error, 'error');
    return error;
  }
}

module.exports = { removeExpireAppointments, removeExpireCalendarAvailability };
