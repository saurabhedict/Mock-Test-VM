const nodemailer = require("nodemailer");

const sendOTPEmail = async (toEmail, otp, name) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"Vidyarthi Mitra" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Your OTP for Vidyarthi Mitra Registration",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px;">
        <h2 style="color:#1a1a1a;">Verify your email</h2>
        <p style="color:#6b7280;">Hi ${name}, use the OTP below to complete your registration.</p>
        <div style="background:#f3f4f6;border-radius:8px;padding:24px;text-align:center;margin:24px 0;">
          <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#111827;">${otp}</span>
        </div>
        <p style="color:#6b7280;font-size:14px;">This OTP expires in <strong>10 minutes</strong>.</p>
        <p style="color:#6b7280;font-size:14px;">If you did not request this, ignore this email.</p>
      </div>
    `,
  });
};

module.exports = { sendOTPEmail };