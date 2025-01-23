const express = require('express');
const cors = require('cors');
const {connectDB} = require('./src/config/db');
const Routes = require('./src/routes');

require('dotenv').config()

const app = express();
app.use(express.json());

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

const port = process.env.PORT || 3000;

app.use('/api', Routes)

const startServer = async () => {
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  };
  
  connectDB(startServer);
