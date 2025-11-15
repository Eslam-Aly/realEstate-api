import request from "supertest";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import app from "../../index.js";
import User from "../../models/user.model.js";
import Favorite from "../../models/favorite.model.js";
import { createTestUser, buildAuthCookie } from "../helpers/auth.js";
import { createListingDoc } from "../helpers/listing.js";
import { seedBasicLocation } from "../helpers/location.js";

describe("User profile endpoints", () => {
  let owner;
  let ownerCookie;

  beforeEach(async () => {
    await seedBasicLocation();
    const result = await createTestUser({
      username: `owner_${Date.now()}`,
      email: `owner_${Date.now()}@example.com`,
    });
    owner = result.user;
    ownerCookie = buildAuthCookie(owner._id);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns public user data", async () => {
    const res = await request(app).get(`/api/user/public/${owner._id}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      username: owner.username,
      avatar: owner.avatar,
    });

    const missing = await request(app).get(
      `/api/user/public/${new User()._id}`
    );
    expect(missing.status).toBe(404);
  });

  it("allows a user to update their own profile and rejects others", async () => {
    const res = await request(app)
      .post(`/api/user/update/${owner._id}`)
      .set("Cookie", ownerCookie)
      .send({ username: "newname", email: "new@example.com" });

    expect(res.status).toBe(200);
    expect(res.body.username).toBe("newname");
    const updated = await User.findById(owner._id);
    expect(updated.username).toBe("newname");

    const { user: stranger } = await createTestUser();
    const strangerRes = await request(app)
      .post(`/api/user/update/${owner._id}`)
      .set("Cookie", buildAuthCookie(stranger._id))
      .send({ username: "hack" });
    expect(strangerRes.status).toBe(403);
  });

  it("deletes the authenticated user and cascades related data", async () => {
    const listing = await createListingDoc({ user: owner });
    await Favorite.create({ userId: owner._id, listingId: listing._id });
    await Favorite.create({
      userId: new User()._id,
      listingId: listing._id,
    });

    const deleteFilesMock = vi
      .spyOn(
        await import("../../utils/firebaseStorage.js"),
        "deleteStorageFilesByUrl"
      )
      .mockResolvedValue();

    const res = await request(app)
      .delete(`/api/user/delete/${owner._id}`)
      .set("Cookie", ownerCookie);

    expect(res.status).toBe(200);
    expect(res.body?.message).toBe(
      "User and related data deleted successfully."
    );
    expect(await User.findById(owner._id)).toBeNull();
    expect(await Favorite.countDocuments()).toBe(0);
    expect(deleteFilesMock).toHaveBeenCalled();
  });

  it("prevents deleting other users", async () => {
    const { user: stranger } = await createTestUser();
    const res = await request(app)
      .delete(`/api/user/delete/${owner._id}`)
      .set("Cookie", buildAuthCookie(stranger._id));
    expect(res.status).toBe(401);
  });

  it("lists authenticated user's listings", async () => {
    const listing = await createListingDoc({ user: owner });
    const res = await request(app)
      .get("/api/user/listings")
      .set("Cookie", ownerCookie);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]._id).toBe(listing._id.toString());
  });

  it("rejects listing access when requesting another user's listings", async () => {
    const { user: stranger } = await createTestUser();
    const res = await request(app)
      .get(`/api/user/listings/${owner._id}`)
      .set("Cookie", buildAuthCookie(stranger._id));
    expect(res.status).toBe(401);
    expect(res.body?.message).toBe("You can access only your listings!");
  });
});
