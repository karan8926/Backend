const calendarAvailability = require("../models/calendar_models")

async function addCalendarAvailability(req, res){
  try {
     const {therapistId , availability , startDate , endDate} = req.body;

        if(!therapistId || !availability || !startDate || !endDate){
           return res
            .status(400)
            .json({ error: "All fields are required." });
        }

        const newAvailability = new calendarAvailability({
        therapistsId : therapistId,
        availability,
        startDate,
        endDate,
      });
  
      const savedAvailability = await newAvailability.save();
  
      return res.status(201).json({
        message: "Calendar availability added successfully.",
        data: savedAvailability,
      });
    } catch (error) {
        console.error("Error adding calendar availability:", error);
        return res.status(500).json({
          error: "An error occurred while adding calendar availability.",
        });
    }
}

module.exports = {addCalendarAvailability}