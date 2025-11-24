import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../../models/user.model.js";

export async function createTestUser({
  username = `user_${Date.now()}`,
  email = `user_${Date.now()}@example.com`,
  password = "Password123!",
  overrides = {},
} = {}) {
  const hashed = await bcryptjs.hash(password, 12);
  const user = await User.create({
    username,
    email: email.toLowerCase(),
    password: hashed,
    ...overrides,
  });
  return { user, password };
}

export function buildAuthCookie(userId) {
  const token = jwt.sign(
    { id: userId, typ: "access" },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_TTL || "30m",
    }
  );
  return `access_token=${token}; Path=/; HttpOnly`;
}

export function buildRefreshCookie(userId) {
  const token = jwt.sign(
    { id: userId, typ: "refresh" },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_TTL || "7d",
    }
  );
  return `refresh_token=${token}; Path=/; HttpOnly`;
}
