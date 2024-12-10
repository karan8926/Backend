const mongoose = require("mongoose");
const patient = require("./patients_models")

const therapistSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  number: {
    type: String,
    required: true,
  },
  region: {
    type: String,
    required: true,
  },
  specialty: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    default: "Therapist",
  },
},{ timestamps: true });

const Therapist = mongoose.model("Therapist", therapistSchema);

const therapistAvailabilitySchema = new mongoose.Schema(
  {
    therapistsId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Therapist",
    },
    patientsId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      ref: "patient",
    },
    date: {
      type: Date,
      required: true,
    },
    time: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
    },
    appointmentType: {
      type: String,
      required: false,
    },
    appointment: {
      name: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
      },
      phone: {
        type: String,
        required: true,
      },
    },
  },
  { timestamps: true }
);

const TherapistAvailability = mongoose.model(
  "TherapistAvailability",
  therapistAvailabilitySchema
);

module.exports = { Therapist, TherapistAvailability };
