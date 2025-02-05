const moment = require('moment');
const {
  removeExpireCalendarAvailability,
} = require('../utils/removeExpireData');
const mySqlConn = require('../config/mysqlDb');

function TimeExtraction(date) {
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

async function createAppointmentOnTheBasisOfAvailability(
  startTime,
  endTime,
  therapistId
) {
  console.log(startTime, endTime, therapistId, 'axis');
  const start = moment(startTime);
  const end = moment(endTime);

  const totalDuration = end.diff(start, 'minutes');
  const num45MinAppointments = Math.floor(totalDuration / 2 / 45);
  const num30MinAppointments = Math.floor(totalDuration / 2 / 30);

  const appointments = [];
  let currentTime = start.clone();

  for (
    let i = 0;
    i < Math.max(num45MinAppointments, num30MinAppointments);
    i++
  ) {
    if (i < num45MinAppointments) {
      const appointmentStart = currentTime.clone();
      const appointmentEnd = appointmentStart.clone().add(45, 'minutes');

      const appointment = {
        therapistsId: therapistId,
        date: appointmentStart.toISOString(),
        time: TimeExtraction(new Date(appointmentStart)),
        status: 'none',
        appointmentType: 'Consultation(45min)',
      };

      appointments.push(appointment);
      currentTime = appointmentEnd;
    }

    if (i < num30MinAppointments) {
      const appointmentStart = currentTime.clone();
      const appointmentEnd = appointmentStart.clone().add(30, 'minutes');

      const appointment = {
        therapistsId: therapistId,
        date: appointmentStart.toISOString(),
        time: TimeExtraction(new Date(appointmentStart)),
        status: 'none',
        appointmentType: 'Follow-up(30min)',
      };

      appointments.push(appointment);
      currentTime = appointmentEnd;
    }
  }

  // Insert appointments into MySQL
  const queries = appointments.map((appointment) => {
    return new Promise((resolve, reject) => {
      mySqlConn.query(
        'INSERT INTO TherapistAvailability (therapistsId, date, time, status, appointmentType) VALUES (?, ?, ?, ?, ?)',
        [
          appointment.therapistsId,
          appointment.date,
          appointment.time,
          appointment.status,
          appointment.appointmentType,
        ],
        (error, results) => {
          if (error) return reject(error);
          resolve(results);
        }
      );
    });
  });

  await Promise.all(queries);
  return;
}

async function addCalendarAvailability(req, res) {
  try {
    const { therapistId, availability, startTime, endTime } = req.body;
    if (!therapistId || !availability || !startTime || !endTime) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    // Check if the availability already exists
    const [duplicate] = await mySqlConn.query(
      'SELECT * FROM calendaravailability WHERE therapistsId = ? AND startTime = ? AND endTime = ?',
      [therapistId, startTime, endTime]
    );
    if (duplicate.length > 0) {
      return res.status(409).json({
        error: 'The specified date and time availability is already added.',
      });
    }
    if (availability === 'Available') {
      createAppointmentOnTheBasisOfAvailability(
        startTime,
        endTime,
        therapistId
      );
    }

    // // Insert the new availability
    const results = await mySqlConn.query(
      'INSERT INTO calendaravailability (therapistsId, availability, startTime, endTime) VALUES (?, ?, ?, ?)',
      [therapistId, availability, startTime, endTime]
    );
    return res.status(201).json({
      message: 'Calendar availability added successfully.',
      data: results,
    });
  } catch (error) {
    console.error('Error adding calendar availability:', error);
    return res.status(500).json({
      error: 'An error occurred while adding calendar availability.',
    });
  }
}

async function getCalendarAvailabilityById(req, res) {
  try {
    const { therapistId } = req.query;
    if (!therapistId) {
      return res.status(400).json({ error: 'therapistId are required.' });
    }

    // Remove expired availability (if any)
    await removeExpireCalendarAvailability();

    // Fetch availability from MySQL
    const [results] = await mySqlConn.query(
      'SELECT * FROM calendaravailability  WHERE therapistsId = ?',
      [therapistId]
    );
    const date = new Date(results[0].startTime);
    const utcDate = date.toISOString(); // Converts to ISO string in UTC
    // console.log(utcDate, 'res');

    if (results.length === 0) {
      return res.status(404).json({
        error: 'No availability data found for this therapistId.',
      });
    }

    return res.status(200).json({
      message: 'Calendar availability fetched successfully.',
      data: results,
    });
  } catch (error) {
    console.error('Error fetching calendar availability:', error);
    return res.status(500).json({
      error: 'An error occurred while fetching calendar availability.',
    });
  }
}

module.exports = { addCalendarAvailability, getCalendarAvailabilityById };
