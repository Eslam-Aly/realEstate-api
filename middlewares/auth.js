// realEstate-api/middlewares/auth.js
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

/**
 * Verifies the JWT from the httpOnly cookie and attaches a minimal user object to req.user.
 * Returns 401 if missing/invalid.
 */
export async function verifyAuth(req, res, next) {
  try {
    const token = req.cookies?.access_token;
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id)
      .select("_id email emailVerified username")
      .lean();
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    req.user = {
      id: user._id.toString(),
      email: user.email,
      emailVerified: !!user.emailVerified,
      username: user.username,
    };
    next();
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }
}

/**
 * Optional gate: require verified email to access the route.
 * Returns 403 if the user isn’t verified.
 */
export function requireVerified(req, res, next) {
  if (!req.user?.emailVerified) {
    return res.status(403).json({ message: "Please verify your email" });
  }
  next();
}
