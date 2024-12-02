const Patient = require("../models/patients_models");
const generateAccessCode = require("../utils/generateAccessCode");
const emailValidator = require("email-validator");
const jwt = require("jsonwebtoken");
const CryptoJS = require("crypto-js");
const mongoose = require("mongoose");

const TherapistAvailability =
  require("../models/therapist_models").TherapistAvailability;
const Therapist = require("../models/therapist_models").Therapist;

const sendMobileMessage = require("../utils/generateMoblieMessage");
const sendGmailService = require("../utils/generateGmailService");

async function pantientSignUp(req, res) {
  try {
    const { name, phone_number, email } = req.body;

    if (!name || !phone_number || !email) {
      return res
        .status(400)
        .json({ error: "Name, number, and email are required." });
    }
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone_number)) {
      return res
        .status(400)
        .json({ error: "Phone number must be exactly 10 digits." });
    }

    if (!emailValidator.validate(email)) {
      return res.status(400).json({ error: "Invalid email address." });
    }

    const existingPatient = await Patient.findOne({ email });
    if (existingPatient) {
      return res.status(400).json({ error: "Email already registered." });
    }

    const accessCode = await generateAccessCode();

    const patientResult = new Patient({
      name,
      phone_number,
      email,
      accessCode,
    });

    await patientResult.save();

    await sendMail(mailOptions);

    res.status(201).json({
      name: patientResult.name,
      number: patientResult.phone_number,
      email: patientResult.email,
      accessCode: patientResult.accessCode,
      type: patientResult.type,
    });
  } catch (error) {
    res.status(500).json({ error: "Server error. Please try again later." });
  }
}

async function pantientSignIn(req, res) {
  try {
    const { accessCode } = req.body;

    if (!accessCode)
      return res.status(400).json({ error: "Access code is required." });

    const existedPatient = await Patient.findOne({ accessCode });

    if (!existedPatient)
      return res.status(400).json({ error: "Invalid access code." });

    const uniqueSecret = CryptoJS.SHA256(existedPatient.accessCode).toString(
      CryptoJS.enc.Base64
    );
    const token = jwt.sign(
      {
        patientId: existedPatient._id,
        name: existedPatient.name,
        email: existedPatient.email,
      },
      uniqueSecret,
      { expiresIn: "24h" }
    );
    const result = existedPatient;
    return res.status(200).json({
      accessToken: token,
      result,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Server error. Please try again later." });
  }
}

async function bookAppointment(req, res) {
  const { therapistsId, date, time, patientEmail, patientNumber } = req.body;

  if (!therapistsId || !date || !time || !patientEmail || !patientNumber) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    const slot = await TherapistAvailability.aggregate([
      {
        $match: {
          therapistsId: new mongoose.Types.ObjectId(therapistsId),
          date: new Date(date),
          time: time,
          status: "none",
        },
      },
      {
        $lookup: {
          from: "therapists",
          localField: "therapistsId",
          foreignField: "_id",
          as: "therapistDetails",
        },
      },
    ]);

    if (slot.length === 0) {
      return res.status(404).json({
        error: "No available slot found for the selected date and time.",
      });
    } else {
      const slotId = slot[0]._id;
      const SaveStatus = await TherapistAvailability.findById(slotId);

      SaveStatus.status = "pending";
      await SaveStatus.save();

      const PatientDetails = {
        patientEmail: patientEmail,
        date: date,
        time: time,
      };
      await sendGmailService(PatientDetails);

      const message = {
        date: date,
        time: time,
        patientNumber: patientNumber,
      };
      await sendMobileMessage(message);

      return res.status(200).json({
        message: "Appointment booked successfully. Confirmation email sent.",
        result: slot,
      });
    }
  } catch (error) {
    console.error("Error booking appointment:", error);
    return res.status(500).json({ error: "Error booking appointment" });
  }
}

async function allAppointment(req, res) {
  const { pageNo } = req.query || 1;
  const limit = 12;
  const offset = (pageNo - 1) * limit;
  try {
    const AppointmentData = await TherapistAvailability.find()
      .limit(limit)
      .skip(offset)
      .sort({ createdAt: -1 });

    if (AppointmentData.length === 0) {
      return res.status(404).json({ message: "No Appointment found" });
    }
    const totalAppointment = await TherapistAvailability.countDocuments();
    res.status(200).json({
      message: "All Appointment retrieved successfully",
      AppointmentData,
      noOfPatient: totalAppointment,
      noOfPages: Math.ceil(totalAppointment / limit),
    });
  } catch (error) {
    console.error("Error fetching Appointment:", error);
    res.status(500).json({ message: "Server error", error });
  }
}

async function getPatient(req, res) {
  const { pageNo } = req.query || 1;
  const limit = 12;
  const offset = (pageNo - 1) * limit;
  try {
    const patients = await Patient.find()
      .limit(limit)
      .skip(offset)
      .sort({ createdAt: -1 });

    if (patients.length === 0) {
      return res.status(404).json({ message: "No patients found" });
    }
    const totalPatients = await Patient.countDocuments();
    res.status(200).json({
      message: "Patients retrieved successfully",
      patients,
      noOfPatient: totalPatients,
      noOfPages: Math.ceil(totalPatients / limit),
    });
  } catch (error) {
    console.error("Error fetching patients:", error);
    res.status(500).json({ message: "Server error", error });
  }
}

module.exports = {
  pantientSignUp,
  pantientSignIn,
  bookAppointment,
  allAppointment,
  getPatient,
};
