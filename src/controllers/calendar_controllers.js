const calendarAvailability = require("../models/calendar_models");
const moment = require("moment");
const { TherapistAvailability } = require("../models/therapist_models");

function TimeExtraction(date) {
  console.log(typeof date, date, "type");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}
async function createAppointmentOnTheBasisOfAvailability(
  startTime,
  endTime,
  therapistId
) {
  const start = moment(startTime);
  const end = moment(endTime);

  const totalDuration = end.diff(start, "minutes");
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
      const appointmentEnd = appointmentStart.clone().add(45, "minutes");
      appointments.push({
        therapistsId: therapistId,
        date: appointmentStart.toISOString(),
        time: TimeExtraction(new Date(appointmentStart)),
        status: "none",
        appointmentType: "Consultation(45min)",
      });

      currentTime = appointmentEnd;
    }

    if (i < num30MinAppointments) {
      const appointmentStart = currentTime.clone();
      const appointmentEnd = appointmentStart.clone().add(30, "minutes");
      appointments.push({
        therapistsId: therapistId,
        date: appointmentStart.toISOString(),
        time: TimeExtraction(new Date(appointmentStart)),
        status: "none",
        appointmentType: "Follow-up(30min)",
      });
      currentTime = appointmentEnd;
    }
  }

  const newAvailabilites = await TherapistAvailability.insertMany(appointments);
  return;
}
async function addCalendarAvailability(req, res) {
  try {
    const { therapistId, availability, startTime, endTime } = req.body;

    if (!therapistId || !availability || !startTime || !endTime) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const existingData = await calendarAvailability.findOne({
      therapistsId: therapistId,
      startTime,
      endTime,
    });

    if (existingData) {
      return res.status(409).json({
        error: "The specified date and time availability is already added.",
      });
    }

    if (availability === "Available") {
      const data = await createAppointmentOnTheBasisOfAvailability(
        startTime,
        endTime,
        therapistId,
        availability
      );
    }
    const newAvailability = new calendarAvailability({
      therapistsId: therapistId,
      availability,
      startTime,
      endTime,
    });

    const savedAvailability = await newAvailability.save();

    return res.status(201).json({
      message: "Calendar availability added successfully.",
      data: savedAvailability,
    });
  } catch (error) {
    console.error("Error adding calendar availability:", error);
    return res.status(500).json({
      error: "An error occurred while adding calendar availability.",
    });
  }
}

async function getCalendarAvailabilityById(req, res) {
  try {
    const { therapistId } = req.query;

    if (!therapistId) {
      return res.status(400).json({ error: "therapistId are required." });
    }

    const availabilityData = await calendarAvailability.find({
      therapistsId: therapistId,
    });

    if (availabilityData.length === 0) {
      return res.status(404).json({
        error: "No availability data found for the this therapistId.",
      });
    }

    return res.status(200).json({
      message: "Calendar availability fetched successfully.",
      data: availabilityData,
    });
  } catch (error) {
    console.error("Error fetching calendar availability:", error);
    return res.status(500).json({
      error: "An error occurred while fetching calendar availability.",
    });
  }
}

module.exports = { addCalendarAvailability, getCalendarAvailabilityById };
