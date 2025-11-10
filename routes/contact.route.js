// server/routes/contact.js
import express from "express";
import nodemailer from "nodemailer";
const router = express.Router();

router.post("/", async (req, res) => {
  const { name, email, subject, message } = req.body;

  // iCloud SMTP settings
  const transporter = nodemailer.createTransport({
    host: "smtp.mail.me.com",
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: "eslam.mahmud18@icloud.com",
      pass: process.env.ICLOUD_APP_PASSWORD, // generated from Apple ID → Security → App-specific passwords
    },
  });

  try {
    await transporter.sendMail({
      from: `"AqarDot.com" <contact@aqardot.com>`,
      to: "contact@aqardot.com",
      subject: subject || "New message from AqarDot contact form",
      text: `From: ${name} (${email})\n\n${message}`,
    });
    res.status(200).json({
      success: true,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
    });
  }
});

export default router;
