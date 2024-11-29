const Admin = require('../models/admin_models'); 
const jwt = require('jsonwebtoken');

const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const admin = await Admin.findOne({ email });
 
        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }

        const isMatch = admin.password === password && admin.email === email;
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        const token = jwt.sign(
            { id: admin._id, email: admin.email },
            process.env.JWT_SECRET || "your_jwt_secret",
            { expiresIn: '24h' }
        );

        res.status(200).json({
            message: "Login successful",
            token,
            admin: { id: admin._id, name: admin.name, email: admin.email },
        });
    } catch (error) {
        console.error("Error in admin login:", error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = { loginAdmin };
