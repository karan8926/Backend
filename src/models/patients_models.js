const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
   name:{
    type: String,
    required: true
   },
   phone_number:{
    type: String,
    required: true,
    length : 10
   },
   email:{
    type: String,
    required: true,
    Unique: true
   },
   accessCode:{
    type: String,
    required: true,
    Unique: true
   },
   type: {
      type: String,
      default: "patient"
  }
}, { timestamps: true });   

const Patient = mongoose.model('Patient', patientSchema);

module.exports = Patient;
