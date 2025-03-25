const generateAccessCode = require("../utils/generateAccessCode");
const emailValidator = require("email-validator");
const jwt = require("jsonwebtoken");
const CryptoJS = require("crypto-js");

const sendMobileMessage = require("../utils/generateMoblieMessage");
const sendGmailService = require("../utils/generateGmailService");

const nodemailer = require("nodemailer");
const mySqlConn = require("../config/mysqlDb");
const {
  sendCalendarLink,
  generateLinkForGoogle,
} = require("../utils/generateGoogleAndOutlookCanlendarLink");
require("dotenv").config();

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
async function pantientSignUp(req, res) {
  try {
    const {
      email,
      name,
      phone_number,
      accessCode,
      regionAddedByAdmin,
      therapistNameAddedByAdmin,
    } = req.body;

    if (!email || !accessCode) {
      return res
        .status(400)
        .json({ error: "Email and accessCode are required." });
    }

    if (!emailValidator.validate(email)) {
      return res.status(400).json({ error: "Invalid email address." });
    }

    // Use existing connection (mySqlConn)
    const [existingPatient] = await mySqlConn.query(
      "SELECT * FROM Patients WHERE email = ?",
      [email]
    );

    if (existingPatient.length > 0) {
      return res.status(400).json({ error: "Email already registered." });
    }

    // Insert the new patientsamili3775@easipro.com
    const [patientResult] = await mySqlConn.query(
      "INSERT INTO Patients (email, name, phone_number, accessCode,regionAddedByAdmin,therapistNameAddedByAdmin) VALUES (?, ?, ?, ?,?,?)",
      [
        email,
        name,
        phone_number,
        accessCode,
        regionAddedByAdmin,
        therapistNameAddedByAdmin,
      ]
    );

    const patientId = patientResult.insertId;

    // Send confirmation email
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      secure: true,
      port: 465,
      auth: {
        user: "t66113956@gmail.com",
        pass: "graj pbgn ysyf qeih ",
      },
    });

    const mailOptions = {
      from: "t66113956@gmail.com",
      to: email,
      subject: "Registered Successfully",
      html: `<p>Your Access Code is: <strong>${accessCode}</strong></p>
       <p>Region Assigned by Admin: <strong>${
         regionAddedByAdmin === "All"
           ? "You can Access all the Regions Therapist"
           : regionAddedByAdmin
       }</strong></p>
         <p>Therapist Assigned by Admin: <strong>${
           therapistNameAddedByAdmin === "All"
             ? "You can Access Therapists from all regions "
             : therapistNameAddedByAdmin
         }</strong></p>
             <p>Thank you for registering with us!</p>`,
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch (emailError) {
      console.error("Error sending email:", emailError);
      return res
        .status(500)
        .json({ error: "Error sending confirmation email. Please try again." });
    }

    return res.status(201).json({
      email,
      accessCode,
      status: "none", // Default status for new patient
      type: "new", // Default type (you may adjust based on your needs)
    });
  } catch (error) {
    console.error("Error during patient signup:", error);
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

    // Use existing connection (mySqlConn)
    const [existedPatient] = await mySqlConn.query(
      "SELECT * FROM Patients WHERE accessCode = ?",
      [accessCode]
    );

    // console.log(existedPatient, 'existedPatient');
    if (existedPatient.length === 0) {
      return res.status(400).json({ error: "Invalid access code." });
    }

    const patient = existedPatient[0];

    if (patient.status === 0) {
      return res.status(404).json({ error: "Access Code Expired" });
    }

    const uniqueSecret = CryptoJS.SHA256(patient.accessCode).toString(
      CryptoJS.enc.Base64
    );
    const token = jwt.sign(
      {
        patientId: patient.id,
        name: patient.name,
        email: patient.email,
      },
      uniqueSecret,
      { expiresIn: "24h" }
    );

    return res.status(200).json({
      accessToken: token,
      result: patient,
    });
  } catch (error) {
    console.error("Error during patient sign-in:", error);
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
    name,
    email,
    phone,
    accessCode,
  } = req.body;

  if (!therapistsId || !date || !time || !patientEmail) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    // Use existing connection (mySqlConn)
    const [slots] = await mySqlConn.query(
      `SELECT * FROM TherapistAvailability WHERE therapistsId = ? AND Date(date) = ? AND time = ? AND status = "none"`,
      [therapistsId, date, time]
    );
    if (slots.length === 0) {
      return res.status(404).json({
        error: "No available slot found for the selected date and time.",
      });
    }

    const slot = slots[0];
    console.log(slot, "slot");
    // Fetch patient details
    const [patients] = await mySqlConn.query(
      "SELECT * FROM Patients WHERE accessCode = ?",
      [accessCode]
    );

    if (patients.length === 0) {
      return res.status(404).json({ error: "Patient not found." });
    }

    const patient = patients[0];
    // Send confirmation email
    const PatientDetails = { patientEmail: email, date: date, time: time };
    await sendGmailService(PatientDetails);
    const [therapistDetails] = await mySqlConn.query(
      "select name,email from Therapist where id=?",
      [therapistsId]
    );
    const startTime = slot.date;
    let endTime = new Date(startTime);
    slot.appointmentType === "Consultation(45min)"
      ? endTime.setMinutes(endTime.getMinutes() + 45)
      : endTime.setMinutes(endTime.getMinutes() + 30);
    const eventDetails = {
      title: "Therapy Session",
      date: date,
      startTime: startTime,
      endTime: endTime,
      therapistName: therapistDetails[0].name,
    };
    const link = generateLinkForGoogle(eventDetails);
    const templateDetails = {
      link: link,
      patientName: name,
      therapistName: therapistDetails[0].name,
      date: date,
      startTime: startTime,
      endTime: endTime,
      appointmentType: slot.appointmentType,
    };
    // send mail to therapist
    await sendCalendarLink({
      mailTo: "therapist",
      mailId: therapistDetails[0].email,
      templateDetails,
    });

    // send mail to patient
    await sendCalendarLink({
      mailTo: "patient",
      mailId: email,
      templateDetails,
    });

    const dateSentOnPhone = date.toString().split("T")[0];
    const phoneValidation = await sendMobileMessage(
      `+${phone}`,
      `We have confirmed your appointment with therapist for ${dateSentOnPhone} at ${time}`
    );

    if (phoneValidation === 400) {
      return res.status(400).json({
        error: "Phone Number is Invalid",
      });
    }

    // Update the slot and patient status
    await mySqlConn.query(
      'UPDATE TherapistAvailability SET status = "Pending", patientsId = ?, appointment_name = ?,appointment_email= ?,appointment_phone= ? WHERE id = ?',
      [patient.id, name, email, phone, slot.id]
    );

    patient.phone_number = phone;
    patient.name = name;
    patient.status = 0; // Mark as inactive

    await mySqlConn.query(
      "UPDATE Patients SET phone_number = ?, name = ?, status = ? WHERE id = ?",
      [phone, name, 0, patient.id]
    );
    return res.status(200).json({
      message:
        "Appointment booked successfully. Confirmation sent on Email and Phone.",
      result: slot,
    });
  } catch (error) {
    console.error("Error booking appointment:", error);
    return res.status(500).json({ error: "Error booking appointment." });
  }
}
async function allAppointment(req, res) {
  const pageNo = req.query.pageNo || 1;
  const limit = 8;
  const offset = (pageNo - 1) * limit;
  const { searchType, searchQuery, region, speciality } = req.query;

  const filters = {
    appointmentName: searchType === "patient" ? searchQuery : " ",
    therapistName: searchType === "therapist" ? searchQuery : " ",
    therapistRegion: region,
    therapistSpeciality: speciality,
  };

  try {
    const query = `
      SELECT ta.*, t.name AS therapistName,t.email AS therapistEmail, t.region AS therapistRegion, t.specialty AS therapistSpeciality, p.name AS patientName, p.email AS patientEmail
      FROM TherapistAvailability ta
      JOIN Therapist t ON ta.therapistsId = t.id
      JOIN Patients p ON ta.patientsId = p.id
      WHERE 
        (ta.appointment_name LIKE ? OR ? = ' ') 
        AND (t.name LIKE ? OR ? = ' ') 
        AND (t.region = ? OR ? = 'all')
        AND (t.specialty = ? OR ? = 'all')
      LIMIT ? OFFSET ?
    `;

    const [appointments] = await mySqlConn.query(query, [
      `%${filters.appointmentName}%`,
      filters.appointmentName,
      `%${filters.therapistName}%`,
      filters.therapistName,
      filters.therapistRegion,
      filters.therapistRegion,
      filters.therapistSpeciality,
      filters.therapistSpeciality,
      limit,
      offset,
    ]);

    if (appointments.length === 0) {
      return res.status(404).json({ message: "No Appointment found" });
    }

    const [totalAppointments] = await mySqlConn.query(
      "SELECT COUNT(*) AS count FROM TherapistAvailability"
    );

    // console.log(appointments, 'appointments');
    res.status(200).json({
      message: "All Appointment retrieved successfully",
      AppointmentData: appointments,
      totalAppointments: totalAppointments[0].count,
      currentPage: Number(pageNo),
      noOfPages: Math.ceil(totalAppointments[0].count / limit),
    });
  } catch (error) {
    console.error("Error fetching Appointment:", error);
    res.status(500).json({ message: "Server error", error });
  }
}
async function getPatient(req, res) {
  const { pageNo, searchPatient } = req.query;
  const limit = 10;
  const offset = (pageNo - 1) * limit;
  try {
    const query = `
      SELECT * FROM Patients 
      WHERE  ${searchPatient ? "name LIKE ?" : "1=1"}  
      LIMIT ? OFFSET ?
    `;

    const params = searchPatient
      ? [`%${searchPatient}%`, limit, offset]
      : [limit, offset];
    const [patients] = await mySqlConn.query(query, params);

    if (patients.length === 0) {
      return res.status(404).json({ message: "No patients found" });
    }

    const totalPatientsQuery = `
      SELECT COUNT(*) AS count FROM Patients 
      WHERE ${searchPatient ? "name LIKE ?" : "1=1"}
    `;
    const totalParams = searchPatient ? [`%${searchPatient}%`] : [];

    const [totalPatients] = await mySqlConn.query(
      totalPatientsQuery,
      totalParams
    );

    res.status(200).json({
      message: "Patients retrieved successfully",
      patients,
      noOfPatient: totalPatients[0].count,
      noOfPages: Math.ceil(totalPatients[0].count / limit),
    });
  } catch (error) {
    console.error("Error fetching patients:", error);
    res.status(500).json({ message: "Server error", error });
  }
}
async function getPatientDetailsById(req, res) {
  const { patientId, pageNo = 1, pageSize = 10 } = req.query;
  const limit = parseInt(pageSize);
  const offset = (pageNo - 1) * limit;

  if (!patientId) {
    return res.status(400).json({ error: "patientId is required." });
  }

  try {
    // First, check if the patient exists
    const [patient] = await mySqlConn.query(
      "SELECT * FROM Patients WHERE id = ?",
      [patientId]
    );
    // console.log(patient, 'p');
    if (patient.length === 0) {
      return res.status(404).json({ message: "Patient not found." });
    }

    // Get the total number of appointments for this patient
    const [totalItems] = await mySqlConn.query(
      "SELECT COUNT(*) AS count FROM TherapistAvailability WHERE patientsId = ?",
      [patientId]
    );

    const query = `
      SELECT ta.*, t.name AS therapistName,t.email AS therapistEmail,t.specialty AS specialty,t.region AS region,p.name AS patientName
      FROM TherapistAvailability ta
      JOIN Therapist t ON ta.therapistsId = t.id
      JOIN Patients p ON ta.patientsId = p.id
      WHERE ta.patientsId = ?
      LIMIT ? OFFSET ?
    `;

    const [appointments] = await mySqlConn.query(query, [
      patientId,
      limit,
      offset,
    ]);

    if (appointments.length === 0) {
      return res
        .status(404)
        .json({ message: "No appointments found for this patient." });
    }

    return res.status(200).json({
      message: "Available data fetched successfully",
      totalItems: totalItems[0].count,
      totalPages: Math.ceil(totalItems[0].count / limit),
      currentPage: pageNo,
      result: appointments,
    });
  } catch (error) {
    console.error("Error fetching patient details:", error);
    return res.status(500).json({ error: "Error fetching patient details" });
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
