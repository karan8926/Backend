const { connectDB } = require("../config/db");
const calendarAvailability = require("../models/calendar_models");
const { TherapistAvailability } = require("../models/therapist_models");
async function removeExpireAppointments() {
  try {
    const currentDate = new Date();
    const today = new Date(currentDate.setHours(0, 0, 0, 0));

    const data = await TherapistAvailability.deleteMany({
      date: { $lt: today },
      $or: [{ appointment: null }, { appointment: { $exists: false } }],
    });
    console.log(data, "data");
    return;
  } catch (error) {
    console.log(error, "erro");
    return error;
  }
}

async function removeExpireCalendarAvailability() {
  try {
    // Delete expired calendar availability entries in the database
    const data = await calendarAvailability.deleteMany({
      endTime: { $lt: new Date().toISOString() },
    });
    console.log(data);
    return;
  } catch (error) {
    console.log(error, "erro");
    return error;
  }
}

module.exports = { removeExpireAppointments, removeExpireCalendarAvailability };
