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
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_TTL || "30m",
  });
  return `access_token=${token}; Path=/; HttpOnly`;
}
