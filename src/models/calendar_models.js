const mongoose = require("mongoose");
const { Therapist } = require("./therapist_models");

const calendarSchema = new mongoose.Schema({
    therapistsId : {
        type : mongoose.Schema.Types.ObjectId,
        required : true,
        ref : "Therapist"
    },
    availability :{
        type : String,
        required: true
    },
    startDate : {
        type: String,
        required: true,
    },
    endDate : {
        type: String,
        required: true,
    },
},{ timestamps: true })

const calendarAvailability = mongoose.model('calendarAvailability', calendarSchema );

module.exports = calendarAvailability;