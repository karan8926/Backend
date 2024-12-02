const {
  Therapist,
  TherapistAvailability,
} = require("../models/therapist_models");
const jwt = require("jsonwebtoken");

//admin added the therapist details
async function AddTherapist(req, res) {
  const { name, email, number,specialty, region, password } = req.body;

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
  const { pageNo } = req.query || 1;
  const limit = 12;
  const offset = (pageNo - 1) * limit;
  try {
    const availability = await Therapist.find()
      .limit(limit)
      .skip(offset)
      .sort({ createdAt: -1 });

    const totalAvailability = await Therapist.countDocuments();
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
  const { email, date, time, status,appointmentType } = req.body;

  // Validate required fields
  if (!email || !date || !time ) {
    return res.status(400).json({
      error: "All fields are required.",
    });
  }

  try {
    // Find the therapist using the provided email
    const therapistData = await Therapist.findOne({ email });

    if (!therapistData) {
      return res.status(404).json({ error: "Therapist not found."});
    }

    // Check if the therapist already has an availability for the given date and time
    const existingAvailability = await TherapistAvailability.findOne({
      therapistsId: therapistData._id,
      date,
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
      status:'none',
      appointmentType
    });

    // Save the new availability
    await newAvailability.save();

    return res.status(201).json({
      message: "Therapist availability added successfully.",
      result: newAvailability,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error adding therapist availability." });
  }
}

async function getTherapistAvailability(req, res) {
  try {
    const { email, name, number, therapistId,specialty, soonest, date, region, status } = req.query;
    const pageNo = parseInt(req.query.pageNo) || 1; 
    const limit = parseInt(req.query.pageSize) || 12; 
    const offset = (pageNo - 1) * limit;

    let therapistquery = {};
    let query = {};

    // Filter by therapist collection
    if (region) therapistquery.region = region;
    if (name) therapistquery.name = name;
    if (email) therapistquery.email = email;
    if (number) therapistquery.phone_number = number;
    if(specialty) therapistquery.specialty = specialty;

    // Filter by therapistAvailability collection
    if (therapistId) query.therapistsId = therapistId;
    if (status) query.status = status;

    // Handle soonest date filter (12hr or 24hr)
    if (soonest === "12hr") {
      query.date = { $gte: new Date(Date.now() - 12 * 60 * 60 * 1000) };
    } else if (soonest === "24hr") {
      query.date = { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) };
    } else if (date) {
      query.date = new Date(date);
    }

    // Filter therapists
    const filteredTherapists = await Therapist.aggregate([
      { $match: therapistquery }
    ]);

    let availabilityData = [];

    for (let i = 0; i < filteredTherapists.length; i++) {
      query.therapistsId = filteredTherapists[i]._id;
      const data = await TherapistAvailability.aggregate([
        { $match: query },
        {
          $lookup: {
            from: "therapists",
            localField: "therapistsId",
            foreignField: "_id",
            as: "therapistDetails",
          },
        },
      ]);
      availabilityData = [...availabilityData, ...data];
    }

    // Pagination logic
    const totalItems = availabilityData.length;
    const paginatedData = availabilityData.slice(offset, offset + limit);

    return res.status(200).json({
      message: "Available slots fetched successfully",
      totalItems,
      // totalPages: Math.ceil(totalItems / limit), 
      currentPage: pageNo,
      pageSize: limit,
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
    
    res.status(200).json({
      success: true,
      specialty: therapistSpecialty,
      region: therapistRegion
    });
  } catch (error) {
    console.error("Error fetching therapist specialty:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch therapist specialty",
    });
  }
}
module.exports = {
  AddTherapist,
  AddTherapistAvailability,
  getTherapistAvailability,
  loginTherapist,
  getTherapist,
  getTherapistSpecialtyRegion
};
