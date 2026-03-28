require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

const test = async () => {
    try {
        console.log("URI:", process.env.MONGO_URI);
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to Atlas!");
        
        const testUser = await User.findOne({ email: "test@example.com" });
        if (testUser) {
            console.log("Found test user:", testUser.email);
        } else {
            console.log("Test user not found, creating one...");
            await User.create({
                name: "Test User",
                email: "test@example.com",
                password: "password123",
                isVerified: true
            });
            console.log("Created test user: test@example.com");
        }
        
    } catch (err) {
        console.error("Error:", err);
    } finally {
        mongoose.connection.close();
    }
};

test();
