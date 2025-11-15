import request from "supertest";
import mongoose from "mongoose";
import { describe, it, expect, beforeEach } from "vitest";
import app from "../../index.js";
import Favorite from "../../models/favorite.model.js";
import { seedBasicLocation } from "../helpers/location.js";
import { createListingDoc } from "../helpers/listing.js";
import { createTestUser, buildAuthCookie } from "../helpers/auth.js";

const ROUTE = "/api/favorites";

describe("Favorites endpoints", () => {
  let owner;
  let viewer;
  let viewerCookie;
  let listing;

  beforeEach(async () => {
    await seedBasicLocation();
    owner = (await createTestUser()).user;
    viewer = (await createTestUser()).user;
    viewerCookie = buildAuthCookie(viewer._id);
    listing = await createListingDoc({ user: owner });
  });

  it("requires authentication for favorites endpoints", async () => {
    const idsRes = await request(app).get(`${ROUTE}/ids`);
    expect(idsRes.status).toBe(401);
    expect(idsRes.body?.message).toBe("Not authenticated!");

    const listRes = await request(app).get(ROUTE);
    expect(listRes.status).toBe(401);
  });

  it("adds and lists favorite ids", async () => {
    const addRes = await request(app)
      .post(`${ROUTE}/${listing._id}`)
      .set("Cookie", viewerCookie)
      .send();
    expect(addRes.status).toBe(200);
    expect(addRes.body).toEqual({ success: true });
    expect(await Favorite.countDocuments()).toBe(1);

    const idsRes = await request(app)
      .get(`${ROUTE}/ids`)
      .set("Cookie", viewerCookie);

    expect(idsRes.status).toBe(200);
    expect(idsRes.body).toContain(listing._id.toString());
  });

  it("ignores duplicate favorites gracefully", async () => {
    await request(app)
      .post(`${ROUTE}/${listing._id}`)
      .set("Cookie", viewerCookie);
    const second = await request(app)
      .post(`${ROUTE}/${listing._id}`)
      .set("Cookie", viewerCookie);
    expect(second.status).toBe(200);
    expect(await Favorite.countDocuments()).toBe(1);
  });

  it("rejects invalid or missing listing ids when adding/removing", async () => {
    const badIdRes = await request(app)
      .post(`${ROUTE}/invalid-id`)
      .set("Cookie", viewerCookie);
    expect(badIdRes.status).toBe(400);
    expect(badIdRes.body?.message).toBe("Invalid listing id");

    const fakeId = new mongoose.Types.ObjectId().toString();
    const missingRes = await request(app)
      .post(`${ROUTE}/${fakeId}`)
      .set("Cookie", viewerCookie);
    expect(missingRes.status).toBe(404);
    expect(missingRes.body?.message).toBe("Listing not found");

    const deleteRes = await request(app)
      .delete(`${ROUTE}/invalid-id`)
      .set("Cookie", viewerCookie);
    expect(deleteRes.status).toBe(400);
    expect(deleteRes.body?.message).toBe("Invalid listing id");
  });

  it("returns populated listings for favorites list with pagination data", async () => {
    const otherListing = await createListingDoc({
      user: owner,
      overrides: { title: "Second" },
    });

    await request(app)
      .post(`${ROUTE}/${listing._id}`)
      .set("Cookie", viewerCookie);
    await request(app)
      .post(`${ROUTE}/${otherListing._id}`)
      .set("Cookie", viewerCookie);

    const res = await request(app)
      .get(`${ROUTE}?limit=10&page=1`)
      .set("Cookie", viewerCookie);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.results)).toBe(true);
    expect(res.body.results.length).toBe(2);
    expect(res.body.total).toBe(2);
    expect(res.body.results[0]).toHaveProperty("title");
  });

  it("removes favorites", async () => {
    await request(app)
      .post(`${ROUTE}/${listing._id}`)
      .set("Cookie", viewerCookie);

    const res = await request(app)
      .delete(`${ROUTE}/${listing._id}`)
      .set("Cookie", viewerCookie);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(await Favorite.countDocuments()).toBe(0);
  });
});
