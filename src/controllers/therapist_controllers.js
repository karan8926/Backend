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
    try {
      const availability = await Therapist.find().sort({ createdAt: -1 });
  
      return res.status(200).json({
        message: "fetched successfully",
        availability,
      });
    } catch (error) {
      console.error("Error fetching :", error);
      return res.status(500).json({ error: "Error fetching Therapist" });
    }
  }
  
  async function AddTherapistAvailability(req, res) {
    const { email, date, time, status } = req.body;
  
    if (!email || !date || !time || !status) {
      return res.status(400).json({
        error: "All fields are required.",
      });
    }
  
    const terapistData = await Therapist.findOne({ email });
    try {
      const therapist = await Therapist.findById(terapistData._id);
      if (!therapist) {
        return res.status(404).json({ error: "Therapist not found." });
      }
      // const existingAvailability = await Therapist.findOne({ therapistsId, date, time });
      // if (existingAvailability) {
      //     return res.status(400).json({ error: "This time slot is already added for the therapist." });
      // }else {
      //     return res.status(400).json({ error: "The therapists is not added any slot for this time" });
      // }
  
      const newAvailability = new TherapistAvailability({
        therapistsId:terapistData._id,
        date,
        time,
        status,
        type,
      });
      await newAvailability.save();
  
      return res.status(201).json({
        message: "Therapist availability added successfully.",
        result: newAvailability,
      });
    } catch (error) {
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
      return res.status(200).json({
        message: "Available slots fetched successfully",
        availability,
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
  
  async function getTherapistNameRegion(req, res){
    try {
      const therapistNames = await Therapist.distinct("name");
      const therapistRegion = await Therapist.distinct("region");

      res.status(200).json({
        success: true,
        name: therapistNames,
        region: therapistRegion
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
    getTherapistNameRegion
  };