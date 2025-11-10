import express from "express";
// If Node <18, uncomment the next line:
// import fetch from "node-fetch";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    if (!process.env.RESEND_API_KEY) {
      return res
        .status(500)
        .json({ success: false, message: "missing_env_RESEND_API_KEY" });
    }

    const { name, email, subject, message } = req.body || {};
    if (!name || !email || !message) {
      return res
        .status(400)
        .json({ success: false, message: "missing_fields" });
    }

    // Build a simple text + HTML body
    const subj = subject?.trim() || "New message from AqarDot contact form";
    const text = `From: ${name} <${email}>\n\n${message}`;
    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.6">
        <p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(
      email
    )}&gt;</p>
        <p><strong>Subject:</strong> ${escapeHtml(subj)}</p>
        <hr/>
        <pre style="white-space:pre-wrap">${escapeHtml(message)}</pre>
      </div>
    `;

    // Send via Resend HTTP API
    const rsp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "AqarDot.com <contact@aqardot.com>", // your verified domain
        to: ["contact@aqardot.com"], // where you receive
        reply_to: email, // reply goes to the sender
        subject: subj,
        text,
        html,
      }),
    });

    if (!rsp.ok) {
      const errText = await rsp.text().catch(() => "");
      return res.status(502).json({
        success: false,
        message: "email_api_failed",
        error: errText || `resend_status_${rsp.status}`,
      });
    }

    return res.status(200).json({ success: true, message: "sent" });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: "server_error",
      error: e?.message || "unknown",
    });
  }
});

// small helper to avoid HTML injection
function escapeHtml(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export default router;
