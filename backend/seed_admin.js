const mongoose = require("mongoose");
require("dotenv").config();
const User = require("./models/User");

const seedAdmin = async () => {
    try {
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) throw new Error("MONGO_URI not found");

        await mongoose.connect(mongoUri);
        console.log("Connected to MongoDB...");

        const email = "admin@vidyarthimitra.org";
        const password = "adminpassword123";

        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) {
            console.log("Admin already exists. Updating role...");
            existing.role = "admin";
            existing.isVerified = true;
            await existing.save();
        } else {
            await User.create({
                name: "System Admin",
                email: email.toLowerCase(),
                password: password,
                role: "admin",
                isVerified: true
            });
            console.log("Admin created successfully!");
        }

        console.log("--------------------------------");
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
        console.log("--------------------------------");
        process.exit();
    } catch (error) {
        console.error("Error seeding admin:", error);
        process.exit(1);
    }
};

seedAdmin();
