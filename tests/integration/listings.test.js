import request from "supertest";
import mongoose from "mongoose";
import { describe, it, expect, beforeEach } from "vitest";
import app from "../../index.js";
import { createTestUser, buildAuthCookie } from "../helpers/auth.js";
import { seedBasicLocation } from "../helpers/location.js";

const BASE_ROUTE = "/api/listings";
const GOV_SLUG = "cairo";
const CITY_SLUG = "new-cairo";
const AREA_SLUG = "fifth-settlement";

const baseLocation = {
  governorate: { slug: GOV_SLUG },
  city: { slug: CITY_SLUG },
  area: { slug: AREA_SLUG },
};

function buildListingPayload(overrides = {}) {
  const payload = {
    title: "Sky View Apartment",
    description: "Spacious unit in the heart of Fifth Settlement.",
    price: 15000,
    purpose: "rent",
    category: "apartment",
    images: ["https://example.com/listing.jpg"],
    size: 180,
    bedrooms: 3,
    bathrooms: 2,
    furnished: true,
    negotiable: false,
  };

  Object.assign(payload, overrides);
  payload.location =
    overrides.location || JSON.parse(JSON.stringify(baseLocation));
  payload.contact =
    overrides.contact || { phone: "01012345678", whatsapp: true };
  payload.images = overrides.images || payload.images;

  return payload;
}

async function createListing(authCookie, overrides) {
  const res = await request(app)
    .post(`${BASE_ROUTE}/create`)
    .set("Cookie", authCookie)
    .send(buildListingPayload(overrides));

  expect(res.status).toBe(201);
  return res.body.listing;
}

describe("Listings CRUD endpoints", () => {
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

  it("creates a listing with normalized location and phone", async () => {
    const res = await request(app)
      .post(`${BASE_ROUTE}/create`)
      .set("Cookie", ownerCookie)
      .send(buildListingPayload());

    expect(res.status).toBe(201);
    const listing = res.body?.listing;
    expect(listing).toBeTruthy();
    expect(listing.userRef).toBe(owner._id.toString());
    expect(listing.contact.phone).toBe("+201012345678");
    expect(listing.location.governorate.slug).toBe(GOV_SLUG);
    expect(listing.location.city.slug).toBe(CITY_SLUG);
    expect(listing.location.area.slug).toBe(AREA_SLUG);
    expect(listing.address).toBe(
      "Cairo - New Cairo - Fifth Settlement"
    );
  });

  it("rejects listing creation when phone number is invalid", async () => {
    const res = await request(app)
      .post(`${BASE_ROUTE}/create`)
      .set("Cookie", ownerCookie)
      .send(
        buildListingPayload({
          contact: { phone: "9999", whatsapp: true },
        })
      );

    expect(res.status).toBe(400);
    expect(res.body?.message).toBe("Valid phone number is required");
  });

  it("rejects listing creation when governorate slug does not exist", async () => {
    const res = await request(app)
      .post(`${BASE_ROUTE}/create`)
      .set("Cookie", ownerCookie)
      .send(
        buildListingPayload({
          location: {
            governorate: { slug: "unknown" },
            city: { slug: "ghost-city" },
          },
        })
      );

    expect(res.status).toBe(400);
    expect(res.body?.message).toBe("Governorate not found");
  });

  it("updates a listing owned by the caller", async () => {
    const listing = await createListing(ownerCookie);

    const res = await request(app)
      .patch(`${BASE_ROUTE}/update/${listing._id}`)
      .set("Cookie", ownerCookie)
      .send({ price: 20000, negotiable: true });

    expect(res.status).toBe(200);
    expect(res.body?.updatedListing?.price).toBe(20000);
    expect(res.body?.updatedListing?.negotiable).toBe(true);
  });

  it("blocks updates from non-owners", async () => {
    const listing = await createListing(ownerCookie);
    const { user: stranger } = await createTestUser({
      username: `stranger_${Date.now()}`,
      email: `stranger_${Date.now()}@example.com`,
    });
    const strangerCookie = buildAuthCookie(stranger._id);

    const res = await request(app)
      .patch(`${BASE_ROUTE}/update/${listing._id}`)
      .set("Cookie", strangerCookie)
      .send({ price: 99999 });

    expect(res.status).toBe(403);
    expect(res.body?.message).toBe(
      "You are not allowed to update this listing"
    );
  });

  it("deletes a listing owned by the caller", async () => {
    const listing = await createListing(ownerCookie);

    const res = await request(app)
      .delete(`${BASE_ROUTE}/delete/${listing._id}`)
      .set("Cookie", ownerCookie);

    expect(res.status).toBe(200);
    expect(res.body?.message).toBe("Listing deleted successfully");
  });

  it("prevents deleting listings owned by another user", async () => {
    const listing = await createListing(ownerCookie);
    const { user: stranger } = await createTestUser({
      username: `deleter_${Date.now()}`,
      email: `deleter_${Date.now()}@example.com`,
    });
    const strangerCookie = buildAuthCookie(stranger._id);

    const res = await request(app)
      .delete(`${BASE_ROUTE}/delete/${listing._id}`)
      .set("Cookie", strangerCookie);

    expect(res.status).toBe(403);
    expect(res.body?.message).toBe(
      "You are not allowed to delete this listing"
    );
  });

  it("returns validation errors for invalid listing ids on get/update", async () => {
    const invalidIdRes = await request(app).get(
      `${BASE_ROUTE}/get/not-a-valid-id`
    );
    expect(invalidIdRes.status).toBe(400);
    expect(invalidIdRes.body?.message).toBe("Invalid listing ID format");

    const randomId = new mongoose.Types.ObjectId().toString();
    const notFoundRes = await request(app).get(`${BASE_ROUTE}/get/${randomId}`);
    expect(notFoundRes.status).toBe(404);
    expect(notFoundRes.body?.message).toBe("Listing not found");
  });

  it("lists existing listings and respects filters", async () => {
    const rentListing = await createListing(ownerCookie, {
      price: 12000,
      purpose: "rent",
    });
    await createListing(ownerCookie, {
      price: 5000,
      purpose: "rent",
    });
    await createListing(ownerCookie, {
      price: 2500000,
      purpose: "sale",
      category: "villa",
    });

    const res = await request(app).get(
      `${BASE_ROUTE}/get?purpose=rent&min=9000&max=15000&sort=price&order=asc`
    );

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0]._id).toBe(rentListing._id);
    expect(res.body[0].price).toBe(12000);
  });
});
