// server/routes/contact.js
import express from "express";
import nodemailer from "nodemailer";
const router = express.Router();

router.post("/", async (req, res) => {
  const { name, email, subject, message } = req.body;

  // iCloud SMTP settings
  const transporter = nodemailer.createTransport({
    host: "smtp.mail.me.com",
    port: 465,
    secure: true,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    logger: true,
    debug: true,
    tls: {
      servername: "smtp.mail.me.com",
      minVersion: "TLSv1.2",
      rejectUnauthorized: true,
    },
    auth: {
      user: "eslam.mahmud18@icloud.com",
      pass: process.env.ICLOUD_APP_PASSWORD, // generated from Apple ID → Security → App-specific passwords
    },
  });

  try {
    await transporter.verify();
    console.log("[SMTP] verify: connection OK");
  } catch (vErr) {
    console.error("[SMTP] verify failed:", vErr?.code || vErr?.message, vErr);
    return res
      .status(502)
      .json({
        success: false,
        message: "smtp_verify_failed",
        error: vErr?.message || String(vErr),
      });
  }

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
      message: "smtp_send_failed",
      error: err?.message || "unknown_error",
    });
  }
});

export default router;
