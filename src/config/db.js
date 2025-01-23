const mongoose = require('mongoose');
require('dotenv').config();

const mongoUrl = process.env.MONGO_URL;

const connectDB = async (next) => {
 try {
    await mongoose.connect(mongoUrl);
    console.log('MongoDB Connected Successfully');
    next()
 } catch (error) {
    console.error(error)
 }
} 

module.exports = {
    connectDB
}
