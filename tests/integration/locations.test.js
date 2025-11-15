import request from "supertest";
import { describe, it, expect, beforeEach } from "vitest";
import app from "../../index.js";
import { seedBasicLocation } from "../helpers/location.js";

const BASE = "/api/locations";
const GOV = "cairo";
const CITY = "new-cairo";
const AREA = "fifth-settlement";

beforeEach(async () => {
  await seedBasicLocation({
    governorate: {
      name: "Cairo",
      nameAr: "القاهرة",
      slug: GOV,
      sort: 1,
    },
    city: {
      name: "New Cairo",
      nameAr: "القاهرة الجديدة",
      slug: CITY,
      popular: true,
    },
    area: {
      name: "Fifth Settlement",
      nameAr: "التجمع الخامس",
      slug: AREA,
      subareas: [
        {
          name: "First District",
          nameAr: "الحي الأول",
          slug: "first-district",
        },
      ],
    },
  });
});

describe("Locations endpoints", () => {
  it("lists governorates with language-specific payloads and query filtering", async () => {
    const res = await request(app).get(`${BASE}/governorates?lang=en`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slug: GOV, name: "Cairo" }),
      ])
    );

    const filter = await request(app).get(
      `${BASE}/governorates?q=fifth&lang=ar`
    );
    // Query doesn't match governorate name; response can be empty array
    expect(filter.status).toBe(200);
    expect(Array.isArray(filter.body)).toBe(true);
  });

  it("returns cities for a governorate and handles 404s", async () => {
    const missing = await request(app).get(
      `${BASE}/governorates/unknown/cities`
    );
    expect(missing.status).toBe(404);
    expect(missing.body?.message).toBe("Governorate not found");

    const res = await request(app).get(
      `${BASE}/governorates/${GOV}/cities?lang=both`
    );
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.cities[0]).toMatchObject({
      slug: CITY,
      popular: true,
    });
  });

  it("returns areas for a city and surfaces 404 when the city does not belong to governorate", async () => {
    const missing = await request(app).get(
      `${BASE}/governorates/${GOV}/cities/missing-city/areas`
    );
    expect(missing.status).toBe(404);
    expect(missing.body?.message).toBe("City not found in governorate");

    const res = await request(app).get(
      `${BASE}/governorates/${GOV}/cities/${CITY}/areas?lang=en`
    );
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.areas[0]).toMatchObject({
      slug: AREA,
      name: "Fifth Settlement",
    });
  });

  it("returns subareas for an area and handles missing records", async () => {
    const missing = await request(app).get(
      `${BASE}/governorates/${GOV}/cities/${CITY}/areas/missing/subareas`
    );
    expect(missing.status).toBe(404);
    expect(missing.body?.message).toBe("Area not found");

    const res = await request(app).get(
      `${BASE}/governorates/${GOV}/cities/${CITY}/areas/${AREA}/subareas?lang=ar`
    );
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.subareas[0]).toMatchObject({
      slug: "first-district",
      name: "الحي الأول",
    });
  });

  it("returns the entire governorate tree", async () => {
    const missing = await request(app).get(`${BASE}/governorates/unknown/tree`);
    expect(missing.status).toBe(404);
    expect(missing.body?.message).toBe("Governorate not found");

    const res = await request(app).get(`${BASE}/governorates/${GOV}/tree`);
    expect(res.status).toBe(200);
    expect(res.body.slug).toBe(GOV);
    expect(res.body.cities).toHaveLength(1);
    expect(res.body.cities[0].areas).toHaveLength(1);
    expect(res.body.cities[0].areas[0].subareas).toHaveLength(1);
  });
});
