import bcryptjs from "bcryptjs";
import errorHandler from "../utils/error.js";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { OAuth2Client } from "google-auth-library";
import dotenv from "dotenv";
dotenv.config();

const isProduction = process.env.NODE_ENV === "production";
// Feature flags & URLs
const ENFORCE_EMAIL_VERIFICATION =
  process.env.ENFORCE_EMAIL_VERIFICATION === "true";
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:10000"; // backend base URL used in email links
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173"; // frontend (for reset UI)
const EMAIL_FROM = process.env.EMAIL_FROM || "AqarDot <no-reply@aqardot.com>";

// Bilingual email templates (EN/AR)
const emailContent = {
  verify: (lang, { username, link }) => {
    if (lang === "ar") {
      return {
        subject: "تأكيد بريدك الإلكتروني",
        html: `
<div dir="rtl" style="font-family: Tahoma, Arial, 'Segoe UI', sans-serif; text-align:right;">
  <p>مرحبًا ${username || "صديقي"}،</p>
  <p>من فضلك قم بتأكيد بريدك الإلكتروني بالضغط على الرابط التالي (صالح لمدة ٢٤ ساعة):</p>
  <p><a href="${link}">تأكيد البريد الإلكتروني</a></p>
  <p>إذا لم تقم بإنشاء حساب، فتجاهل هذه الرسالة.</p>
</div>`.trim(),
      };
    }
    return {
      subject: "Verify your email",
      html: `
<div style="font-family: Arial, 'Segoe UI', Tahoma, sans-serif;">
  <p>Hi ${username || "there"},</p>
  <p>Please verify your email by clicking the link below (valid for 24 hours):</p>
  <p><a href="${link}">Verify my email</a></p>
  <p>If you did not create an account, you can ignore this email.</p>
</div>`.trim(),
    };
  },
  reset: (lang, { username, link }) => {
    if (lang === "ar") {
      return {
        subject: "إعادة تعيين كلمة المرور",
        html: `
<div dir="rtl" style="font-family: Tahoma, Arial, 'Segoe UI', sans-serif; text-align:right;">
  <p>مرحبًا ${username || "صديقي"}،</p>
  <p>اضغط على الرابط التالي لإعادة تعيين كلمة المرور (صالح لمدة ١٥ دقيقة):</p>
  <p><a href="${link}">إعادة تعيين كلمة المرور</a></p>
</div>`.trim(),
      };
    }
    return {
      subject: "Reset your password",
      html: `
<div style="font-family: Arial, 'Segoe UI', Tahoma, sans-serif;">
  <p>Hi ${username || "there"},</p>
  <p>Click the link below to reset your password (valid for 15 minutes):</p>
  <p><a href="${link}">Reset password</a></p>
</div>`.trim(),
    };
  },
};

// Token lifetime (JWT) and cookie lifetime (ms)
const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || "30m";
const ACCESS_TOKEN_MAXAGE_MS = Number(
  process.env.ACCESS_TOKEN_MAXAGE_MS || 30 * 60 * 1000
);

// Create short-lived signed tokens for actions (verify, reset)
const makeActionToken = (payload, expiresIn) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });

// Minimal Resend mail helper (Node >= 18 for global fetch)
const sendResendEmail = async ({ to, subject, html }) => {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Resend error: ${resp.status} ${text}`);
  }
};

// helper: normalize email
const normalizeEmail = (email) => (email || "").trim().toLowerCase();

// Google OAuth2 client for verifying ID tokens
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = GOOGLE_CLIENT_ID
  ? new OAuth2Client(GOOGLE_CLIENT_ID)
  : null;

const baseCookieOptions = {
  httpOnly: true,
  sameSite: isProduction ? "lax" : "lax",
  secure: isProduction,
  domain: isProduction ? ".aqardot.com" : undefined,
};

/**
 * Handles local email/password sign-up.
 * Expects { username, email, password } in the request body.
 */
export const signup = async (req, res, next) => {
  try {
    const { username, email, password } = req.body || {};
    if (!username || !email || !password) {
      return next(
        errorHandler(400, "username, email and password are required")
      );
    }

    const normEmail = normalizeEmail(email);

    // hash password (async, non-blocking)
    const hashedPassword = await bcryptjs.hash(password, 12);

    const newUser = new User({
      username,
      email: normEmail,
      password: hashedPassword,
    });
    await newUser.save();

    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    if (error?.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || "field";
      return next(errorHandler(409, `${field} is already taken`));
    }
    next(error);
  }
};

/**
 * Signs in a user using email/password.
 * Returns the user document (sans password) and sets an httpOnly JWT cookie.
 */
export const signin = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password)
      return next(errorHandler(400, "email and password are required"));

    const normEmail = normalizeEmail(email);
    const isValidUser = await User.findOne({ email: normEmail });
    if (!isValidUser) {
      return next(errorHandler(404, "user not found!"));
    }

    const isPasswordValid = await bcryptjs.compare(
      password,
      isValidUser.password
    );
    if (!isPasswordValid) {
      return next(errorHandler(401, "Invalid email or password!"));
    }

    if (ENFORCE_EMAIL_VERIFICATION && !isValidUser.emailVerified) {
      return next(
        errorHandler(403, "Please verify your email before logging in")
      );
    }

    const token = jwt.sign({ id: isValidUser._id }, process.env.JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_TTL,
    });
    const { password: pass, ...userData } = isValidUser._doc;

    res
      .cookie("access_token", token, {
        ...baseCookieOptions,
        maxAge: ACCESS_TOKEN_MAXAGE_MS,
      })
      .status(200)
      .json(userData);
  } catch (error) {
    next(error);
  }
};

/**
 * Handles Google OAuth sign-in/up. Creates a new user if none exists.
 * Responds with user data and sets the auth cookie.
 */
export const google = async (req, res, next) => {
  try {
    if (!googleClient) {
      return next(errorHandler(500, "Missing GOOGLE_CLIENT_ID configuration"));
    }

    const { idToken } = req.body || {};
    if (!idToken) {
      return next(errorHandler(400, "idToken is required"));
    }

    // Verify the ID token with Google and our audience (client id)
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload) return next(errorHandler(401, "Invalid Google token"));

    const { sub, email, email_verified, name, picture } = payload;
    if (!email || email_verified !== true) {
      return next(
        errorHandler(
          401,
          "Unverified Google account. Please verify your email with Google."
        )
      );
    }

    const normEmail = normalizeEmail(email);

    // Upsert user
    let user = await User.findOne({ email: normEmail });
    if (!user) {
      const generatedPassword =
        Math.random().toString(36).slice(-8) +
        Math.random().toString(36).slice(-8);
      const hashedPassword = await bcryptjs.hash(generatedPassword, 12);
      user = new User({
        username:
          (name || "user").split(" ").join("").toLowerCase().slice(0, 20) +
          Math.random().toString(36).slice(-4),
        email: normEmail,
        password: hashedPassword,
        avatar: picture,
        googleId: sub,
      });
      await user.save();
    }

    // Issue short-lived JWT and set cookie
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_TTL,
    });
    const { password: pass, ...rest } = user._doc;

    res
      .cookie("access_token", token, {
        ...baseCookieOptions,
        maxAge: ACCESS_TOKEN_MAXAGE_MS,
      })
      .status(200)
      .json(rest);
  } catch (error) {
    if (error?.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || "field";
      return next(errorHandler(409, `${field} is already taken`));
    }
    next(error);
  }
};

/**
 * Clears the JWT cookie to invalidate the current session.
 */
export const signout = (req, res, next) => {
  try {
    res.clearCookie("access_token", { ...baseCookieOptions });
    res.status(200).json({ message: "User signed out successfully" });
  } catch (error) {
    next(error);
  }
};

/**
 * Sends an email verification link (24h TTL) to the given email or current user.
 * Body: { email?: string }
 */
export const sendEmailVerification = async (req, res, next) => {
  try {
    const { email: bodyEmail } = req.body || {};

    let user = null;
    if (bodyEmail) {
      user = await User.findOne({ email: normalizeEmail(bodyEmail) });
    }
    // If user not found, respond generically to avoid enumeration
    if (!user)
      return res
        .status(200)
        .json({ message: "If the account exists, an email was sent" });

    const lang = (req.body?.lang || "en").toLowerCase();

    const token = makeActionToken(
      { act: "verify", sub: user._id.toString(), email: user.email, lang },
      "24h"
    );
    const link = `${API_BASE_URL}/api/auth/verify-email?token=${encodeURIComponent(
      token
    )}&lang=${lang}`;

    const { subject, html } = emailContent.verify(lang, {
      username: user.username,
      link,
    });

    await sendResendEmail({
      to: user.email,
      subject,
      html,
    });

    res.status(200).json({ message: "Verification email sent" });
  } catch (error) {
    next(error);
  }
};

/**
 * Verifies the email from a token in the query string and marks the user as verified.
 * GET /api/auth/verify-email?token=...
 */
export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query || {};
    if (!token) return next(errorHandler(400, "token is required"));

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return next(
        errorHandler(400, `Invalid or expired token: ${err.message}`)
      );
    }
    if (decoded.act !== "verify")
      return next(errorHandler(400, "Invalid token type"));

    const user = await User.findById(decoded.sub);
    if (!user || normalizeEmail(user.email) !== normalizeEmail(decoded.email)) {
      return next(errorHandler(404, "User not found for this token"));
    }

    if (!user.emailVerified) {
      user.emailVerified = true;
      await user.save();
    }

    const lang = (req.query.lang || decoded.lang || "en").toLowerCase();

    // Optionally redirect to the frontend success page
    if (CLIENT_URL) {
      return res.redirect(`${CLIENT_URL}/verified?lang=${lang}`);
    }
    return res.status(200).json({ message: "Email verified" });
  } catch (error) {
    next(error);
  }
};

/**
 * Sends a password reset link (15m TTL). Always returns generic success.
 * Body: { email: string }
 */
export const requestPasswordReset = async (req, res, next) => {
  try {
    const { email } = req.body || {};
    if (!email) return next(errorHandler(400, "email is required"));

    const user = await User.findOne({ email: normalizeEmail(email) });
    if (user) {
      const lang = (req.body?.lang || "en").toLowerCase();

      const token = makeActionToken(
        { act: "pwd_reset", sub: user._id.toString(), email: user.email, lang },
        "15m"
      );
      const link = `${CLIENT_URL}/reset-password?token=${encodeURIComponent(
        token
      )}&lang=${lang}`;

      const { subject, html } = emailContent.reset(lang, {
        username: user.username,
        link,
      });

      try {
        await sendResendEmail({
          to: user.email,
          subject,
          html,
        });
      } catch (mailErr) {
        console.error("[AUTH/RESET] mail error:", mailErr?.message);
      }
    }

    // Always respond generically to prevent user enumeration
    res
      .status(200)
      .json({ message: "If the account exists, an email was sent" });
  } catch (error) {
    next(error);
  }
};

/**
 * Resets a user's password given a valid token and a new password.
 * Body: { token: string, newPassword: string }
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body || {};
    if (!token || !newPassword)
      return next(errorHandler(400, "token and newPassword are required"));

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return next(
        errorHandler(400, `Invalid or expired token: ${err.message}`)
      );
    }
    if (decoded.act !== "pwd_reset")
      return next(errorHandler(400, "Invalid token type"));

    const user = await User.findById(decoded.sub);
    if (!user || normalizeEmail(user.email) !== normalizeEmail(decoded.email)) {
      return next(errorHandler(404, "User not found for this token"));
    }

    user.password = await bcryptjs.hash(newPassword, 12);
    await user.save();

    res.status(200).json({ message: "Password updated" });
  } catch (error) {
    next(error);
  }
};
