const mySqlConn = require('../config/mysqlDb');
const jwt = require('jsonwebtoken');

const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Query the MySQL database for the admin with the given email
    const [rows] = await mySqlConn.query(
      'SELECT * FROM Admin WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const admin = rows[0];

    // Compare the provided password with the hashed password stored in the database
    const isMatch = rows[0].password === password && rows[0].email === email;
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create a JWT token
    const token = jwt.sign(
      { id: admin.id, email: admin.email },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '24h' }
    );

    // Respond with success and the generated token
    res.status(200).json({
      message: 'Login successful',
      token,
      data: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        type: 'admin',
      },
    });
  } catch (error) {
    console.error('Error in admin login:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { loginAdmin };
