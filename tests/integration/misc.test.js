import request from "supertest";
import { describe, it, expect, afterEach, vi } from "vitest";
import app from "../../index.js";

describe("Contact and health endpoints", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("validates required contact fields", async () => {
    const res = await request(app).post("/api/contact").send({});
    expect(res.status).toBe(400);
    expect(res.body?.message).toBe("missing_fields");
  });

  it("sends contact emails via Resend", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      text: async () => "",
    });

    const res = await request(app).post("/api/contact").send({
      name: "Visitor",
      email: "visitor@example.com",
      subject: "Hello",
      message: "Test inquiry",
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, message: "sent" });
    expect(global.fetch).toHaveBeenCalled();
  });

  it("surfaces upstream email errors", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => "resend down",
    });

    const res = await request(app).post("/api/contact").send({
      name: "Visitor",
      email: "visitor@example.com",
      message: "Test inquiry",
    });

    expect(res.status).toBe(502);
    expect(res.body?.message).toBe("email_api_failed");
    expect(res.body?.error).toContain("resend");
  });

  it("reports API health and Mongo connection state", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
      mongo: "connected",
      message: "API is running",
    });
  });
});
