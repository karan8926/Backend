const {
  Therapist,
  TherapistAvailability,
} = require("../models/therapist_models");
const jwt = require("jsonwebtoken");

//admin added the therapist details
async function AddTherapist(req, res) {
  const { name, email, number, region, password } = req.body;

  if (!name || !email || !number || !region || !password) {
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
  const { email, date, time, status } = req.body;

  // Validate required fields
  if (!email || !date || !time || !status) {
    return res.status(400).json({
      error: "All fields are required.",
    });
  }

  try {
    // Find the therapist using the provided email
    const therapistData = await Therapist.findOne({ email });
    console.log("therapistData", therapistData);
    if (!therapistData) {
      return res.status(404).json({ error: "Therapist not found." });
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
      status,
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
    const { therapistId, date, soonest, region, status } = req.query;
    let query = {};
    if (therapistId) query.therapistsId = therapistId;
    if (region) query.region = region;
    if (status) query.status = status;
    if (date) query.date = { $gte: new Date(date) };

    const sort = soonest === "true" ? { date: 1, time: 1 } : {};
    const availability = await TherapistAvailability.find(query).sort(sort);

    // Extract all unique therapist IDs from the availability data
    const therapistIds = availability.map((item) => item.therapistsId);

    // Fetch all therapists whose IDs match the availability records
    const therapists = await Therapist.find({ _id: { $in: therapistIds } });
    // console.log("-- therapists:", therapists);

    // Create a map of therapist IDs to their details for quick lookup
    const therapistMap = therapists.reduce((acc, therapist) => {
      acc[therapist._id] = {
        email: therapist.email,
        name: therapist.name,
        region: therapist.region,
      };
      return acc;
    }, {});

    // Use map to enrich availability data with therapist email and name
    const AvailabilityData = availability.map((item) => ({
      ...item._doc, // Spread the availability document fields
      email: therapistMap[item.therapistsId]?.email || null,
      name: therapistMap[item.therapistsId]?.name || null,
    }));

    return res.status(200).json({
      message: "Available slots fetched successfully",
      AvailabilityData,
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

async function getTherapistNameRegion(req, res) {
  try {
    const therapistNames = await Therapist.distinct("name");
    const therapistRegion = await Therapist.distinct("region");

    res.status(200).json({
      success: true,
      name: therapistNames,
      region: therapistRegion,
    });
  } catch (error) {
    console.error("Error fetching therapist names:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch therapist names",
    });
  }
}

module.exports = {
  AddTherapist,
  AddTherapistAvailability,
  getTherapistAvailability,
  loginTherapist,
  getTherapist,
  getTherapistNameRegion,
};
