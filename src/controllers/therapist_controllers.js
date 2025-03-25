const jwt = require("jsonwebtoken");
const { removeExpireAppointments } = require("../utils/removeExpireData");
const moment = require("moment");
const sendGmailService = require("../utils/generateGmailService");
const sendMobileMessage = require("../utils/generateMoblieMessage");
const mySqlConn = require("../config/mysqlDb");
//admin added the therapist details
async function AddTherapist(req, res) {
  const { name, email, number, specialty, region, password } = req.body;

  if (!name || !email || !number || !specialty || !region || !password) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    // Check if therapist already exists
    const [existingTherapist] = await mySqlConn.query(
      "SELECT * FROM Therapist WHERE email = ?",
      [email]
    );

    if (existingTherapist.length > 0) {
      return res.status(400).json({ error: "Therapist is already added." });
    }

    const phoneRegex = /^\d{11}$/;
    if (!phoneRegex.test(number)) {
      return res.status(400).json({
        error: "Phone number must be exactly 11 digits.",
      });
    }

    // Insert new therapist
    const [newTherapist] = await mySqlConn.query(
      "INSERT INTO Therapist (name, email,number, specialty, region, password) VALUES (?, ?, ?, ?, ?, ?)",
      [name, email, number, specialty, region, password]
    );

    return res.status(201).json({
      message: "Therapist added successfully!",
      Result: {
        id: newTherapist.insertId,
        name,
        email,
        number,
        specialty,
        region,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error adding therapist" });
  }
}

//get therapist
async function getTherapist(req, res) {
  const { pageNo = 1, searchTherapist } = req.query;
  const limit = 6;
  const offset = (pageNo - 1) * limit;
  try {
    // Retrieve therapists based on filter and apply pagination
    const query = `SELECT * FROM Therapist WHERE ${
      searchTherapist ? "name LIKE ?" : "1=1"
    } LIMIT ? OFFSET ?`;
    const params = searchTherapist
      ? [`%${searchTherapist}%`, limit, offset]
      : [limit, offset];
    const [availability] = await mySqlConn.query(query, params);

    // Get total count of therapists
    const totalDataQuery = `SELECT COUNT(*) AS total FROM Therapist WHERE ${
      searchTherapist ? "name LIKE ?" : "1=1"
    }`;
    const totalDataParams = searchTherapist ? [`%${searchTherapist}%`] : [];
    const [totalAvailability] = await mySqlConn.query(
      totalDataQuery,
      totalDataParams
    );

    return res.status(200).json({
      message: "Fetched successfully",
      availability,
      totalAvailability: totalAvailability[0].total,
      noOfPages: Math.ceil(totalAvailability[0].total / limit),
    });
  } catch (error) {
    console.error("Error fetching therapists:", error);
    return res.status(500).json({ error: "Error fetching therapist" });
  }
}

async function AddTherapistAvailability(req, res) {
  const { email, date, time, appointmentType } = req.body;

  // Validate required fields
  if (!email || !date || !time) {
    return res.status(400).json({
      error: "All fields are required.",
    });
  }

  try {
    // Find the therapist by email
    const [therapistData] = await mySqlConn.query(
      "SELECT id FROM Therapist WHERE email = ?",
      [email]
    );

    if (therapistData.length === 0) {
      return res.status(404).json({ error: "Therapist not found." });
    }

    const therapistId = therapistData[0].id;

    // Check if the therapist already has an availability for the given date and time
    const [existingAvailability] = await mySqlConn.query(
      "SELECT * FROM TherapistAvailability WHERE therapistsId = ? AND date = ? AND time = ?",
      [therapistId, date, time]
    );

    if (existingAvailability.length > 0) {
      return res.status(400).json({
        error: "This time slot is already added for the therapist.",
      });
    }

    // Insert new availability
    const [newAvailability] = await mySqlConn.query(
      "INSERT INTO TherapistAvailability (therapistsId, date, time, status, appointmentType) VALUES (?, ?, ?, ?, ?)",
      [therapistId, date, time, "none", appointmentType]
    );

    return res.status(201).json({
      message: "Therapist availability added successfully.",
      result: {
        id: newAvailability.insertId,
        therapistId,
        date,
        time,
        appointmentType,
      },
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Error adding therapist availability." });
  }
}

async function getTherapistAvailability(req, res) {
  try {
    const {
      email,
      name,
      number,
      therapistId,
      specialty,
      date,
      region,
      status,
      currentMonth,
      appointmentType,
    } = req.query;
    console.log(typeof appointmentType, "appointmentType");
    const pageData = parseInt(req.query.pageNo) || 1;
    const limit = 10;
    const offset = (pageData - 1) * limit;
    await removeExpireAppointments();
    let therapistquery = "";
    let availabilityquery = "";

    if (region && region.trim() !== "") {
      therapistquery += `AND region = '${region.trim()}' `;
    }
    if (name) therapistquery += `AND name LIKE '%${name.trim()}%' `;
    if (email) therapistquery += `AND email LIKE '%${email.trim()}%' `;
    if (number) therapistquery += `AND phone_number = '${number.trim()}' `;
    if (specialty)
      therapistquery += `AND specialty LIKE '%${specialty.trim()}%' `;

    if (therapistId)
      availabilityquery += `AND therapistsId = '${therapistId}' `;
    if (status) availabilityquery += `AND status = '${status}' `;
    if (appointmentType && appointmentType.trim() !== "") {
      availabilityquery += `AND appointmentType = '${appointmentType.trim()}' `;
    }
    // update this time zone code same update needed in book appointment
    // if (date !== ' ') {
    //   console.log(new Date(date), 'date is');
    //   const parsedDate = new Date(date);
    //   const startOfDay = parsedDate.toISOString().split('T')[0];
    //   console.log(startOfDay, 'startOfDay');
    //   const endOfDay = parsedDate.toISOString().split('T')[0];
    //   console.log(endOfDay, 'endOfDay');

    //   availabilityquery += `AND date = '${startOfDay}'`;
    // }

    if (date !== " ") {
      // Parse the date in UTC
      const parsedDate = new Date(date);
      const utcDate = new Date(
        Date.UTC(
          parsedDate.getUTCFullYear(),
          parsedDate.getUTCMonth(),
          parsedDate.getUTCDate()
        )
      );

      // Get the "next day" in UTC by setting the date to 1 day ahead
      const nextDay = new Date(utcDate);
      nextDay.setUTCDate(utcDate.getUTCDate() + 1); // Increment the day by 1

      // Format the dates in YYYY-MM-DD format for MySQL comparison
      const formattedUTCDate = utcDate.toISOString().split("T")[0]; // "YYYY-MM-DD"
      const formattedNextDay = nextDay.toISOString().split("T")[0]; // "YYYY-MM-DD"

      // Apply the query filter using MySQL's DATE() function to compare with the date stored as VARCHAR
      if (!isNaN(utcDate.getTime())) {
        availabilityquery += `AND DATE(date) >= '${formattedUTCDate}' AND DATE(date) < '${formattedNextDay}'`;
      }
    }

    if (currentMonth !== "null") {
      const currentMonthDate = new Date(currentMonth);
      availabilityquery += `AND MONTH(date) = ${
        currentMonthDate.getMonth() + 1
      } `;
    }

    // Get the total number of appointments for filtered therapists
    const [totalCount] = await mySqlConn.query(
      `SELECT COUNT(*) AS total 
   FROM TherapistAvailability ta
   JOIN Therapist t ON ta.therapistsId = t.id
   WHERE 1=1 ${therapistquery} ${availabilityquery}`
    );

    // Get filtered availability data with pagination and formatted date
    const [availabilityData] = await mySqlConn.query(
      `SELECT ta.*, t.name AS therapistName, 
    DATE_FORMAT(ta.date, "%Y-%m-%d") AS formattedDate 
  FROM TherapistAvailability ta
  JOIN Therapist t ON ta.therapistsId = t.id
  WHERE 1=1 ${therapistquery} ${availabilityquery}
  ORDER BY ta.date ASC 
  LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const [dataHI] = await mySqlConn.query(
      'SELECT DATE_FORMAT(date, "%Y-%m-%d") AS your_date_column FROM TherapistAvailability'
    );
    return res.status(200).json({
      message: "Available slots fetched successfully",
      totalItems: totalCount[0].total,
      totalPages: Math.ceil(totalCount[0].total / limit),
      currentPage: pageData,
      appointmentData: availabilityData,
    });
  } catch (error) {
    console.error("Error fetching availability:", error);
    return res.status(500).json({ error: "Error fetching availability" });
  }
}

async function loginTherapist(req, res) {
  try {
    const { email, password } = req.body;

    const [getData] = await mySqlConn.query(
      "SELECT * FROM Therapist WHERE email = ?",
      [email]
    );

    if (getData.length === 0) {
      return res.status(404).json({ message: "Therapist not found" });
    }
    const isMatch =
      getData[0].password === password && getData[0].email === email;
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: getData[0].id, email: getData[0].email },
      process.env.JWT_SECRET || "your_jwt_secret",
      { expiresIn: "24h" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      data: {
        id: getData[0].id,
        name: getData[0].name,
        email: getData[0].email,
        type: "therapist",
      },
    });
  } catch (error) {
    console.log(error, "error");
    console.error("Error in therapist login:", error);
    res.status(500).json({ message: "Server error" });
  }
}

async function getTherapistSpecialtyRegion(req, res) {
  try {
    // Get unique specialties and regions
    const [therapistSpecialty] = await mySqlConn.query(
      "SELECT DISTINCT specialty FROM Therapist"
    );
    const [therapistRegion] = await mySqlConn.query(
      "SELECT DISTINCT region FROM Therapist"
    );
    const [therapistNames] = await mySqlConn.query(
      "SELECT name FROM Therapist"
    );

    res.status(200).json({
      success: true,
      specialty: therapistSpecialty,
      region: therapistRegion,
      therapistName: therapistNames,
    });
  } catch (error) {
    console.error("Error fetching therapist specialty:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch therapist specialty",
    });
  }
}

async function getTherapistDetailsByIdAndStatus(req, res) {
  try {
    const { therapistId } = req.query;
    const pageNo = parseInt(req.query.pageNo) || 1;
    const limit = 10;
    const offset = (pageNo - 1) * limit;

    if (!therapistId) {
      return res.status(400).json({ error: "therapistId is required." });
    }

    // Query for the therapist's availability details
    const [result] = await mySqlConn.query(
      `SELECT ta.*, t.name AS therapistName,t.specialty AS specialty, p.name AS patientName, p.email AS patientEmail 
      FROM TherapistAvailability ta
      LEFT JOIN Therapist t ON ta.therapistsId = t.id
      LEFT JOIN Patients p ON ta.patientsId = p.id
      WHERE ta.therapistsId = ? AND ta.status != 'none'
      LIMIT ? OFFSET ?`,
      [therapistId, limit, offset]
    );

    if (result.length === 0) {
      return res.status(204).json({ message: "Data not found." });
    }

    // Get the total count of records
    const [totalItems] = await mySqlConn.query(
      `SELECT COUNT(*) AS total FROM TherapistAvailability ta
      WHERE ta.therapistsId = ? AND ta.status != 'none'`,
      [therapistId]
    );

    return res.status(200).json({
      message: "Available data fetched successfully",
      totalItems: totalItems[0].total,
      totalPages: Math.ceil(totalItems[0].total / limit),
      currentPage: pageNo,
      result,
    });
  } catch (error) {
    console.error("Error fetching therapist details:", error);
    return res.status(500).json({ error: "Error fetching therapist details" });
  }
}

async function getTherapistDetailsById(req, res) {
  try {
    const { therapistId } = req.query;
    const pageNo = parseInt(req.query.pageNo) || 1;
    const limit = 10;
    const offset = (pageNo - 1) * limit;

    if (!therapistId) {
      return res.status(400).json({ error: "therapistId is required." });
    }

    // Query for the therapist's availability details
    const [result] = await mySqlConn.query(
      `SELECT ta.*, t.name AS therapistName,t.email AS therapistEmail,t.specialty AS specialty,t.region AS region, p.name AS patientName, p.email AS patientEmail 
      FROM TherapistAvailability ta
      LEFT JOIN Therapist t ON ta.therapistsId = t.id
      LEFT JOIN Patients p ON ta.patientsId = p.id
      WHERE ta.therapistsId = ?
      LIMIT ? OFFSET ?`,
      [therapistId, limit, offset]
    );

    if (result.length === 0) {
      return res.status(204).json({ message: "Data not found." });
    }

    // Get the total count of records
    const [totalItems] = await mySqlConn.query(
      `SELECT COUNT(*) AS total FROM TherapistAvailability ta
      WHERE ta.therapistsId = ?`,
      [therapistId]
    );

    return res.status(200).json({
      message: "Available data fetched successfully",
      totalItems: totalItems[0].total,
      totalPages: Math.ceil(totalItems[0].total / limit),
      currentPage: pageNo,
      result,
    });
  } catch (error) {
    console.error("Error fetching therapist details:", error);
    return res.status(500).json({ error: "Error fetching therapist details" });
  }
}

// // now admin can update the status of appointment
// const updateAppointmentStatus = async (req, res) => {
//   try {
//     const { id, status, emailId } = req.body;
//     // console.log(req.body, 'req.body');
//     // Retrieve existing appointment details
//     const [existingResult] = await mySqlConn.query(
//       "SELECT * FROM TherapistAvailability WHERE id = ?",
//       [id]
//     );

//     if (existingResult.length === 0) {
//       return res.status(404).json({ message: "Appointment not found" });
//     }

//     // Update appointment status
//     const [updatedResult] = await mySqlConn.query(
//       "UPDATE TherapistAvailability SET status = ? WHERE id = ?",
//       [status, id]
//     );

//     // Send email to patient
//     const PatientDetails = {
//       patientEmail: emailId,
//       status: status,
//     };
//     // console.log(PatientDetails, 'details');
//     await sendGmailService(PatientDetails);

//     // Send confirmation SMS to the patient
//     const [therapistDetails] = await mySqlConn.query(
//       "SELECT name FROM Therapist WHERE id = ?",
//       [existingResult[0].therapistsId]
//     );

//     const patientPhoneNumber = existingResult[0].appointment_phone;
//     const formatingDate = new Date(existingResult[0].date);
//     const dateSentOnPhone = formatingDate.toISOString().split("T")[0];
//     const messageSentOnPhone = `We've updated your appointment status with ${therapistDetails[0].name} for ${dateSentOnPhone} at ${existingResult[0].time}, Current Status is ${status}`;

//     const phoneValidation = await sendMobileMessage(
//       `+${patientPhoneNumber}`,
//       messageSentOnPhone
//     );

//     if (phoneValidation === 400) {
//       return res.send("Phone Number is Invalid");
//     }

//     res.status(200).json({
//       message: "Appointment status updated successfully",
//       updatedResult,
//     });
//   } catch (error) {
//     console.error("Error updating appointment status:", error);
//     res.status(500).json({ message: "Internal server error", error });
//   }
// };

async function showAllTherapistsNames(req, res) {
  try {
    const [therapistaData] = await mySqlConn.query(
      "select name from Therapist"
    );
    res.status(200).json({
      therapistaData,
    });
  } catch (error) {
    res.status(500).json({
      message: "something went wrong",
    });
  }
}
module.exports = {
  AddTherapist,
  AddTherapistAvailability,
  getTherapistAvailability,
  loginTherapist,
  getTherapist,
  getTherapistSpecialtyRegion,
  getTherapistDetailsByIdAndStatus,
  getTherapistDetailsById,
  showAllTherapistsNames,
};
