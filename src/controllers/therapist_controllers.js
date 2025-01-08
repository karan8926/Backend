const {
  Therapist,
  TherapistAvailability,
} = require("../models/therapist_models");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { removeExpireAppointments } = require("../utils/removeExpireData");
const moment = require("moment");
const sendGmailService = require("../utils/generateGmailService");
//admin added the therapist details
async function AddTherapist(req, res) {
  const { name, email, number, specialty, region, password } = req.body;

  if (!name || !email || !number || !specialty || !region || !password) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    const existingTherapist = await Therapist.findOne({ email });
    if (existingTherapist) {
      return res.status(400).json({ error: "Therapist is already Added." });
    }
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(number)) {
      return res
        .status(400)
        .json({ error: "Phone number must be exactly 10 digits." });
    }
    const newTherapist = new Therapist({
      name,
      email,
      number,
      specialty,
      region,
      password,
    });

    await newTherapist.save();

    return res
      .status(201)
      .json({ message: "Therapist added successfully!", Result: newTherapist });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error adding therapist" });
  }
}
//get therapist
async function getTherapist(req, res) {
  const { pageNo, searchTherapist } = req.query || 1;
  const limit = 6;
  const offset = (pageNo - 1) * limit;
  const filter = searchTherapist
    ? { name: { $regex: searchTherapist, $options: "i" } }
    : {};
  try {
    const availability = await Therapist.find(filter)
      .limit(limit)
      .skip(offset)
      .sort({ createdAt: -1 });

    const totalAvailability = await Therapist.countDocuments(filter);
    return res.status(200).json({
      message: "fetched successfully",
      availability,
      totalAvailability: totalAvailability,
      noOfPages: Math.ceil(totalAvailability / limit),
    });
  } catch (error) {
    console.error("Error fetching :", error);
    return res.status(500).json({ error: "Error fetching Therapist" });
  }
}

async function AddTherapistAvailability(req, res) {
  const { email, date, time, appointmentType } = req.body;
  console.log(req.body);

  // Validate required fields
  if (!email || !date || !time) {
    return res.status(400).json({
      error: "All fields are required.",
    });
  }

  try {
    // Find the therapist using the provided email
    const therapistData = await Therapist.findOne({ email });

    if (!therapistData) {
      return res.status(404).json({ error: "Therapist not found." });
    }

    const dateTimeString = `${date}T${time}:00.000+00:00`;
    // Check if the therapist already has an availability for the given date and time
    const existingAvailability = await TherapistAvailability.findOne({
      therapistsId: therapistData._id,
      date: dateTimeString,
      time,
    });

    if (existingAvailability) {
      return res.status(400).json({
        error: "This time slot is already added for the therapist.",
      });
    }

    // Create a new availability entry
    const newAvailability = new TherapistAvailability({
      therapistsId: therapistData._id,
      date,
      time,
      status: "none",
      appointmentType,
    });

    // Save the new availability
    await newAvailability.save();

    return res.status(201).json({
      message: "Therapist availability added successfully.",
      result: newAvailability,
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
    await removeExpireAppointments();
    const pageData = parseInt(req.query.pageNo) || 1;
    const limit = 10;
    const offset = (pageData - 1) * limit;

    let therapistquery = {};
    let query = {};

    // Filter by therapist collection
    if (region?.trim()) therapistquery.region = region?.trim();
    if (name?.trim()) therapistquery.name = name?.trim();
    if (email?.trim()) therapistquery.email = email?.trim();
    if (number?.trim()) therapistquery.phone_number = number?.trim();
    if (specialty?.trim()) therapistquery.specialty = specialty?.trim();

    // Filter by therapistAvailability collection
    if (therapistId?.trim()) query.therapistsId = therapistId?.trim();
    if (status) query.status = status;
    if (appointmentType) query.appointmentType = appointmentType?.trim();

    if (date) {
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

      // Apply the query filter with the UTC-based dates
      if (!isNaN(utcDate.getTime())) {
        query.date = { $gte: utcDate, $lt: nextDay };
      }
    }

    if (currentMonth) {
      const currentmonth = new Date(currentMonth);
      const currentMonthInt = currentmonth.getMonth() + 1;
      query.$expr = { $eq: [{ $month: "$date" }, currentMonthInt] };
    }

    const filteredTherapists = await Therapist.find(therapistquery);

    if (filteredTherapists.length === 0) {
      return res.status(200).json({
        message: "No therapists found for the given filters",
        totalItems: 0,
        totalPages: 0,
        currentPage: pageData,
        appointmentData: [],
      });
    }

    let availabilityData = [];

    const data = await TherapistAvailability.aggregate([
      {
        $match: {
          therapistsId: { $in: filteredTherapists.map((t) => t._id) },
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
      {
        $match: query,
      },
    ]);

    availabilityData = [...availabilityData, ...data];

    availabilityData.sort((a, b) => new Date(a.date) - new Date(b.date));
    // Pagination logic
    const totalItems = availabilityData.length;
    const paginatedData = availabilityData.slice(offset, offset + limit);

    return res.status(200).json({
      message: "Available slots fetched successfully",
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      currentPage: pageData,
      appointmentData: paginatedData,
    });
  } catch (error) {
    console.error("Error fetching availability:", error);
    return res.status(500).json({ error: "Error fetching availability" });
  }
}

async function loginTherapist(req, res) {
  try {
    const { email, password } = req.body;

    const getData = await Therapist.findOne({ email });

    if (!getData) {
      return res.status(404).json({ message: "Therapist not found" });
    }

    const isMatch = getData.password === password && getData.email === email;
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const token = jwt.sign(
      { id: getData._id, email: getData.email },
      process.env.JWT_SECRET || "your_jwt_secret",
      { expiresIn: "24h" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      data: {
        id: getData._id,
        name: getData.name,
        email: getData.email,
        type: "therapist",
      },
    });
  } catch (error) {
    console.error("Error in admin login:", error);
    res.status(500).json({ message: "Server error" });
  }
}

async function getTherapistSpecialtyRegion(req, res) {
  try {
    const therapistSpecialty = await Therapist.distinct("specialty");
    const therapistRegion = await Therapist.distinct("region");
    const therapistNames = await Therapist.find({}).select("name -_id");
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

    let filter = { status: { $ne: "none" } };

    if (mongoose.Types.ObjectId.isValid(therapistId)) {
      filter.therapistsId = new mongoose.Types.ObjectId(therapistId);
    } else {
      return res.status(400).json({ error: "Invalid therapistId format." });
    }

    const totalItems = await TherapistAvailability.countDocuments(filter);

    const result = await TherapistAvailability.aggregate([
      { $match: filter },
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

    if (!result.length) {
      return res.status(204).json({ message: "Data is not found." });
    }

    return res.status(200).json({
      message: "Available data fetched successfully",
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      currentPage: pageNo,
      result,
    });
  } catch (error) {
    console.error("Error fetching therapist:", error);
    return res.status(500).json({ error: "Error fetching therapist" });
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

    let filter = { status: { $ne: "" } };

    if (mongoose.Types.ObjectId.isValid(therapistId)) {
      filter.therapistsId = new mongoose.Types.ObjectId(therapistId);
    } else {
      return res.status(400).json({ error: "Invalid therapistId format." });
    }

    const totalItems = await TherapistAvailability.countDocuments(filter);

    const result = await TherapistAvailability.aggregate([
      { $match: filter },
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

    if (!result.length) {
      return res.status(204).json({ message: "Data is not found." });
    }

    return res.status(200).json({
      message: "Available data fetched successfully",
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      currentPage: pageNo,
      result,
    });
  } catch (error) {
    console.error("Error fetching therapist:", error);
    return res.status(500).json({ error: "Error fetching therapist" });
  }
}

const updateAppointmentStatus = async (req, res) => {
  try {
    const { id, status, emailId } = req.body;
    // email to the patient when therapist update the status of appointment
    const existingResult = await TherapistAvailability.findOne({ _id: id });

    if (!existingResult) {
      return res.status(404).json({ message: "Therapist is not found" });
    }

    const updatedResult = await TherapistAvailability.findOneAndUpdate(
      { _id: id },
      { status },
      { new: true }
    );
    const PatientDetails = {
      patientEmail: emailId,
      status: status,
    };
    await sendGmailService(PatientDetails);

    res.status(200).json({
      message: "Appointment status updated successfully",
      updatedResult,
    });
  } catch (error) {
    console.error("Error updating appointment status:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};

module.exports = {
  AddTherapist,
  AddTherapistAvailability,
  getTherapistAvailability,
  loginTherapist,
  getTherapist,
  getTherapistSpecialtyRegion,
  updateAppointmentStatus,
  getTherapistDetailsByIdAndStatus,
  getTherapistDetailsById,
};
