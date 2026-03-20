require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to Atlas!");
        
        const users = await User.find({}, "email isVerified createdAt");
        console.log("Total users found:", users.length);
        users.forEach(u => {
            console.log(`- ${u.email} (Verified: ${u.isVerified}, Created: ${u.createdAt})`);
        });
        
    } catch (err) {
        console.error("Error:", err);
    } finally {
        mongoose.connection.close();
    }
};

check();
