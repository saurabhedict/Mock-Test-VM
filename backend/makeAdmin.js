require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const makeAdmin = async () => {
  try {
    const email = process.argv[2];
    if (!email) {
      console.error("❌ Please provide an email address.");
      console.log("Usage: node makeAdmin.js <your-email@example.com>");
      process.exit(1);
    }

    // Connect to the database using the same URI as your server
    await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/test");
    
    // Find the user by the email provided
    const user = await User.findOne({ email });
    
    if (!user) {
      console.error(`❌ User with email "${email}" not found.`);
      process.exit(1);
    }

    // Update their role and save
    user.role = 'ADMIN';
    await user.save();
    console.log(`✅ Success! The user "${email}" is now an ADMIN.`);
    
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    process.exit(0);
  }
};

makeAdmin();
