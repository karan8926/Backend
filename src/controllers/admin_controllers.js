const mySqlConn = require("../config/mysqlDb");
const jwt = require("jsonwebtoken");
const sendGmailService = require("../utils/generateGmailService");
const sendMobileMessage = require("../utils/generateMoblieMessage");

const loginAdmin = async (req, res) => {
  console.log(req.body, "body");
  try {
    const { email, password } = req.body;

    // Query the MySQL database for the admin with the given email
    const [rows] = await mySqlConn.query(
      "SELECT * FROM Admin WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const admin = rows[0];

    // Compare the provided password with the hashed password stored in the database
    const isMatch = rows[0].password === password && rows[0].email === email;
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Create a JWT token
    const token = jwt.sign(
      { id: admin.id, email: admin.email },
      process.env.JWT_SECRET || "your_jwt_secret",
      { expiresIn: "24h" }
    );

    // Respond with success and the generated token
    res.status(200).json({
      message: "Login successful",
      token,
      data: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        type: "admin",
      },
    });
  } catch (error) {
    console.error("Error in admin login:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// before status change i have to  send link of chat room
async function triggerLinkOnEmail(req, res) {
  try {
    console.log(req.body, "body");
    const {
      link,
      emailId,
      patientName,
      therapistName,
      appointementDate,
      appointementTime,
    } = req.body;
    const PatientDetails = {
      patientEmail: emailId,
      link: link,
      patientName: patientName,
      therapistName: therapistName,
      appointementDate: appointementDate,
      appointementTime: appointementTime,
    };
    // console.log(PatientDetails, 'details');
    await sendGmailService(PatientDetails);
    res.status(200).json({
      message: "Mail sent on Email Id",
    });
  } catch (error) {
    res.status(500).json({
      message: "Something went wrong",
    });
  }
}

// now admin can update the status of appointment
const updateAppointmentStatus = async (req, res) => {
  try {
    const { id, status, emailId } = req.body;
    // console.log(req.body, 'req.body');
    // Retrieve existing appointment details
    const [existingResult] = await mySqlConn.query(
      "SELECT * FROM TherapistAvailability WHERE id = ?",
      [id]
    );
    if (existingResult.length === 0) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    // Update appointment status
    const [updatedResult] = await mySqlConn.query(
      "UPDATE TherapistAvailability SET status = ? WHERE id = ?",
      [status, id]
    );

    // Send email to patient
    const PatientDetails = {
      patientEmail: emailId,
      status: status,
    };

    if (status === "Completed") {
      PatientDetails.name = existingResult[0].appointment_name;
    }
    // console.log(PatientDetails, 'details');
    await sendGmailService(PatientDetails);

    // Send confirmation SMS to the patient
    const [therapistDetails] = await mySqlConn.query(
      "SELECT name FROM Therapist WHERE id = ?",
      [existingResult[0].therapistsId]
    );

    const patientPhoneNumber = existingResult[0].appointment_phone;
    const formatingDate = new Date(existingResult[0].date);
    const dateSentOnPhone = formatingDate.toISOString().split("T")[0];
    const messageSentOnPhone = `We've updated your appointment status with ${therapistDetails[0].name} for ${dateSentOnPhone} at ${existingResult[0].time}, Current Status is ${status}`;

    const phoneValidation = await sendMobileMessage(
      `+${patientPhoneNumber}`,
      messageSentOnPhone
    );

    if (phoneValidation === 400) {
      return res.send("Phone Number is Invalid");
    }

    res.status(200).json({
      message: "Appointment status updated successfully",
      updatedResult,
    });
  } catch (error) {
    console.error("Error updating appointment status:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};
module.exports = { loginAdmin, updateAppointmentStatus, triggerLinkOnEmail };
