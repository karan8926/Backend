const {Therapist, TherapistAvailability } = require("../models/therapist_models");


//admin added the therapist details
async function AddTherapist(req, res){
    const { name, specialty, email, phone_number , region} = req.body;

    if (!name || !specialty || !email || !phone_number || !region) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
  
    try {
      const existingTherapist = await Therapist.findOne({email});
      if (existingTherapist) {
        return res.status(400).json({ error: 'Therapist is already Added.' });
      }
      const phoneRegex = /^\d{10}$/; 
      if (!phoneRegex.test(phone_number)) {
          return res.status(400).json({ error: 'Phone number must be exactly 10 digits.' });
      }
      const newTherapist = new Therapist({
        name,
        specialty,
        email,
        phone_number,
        region
      });
  
      await newTherapist.save();
  
      return res.status(201).json({ message: 'Therapist added successfully!', Result: newTherapist });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Error adding therapist' });
    }
}

async function AddTherapistAvailability(req, res) {
    const { therapistsId, date, time, status } = req.body;

    if (!therapistsId || !date || !time || !status) {
        return res.status(400).json({ error: "All fields (therapistsId, date, time, status) are required." });
    }

    if (!['Confirmed', 'Pending', 'Cancelled'].includes(status)) {
        return res.status(400).json({ error: "Status must be 'available' or 'booked'." });
    }

    try {
        const therapist = await Therapist.findById(therapistsId);
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
            therapistsId,
            date,
            time,
            status,
            type
        });
        await newAvailability.save();

        return res.status(201).json({
            message: "Therapist availability added successfully.",
            result: newAvailability,
        });
    } catch (error) {
        return res.status(500).json({ error: "Error adding therapist availability." });
    }
}

async function getTherapistAvailability(req, res){
    try {
        const { therapistId , date , soonest ,region, status } = req.query;
        let query = {}; 
        if (therapistId) query.therapistsId = therapistId;
        if(region) query.region = region;
        if(status) query.status = status;
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

module.exports = {AddTherapist, AddTherapistAvailability, getTherapistAvailability}