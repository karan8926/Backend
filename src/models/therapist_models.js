const mongoose = require('mongoose');

const therapistSchema = new mongoose.Schema({
    name: { 
     type: String,
     required: true
    },
    email: { 
     type: String, 
     required: true
    },
    number: { 
     type: String, 
     required: true
    },
    region:{
     type:String,
     required: true
    },
    specialty:{
     type:String,
     required: true
    },
    password: {
     type:String,
     required: true
    },
    type: {
     type: String,
     default: "Therapist"
 }
});

const Therapist = mongoose.model('Therapist', therapistSchema);

const therapistAvailabilitySchema = new mongoose.Schema({
    therapistsId: { 
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Therapist'
    },
    date: {
         type: Date, 
         required: true
    },
    time: {
         type: String, 
         required: true 
    },
    status: {
         type: String,
         required: true
    }, 
  }, { timestamps: true });  
  
  const TherapistAvailability = mongoose.model('TherapistAvailability', therapistAvailabilitySchema);

  module.exports =  {Therapist, TherapistAvailability} 
