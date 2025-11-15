import request from "supertest";
import { describe, it, expect } from "vitest";
import app from "../../index.js";
import User from "../../models/user.model.js";
import { createTestUser, buildAuthCookie } from "../helpers/auth.js";

const signupRoute = "/api/auth/signup";
const signinRoute = "/api/auth/signin";
const meRoute = "/api/auth/me";
const signoutRoute = "/api/auth/signout";

describe("Auth routes", () => {
  it("creates a user via /signup and hashes their password", async () => {
    const payload = {
      username: `testuser_${Date.now()}`,
      email: "MixedCase@example.com",
      password: "Password123!",
    };

    const res = await request(app).post(signupRoute).send(payload);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ message: "User created successfully" });

    const stored = await User.findOne({ email: payload.email.toLowerCase() });
    expect(stored).toBeTruthy();
    expect(stored.username).toBe(payload.username);
    expect(stored.password).not.toBe(payload.password);
  });

  it("rejects duplicate email or username on /signup", async () => {
    const payload = {
      username: `dupe_${Date.now()}`,
      email: `dupe_${Date.now()}@example.com`,
      password: "Password123!",
    };
    await request(app).post(signupRoute).send(payload).expect(201);

    const res = await request(app).post(signupRoute).send(payload);
    expect(res.status).toBe(409);
    expect(res.body?.message).toMatch(/already taken/i);
  });

  it("validates required fields on /signup", async () => {
    const res = await request(app).post(signupRoute).send({
      email: "",
      password: "",
    });
    expect(res.status).toBe(400);
    expect(res.body?.message).toBe("username, email and password are required");
  });

  it("signs in a user and sets an access_token cookie", async () => {
    const email = `signin_${Date.now()}@example.com`;
    const plainPassword = "Password123!";
    await request(app)
      .post(signupRoute)
      .send({ username: `signin_${Date.now()}`, email, password: plainPassword })
      .expect(201);

    const res = await request(app)
      .post(signinRoute)
      .send({ email, password: plainPassword });
    expect(res.status).toBe(200);
    const signinCookies = res.headers["set-cookie"] || [];
    expect(Array.isArray(signinCookies)).toBe(true);
    expect(
      signinCookies.some((cookie) => cookie.startsWith("access_token="))
    ).toBe(true);
    expect(res.body).toMatchObject({
      email,
      username: expect.any(String),
    });
    expect(res.body).not.toHaveProperty("password");
  });

  it("rejects invalid credentials on /signin", async () => {
    const email = `invalid_${Date.now()}@example.com`;
    const password = "Password123!";
    await createTestUser({ email, password });

    const res = await request(app)
      .post(signinRoute)
      .send({ email, password: "WrongPassword!" });
    expect(res.status).toBe(401);
    expect(res.body?.message).toBe("Invalid email or password!");
  });

  it("requires email and password on /signin", async () => {
    const res = await request(app).post(signinRoute).send({});
    expect(res.status).toBe(400);
    expect(res.body?.message).toBe("email and password are required");
  });

  it("returns the authenticated user on /me when a valid cookie is provided", async () => {
    const { user } = await createTestUser();
    const cookie = buildAuthCookie(user._id);

    const res = await request(app).get(meRoute).set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      _id: user._id.toString(),
      email: user.email,
      username: user.username,
    });
    expect(res.body).not.toHaveProperty("password");
  });

  it("rejects unauthenticated requests to /me", async () => {
    const res = await request(app).get(meRoute);
    expect(res.status).toBe(401);
    expect(res.body?.message).toBe("Unauthorized");
  });

  it("clears the auth cookie on /signout", async () => {
    const res = await request(app).get(signoutRoute);
    expect(res.status).toBe(200);
    expect(res.body?.message).toBe("User signed out successfully");
    const cookies = res.headers["set-cookie"] || [];
    expect(Array.isArray(cookies)).toBe(true);
    expect(
      cookies.some(
        (cookie) =>
          cookie.startsWith("access_token=") &&
          /expires=thu, 01 jan 1970/i.test(cookie)
      )
    ).toBe(true);
  });
});
