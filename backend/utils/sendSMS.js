const twilio = require("twilio");

const sendOTPSMS = async (phoneNumber, otp, name) => {
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  const formattedPhone = phoneNumber.startsWith("+")
    ? phoneNumber
    : `+91${phoneNumber}`;

  await client.messages.create({
    body: `Hi ${name}, your Vidyarthi Mitra OTP is: ${otp}. Valid for 10 minutes. Do not share this with anyone.`,
    from: process.env.TWILIO_PHONE,
    to: formattedPhone,
  });
};

module.exports = { sendOTPSMS };
