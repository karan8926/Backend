const Patient = require('../models/patients_models');
const generateAccessCode = require("../utils/generateAccessCode");
const emailValidator = require('email-validator');
const jwt = require('jsonwebtoken');
const CryptoJS = require('crypto-js');

const nodemailer = require("nodemailer");
const TherapistAvailability = require("../models/therapist_models").TherapistAvailability;
const Therapist = require("../models/therapist_models").Therapist;

const twilio = require('twilio');


const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

async function pantientSignUp(req, res) {
    try {
        const {name, phone_number, email} = req.body;
        
        if(!name || !phone_number || !email) {
         return res.status(400).json({ error: 'Name, number, and email are required.' });
        }   
        const phoneRegex = /^\d{10}$/; 
        if (!phoneRegex.test(phone_number)) {
            return res.status(400).json({ error: 'Phone number must be exactly 10 digits.' });
        }

        if(!emailValidator.validate(email)){
            return res.status(400).json({ error: 'Invalid email address.' });
        }

        const existingPatient = await Patient.findOne({email});
        if(existingPatient){
            return res.status(400).json({ error: 'Email already registered.' });
        }

        const accessCode = await generateAccessCode()

        const patientResult = new Patient({name , phone_number, email, accessCode})

        await patientResult.save();
       
        const transporter = nodemailer.createTransport({
            service: "Gmail", 
            secure: true,  
            port: 465,
            auth: {
                user: "satyasandhya.boffinblocks@gmail.com",
                pass: "xkac gsbq bpns qpnm",
            },
        });

        const mailOptions = {
            from: "satyasandhya.boffinblocks@gmail.com",
            to: patientResult.email,
            subject: "Signup successfully ",
            html: `<p>Your accesscode is <b>${patientResult.accessCode}</b>.</p>

                   <p>Thank you for register with us!</p>`,
        };

        await transporter.sendMail(mailOptions);

        res.status(201).json({
            name: patientResult.name,
            number: patientResult.phone_number,
            email: patientResult.email,
            accessCode: patientResult.accessCode,
            type : patientResult.type
        });

    } catch (error) {
        res.status(500).json({ error: 'Server error. Please try again later.' });
    }
}

async function pantientSignIn(req, res){
  try {
    const {accessCode} = req.body;

    if(!accessCode) return res.status(400).json({ error: 'Access code is required.' });

    const existedPatient = await Patient.findOne({accessCode})
    
    console.log("existedPatient--", existedPatient)

    if(!existedPatient) return res.status(400).json({ error: 'Invalid access code.' });

    const uniqueSecret = CryptoJS.SHA256(existedPatient.accessCode).toString(CryptoJS.enc.Base64);
    const token = jwt.sign(
        { patientId: existedPatient._id, name: existedPatient.name, email: existedPatient.email },
         uniqueSecret, 
        { expiresIn: '24h'} 
    );
    const result = existedPatient
    return res.status(200).json({ 
        accessToken: token,
        result
     });

} catch (error) {
    return res.status(500).json({ error: 'Server error. Please try again later.' });
 }
}

async function bookAppointment(req, res){
    const { date, time, email , number, status} = req.body;

    if ( !date || !time || !email || !number || !status) {
        return res.status(400).json({ error: "All fields are required." });
    }

    try {
        const slot = await TherapistAvailability.findOne({
            date: new Date(date),
            time,
            status: status,
        });

        if (!slot) {
            return res.status(404).json({ error: "No available slot found for the selected date and time." });
        }

        // Update the slot status to "booked"
        slot.status = status;
        await slot.save();

        // // Send email confirmation
        // const therapist = await Therapist.findById(therapistsId);
        
        const transporter = nodemailer.createTransport({
            service: "Gmail", 
            secure: true,  
            port: 465,
            auth: {
                user: "satyasandhya.boffinblocks@gmail.com",
                pass: "xkac gsbq bpns qpnm",
            },
        });

        const mailOptions = {
            from: "satyasandhya.boffinblocks@gmail.com",
            to: PatientEmail,
            subject: "Booked Appointment Successfully and wait for Confirmation",
            html: `<p>Your appointment is confirmed.</p>
                   <p><b>Date:</b> ${date}</p>
                   <p><b>Time:</b> ${time}</p>
                   <p>Thank you for booking with us!</p>`,
        };

        await transporter.sendMail(mailOptions);

        // const message = {
        //   date : date,
        //   time: time,
        //   phone_number : PatientPhoneNumber,
        // }
        // await sendsms(message)

        return res.status(200).json({
            message: "Appointment booked successfully. Confirmation email sent.",
            result: slot,
        });
    } catch (error) {
        console.error("Error booking appointment:", error);
        return res.status(500).json({ error: "Error booking appointment" });
    }
}

async function sendsms(message){
    console.log(message)
    const response = await client.messages.create({
        body: `Your appointment with ${message.name} is confirmed for ${message.date} at ${message.time}.`,
        from: '+1 775 320 8517', 
        to: `+91${message.phone_number}` 
    });
    console.log("sms sending successfully",response.sid )
}


async function getPatient(req, res){
    try {
        const patients = await Patient.find().sort({ createdAt: -1 });

        if (patients.length === 0) {
            return res.status(404).json({ message: "No patients found" });
        }

        res.status(200).json({
            message: "Patients retrieved successfully",
            patients
        });
    } catch (error) {
        console.error("Error fetching patients:", error);
        res.status(500).json({ message: "Server error", error });
    }
}

module.exports = {pantientSignUp, pantientSignIn, bookAppointment , getPatient}