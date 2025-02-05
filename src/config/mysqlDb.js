const mysql = require('mysql2/promise');

const mySqlConn = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'appointment_management',
  timezone: 'local',
});

module.exports = mySqlConn;
