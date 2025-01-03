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

const nodemailer = require("nodemailer");
require("dotenv").config();

async function pantientSignUp(req, res) {
  try {
    // const { name, phone_number, email, accessCode } = req.body;
    const { email, name, phone_number, accessCode } = req.body;

    if (!email || !accessCode) {
      return res
        .status(400)
        .json({ error: "Name, number, email and accessCode are required." });
    }

    // const phoneRegex = /^\d{10}$/;
    // if (!phoneRegex.test(phone_number)) {
    //   return res
    //     .status(400)
    //     .json({ error: "Phone number must be exactly 10 digits." });
    // }

    if (!emailValidator.validate(email)) {
      return res.status(400).json({ error: "Invalid email address." });
    }

    // const existingPatient = await Patient.findOne({ email });
    // if (existingPatient) {
    //   return res.status(400).json({ error: "Email already registered." });
    // }

    // const accessCode = await generateAccessCode();

    const patientResult = new Patient({
      // name,
      // phone_number,
      email,
      accessCode,
    });

    if (name) {
      patientResult.name = name;
    }
    if (phone_number) {
      patientResult.phone_number = phone_number;
    }
    await patientResult.save();

    const transporter = nodemailer.createTransport({
      service: "Gmail",
      secure: true,
      port: 465,
      auth: {
        user: "info66441@gmail.com",
        pass: "hgqa fxvm ddiz fido",
      },
    });

    const mailOptions = {
      from: "skylinea1999@gmail.com",
      to: patientResult.email,
      subject: "Registered Successfully",
      html: `<p>Your Access Code is: <strong>${patientResult.accessCode}</strong></p>
             <p>Thank you for register with us!</p>`,
    };

    try {
      const data = await transporter.sendMail(mailOptions);
    } catch (emailError) {
      console.error("Error sending email:", emailError);
      return res
        .status(500)
        .json({ error: "Error sending confirmation email. Please try again." });
    }

    res.status(201).json({
      // name: patientResult.name,
      // number: patientResult.phone_number,
      email: patientResult.email,
      accessCode: patientResult.accessCode,
      status: patientResult.status,
      type: patientResult.type,
    });
  } catch (error) {
    console.error("Error during patient signup:", error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
}

async function getUniqueAccessCode(req, res) {
  try {
    const accessCode = await generateAccessCode();
    return res.status(200).json({
      message: "Successfully generated AccessCode",
      accessToken: accessCode,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Server error. Please try again later." });
  }
}

async function pantientSignIn(req, res) {
  try {
    const { accessCode } = req.body;

    if (!accessCode)
      return res.status(400).json({ error: "Access code is required." });

    const existedPatient = await Patient.findOne({ accessCode });
    if (existedPatient.status === "false") {
      return res.status(404).json({
        error: "Access Code Expire",
      });
    }
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
  const {
    therapistsId,
    date,
    time,
    patientEmail,
    // patientNumber,
    name,
    email,
    phone,
    accessCode, //it is unique so we can find patient data
  } = req.body;

  if (!therapistsId || !date || !time || !patientEmail) {
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
      const patientsDetails = await Patient.find({ accessCode: accessCode });
      SaveStatus.status = "Pending";
      SaveStatus.patientsId = patientsDetails[0]._id;
      SaveStatus.appointment.name = name;
      SaveStatus.appointment.email = email;
      SaveStatus.appointment.phone = phone;
      patientsDetails[0].phone_number = phone;
      patientsDetails[0].name = name;
      patientsDetails[0].status = false;

      await Promise.all([patientsDetails[0].save(), SaveStatus.save()]);

      const PatientDetails = {
        patientEmail: email,
        date: date,
        time: time,
      };
      await sendGmailService(PatientDetails);

      const message = {
        date: date,
        time: time,
        // patientNumber: phone,
      };
      // await sendMobileMessage(message);

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
  const pageNo = req.query.pageNo || 1;
  const limit = 8;
  const offset = (pageNo - 1) * limit;

  console.log(pageNo, limit, offset);
  try {
    const AppointmentData = await TherapistAvailability.aggregate([
      {
        $lookup: {
          from: "therapists",
          localField: "therapistsId",
          foreignField: "_id",
          as: "therapistDetails",
        },
      },
      {
        $lookup: {
          from: "patients",
          localField: "patientsId",
          foreignField: "_id",
          as: "patientDetails",
        },
      },
    ])
      .skip(offset)
      .limit(limit);
    console.log(AppointmentData.length, "length");

    if (AppointmentData.length === 0) {
      return res.status(404).json({ message: "No Appointment found" });
    }

    const totalAppointment = await TherapistAvailability.countDocuments();

    res.status(200).json({
      message: "All Appointment retrieved successfully",
      AppointmentData,
      totalAppointments: totalAppointment,
      currentPage: Number(pageNo),
      noOfPages: Math.ceil(totalAppointment / limit),
    });
  } catch (error) {
    console.error("Error fetching Appointment:", error);
    res.status(500).json({ message: "Server error", error });
  }
}

async function getPatient(req, res) {
  const { pageNo, searchPatient } = req.query || 1;
  const limit = 10;
  const offset = (pageNo - 1) * limit;
  const filter = searchPatient
    ? { name: { $regex: searchPatient, $options: "i" } }
    : {};
  try {
    const patients = await Patient.find(filter)
      .limit(limit)
      .skip(offset)
      .sort({ createdAt: -1 });

    if (patients.length === 0) {
      return res.status(404).json({ message: "No patients found" });
    }
    const totalPatients = await Patient.countDocuments(filter);
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

async function getPatientDetailsById(req, res) {
  try {
    const { patientId } = req.query;
    const pageNo = parseInt(req.query.pageNo) || 1;
    const limit = parseInt(req.query.pageSize) || 10;
    const offset = (pageNo - 1) * limit;

    if (!patientId) {
      return res.status(400).json({ error: "patientId is required." });
    }

    let filter = {};

    if (mongoose.Types.ObjectId.isValid(patientId)) {
      filter.patientsId = new mongoose.Types.ObjectId(patientId);
    } else {
      return res.status(400).json({ error: "Invalid patientId format." });
    }

    const totalItems = await TherapistAvailability.countDocuments(filter);

    const result = await TherapistAvailability.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: "patients",
          localField: "patientsId",
          foreignField: "_id",
          as: "patientDetails",
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
    ])
      .skip(offset)
      .limit(limit);

    if (!result.length) {
      return res.status(404).json({ message: "data is not found." });
    }

    return res.status(200).json({
      message: "Available data fetched successfully",
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      currentPage: pageNo,
      result,
    });
  } catch (error) {
    console.error("Error fetching patient:", error);
    return res.status(500).json({ error: "Error fetching patient" });
  }
}

module.exports = {
  pantientSignUp,
  pantientSignIn,
  bookAppointment,
  allAppointment,
  getPatient,
  getPatientDetailsById,
  getUniqueAccessCode,
};
