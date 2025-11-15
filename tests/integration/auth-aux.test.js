import request from "supertest";
import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { OAuth2Client } from "google-auth-library";
import app from "../../index.js";
import User from "../../models/user.model.js";
import { createTestUser } from "../helpers/auth.js";

describe("Auth auxiliary flows", () => {
  let user;

  beforeEach(async () => {
    user = (await createTestUser()).user;
  });

  it("sends email verification when account exists", async () => {
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValue({ ok: true, text: async () => "" });

    const res = await request(app)
      .post("/api/auth/send-verification")
      .send({ email: user.email, lang: "en" });

    expect(res.status).toBe(200);
    expect(res.body?.message).toBe("Verification email sent");
    expect(fetchMock).toHaveBeenCalled();
  });

  it("returns generic success when send-verification email does not exist", async () => {
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValue({ ok: true, text: async () => "" });

    const res = await request(app)
      .post("/api/auth/send-verification")
      .send({ email: "missing@example.com" });

    expect(res.status).toBe(200);
    expect(res.body?.message).toBe("If the account exists, an email was sent");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("verifies email tokens and redirects to client URL", async () => {
    const token = jwt.sign(
      {
        act: "verify",
        sub: user._id.toString(),
        email: user.email,
        lang: "en",
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const res = await request(app)
      .get(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .redirects(0);

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("/verified");
    const refreshed = await User.findById(user._id);
    expect(refreshed.emailVerified).toBe(true);
  });

  it("sends password reset emails when user exists", async () => {
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValue({ ok: true, text: async () => "" });

    const res = await request(app)
      .post("/api/auth/request-password-reset")
      .send({ email: user.email, lang: "en" });

    expect(res.status).toBe(200);
    expect(res.body?.message).toBe("If the account exists, an email was sent");
    expect(fetchMock).toHaveBeenCalled();
  });

  it("resets password with valid token", async () => {
    const token = jwt.sign(
      {
        act: "pwd_reset",
        sub: user._id.toString(),
        email: user.email,
        lang: "en",
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, newPassword: "NewPassword!23" });

    expect(res.status).toBe(200);
    expect(res.body?.message).toBe("Password updated");
    const refreshed = await User.findById(user._id);
    const matches = await bcryptjs.compare(
      "NewPassword!23",
      refreshed.password
    );
    expect(matches).toBe(true);
  });

  it("signs in via Google OAuth", async () => {
    const verifySpy = vi
      .spyOn(OAuth2Client.prototype, "verifyIdToken")
      .mockResolvedValue({
        getPayload: () => ({
          sub: "google-123",
          email: "google-user@example.com",
          email_verified: true,
          name: "Google User",
          picture: "https://example.com/avatar.png",
        }),
      });

    const res = await request(app)
      .post("/api/auth/google")
      .send({ idToken: "fake-token" });

    expect(res.status).toBe(200);
    expect(res.body.email).toBe("google-user@example.com");
    expect(verifySpy).toHaveBeenCalled();

    const created = await User.findOne({
      email: "google-user@example.com",
    });
    expect(created).toBeTruthy();
    const cookies = res.headers["set-cookie"] || [];
    expect(cookies.some((c) => c.startsWith("access_token="))).toBe(true);
  });
});
