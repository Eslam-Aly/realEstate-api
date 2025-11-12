import express from "express";

import {
  google,
  signin,
  signup,
  signout,
  sendEmailVerification,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
} from "../controllers/auth.controller.js";
import { verifyAuth } from "../middlewares/auth.js";
import User from "../models/user.model.js";

const router = express.Router();

router.get("/me", verifyAuth, async (req, res, next) => {
  try {
    // Return a fresh, safe user payload (no password)
    const user = await User.findById(req.user.id).select("-password").lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (e) {
    next(e);
  }
});

router.post("/signup", signup);
router.post("/signin", signin);
router.post("/google", google);
router.get("/signout", signout);
router.post("/send-verification", sendEmailVerification);
router.get("/verify-email", verifyEmail);
router.post("/request-password-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);

export default router;
