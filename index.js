const express = require('express');
const cors = require('cors');
const Routes = require('./src/routes');
const mySqlConn = require('./src/config/mysqlDb');

require('dotenv').config();

const app = express();
app.use(express.json());

app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

const port = process.env.PORT || 3000;

app.use('/api', Routes);

mySqlConn
  .query('SELECT 1')
  .then(() => {
    console.log('Database connection successful');
    app.listen(port, () => {
      console.log(`server listening on ${port}`);
    });
  })
  .catch((err) => {
    console.log(err);
  });
