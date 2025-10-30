// seeds/seedLocations.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Location from "../models/locations.model.js";

dotenv.config(); // expects MONGO and optional DB_NAME

// ---------- Paths & IO ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const seedsDir = __dirname; // keep JSON files alongside this seeder

const DATA_FILES = [
  "locations.bilingual.json", // all govs EXCEPT Cairo & Giza
  "cairo.bilingual.json", // Cairo only
  "giza.bilingual.json", // Giza only
];

function readJsonSafe(file) {
  const full = path.join(seedsDir, file);
  if (!fs.existsSync(full)) {
    console.warn(`⚠️  Missing seed file: ${file} (skipping)`);
    return null;
  }
  try {
    const raw = fs.readFileSync(full, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    console.error(`❌ Failed to parse ${file}:`, e.message);
    process.exit(1);
  }
}

// ---------- Helpers ----------
const slugify = (s) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\u0600-\u06FF]+/gi, "-")
    .replace(/^-+|-+$/g, "");

function ensureSlug(obj) {
  if (!obj.slug) obj.slug = slugify(obj.name || obj.nameAr);
  obj.slug = slugify(obj.slug);
}

function sanitizeStr(s) {
  return typeof s === "string" ? s.trim() : s;
}

function normalizeNode(n) {
  if (!n) return n;
  n.name = sanitizeStr(n.name);
  n.nameAr = sanitizeStr(n.nameAr);
  ensureSlug(n);
  return n;
}

function normalizeLocationShape(loc) {
  // Governorate
  normalizeNode(loc);
  loc.sort = typeof loc.sort === "number" ? loc.sort : 0;

  loc.cities = Array.isArray(loc.cities) ? loc.cities : [];

  // Cities
  for (const city of loc.cities) {
    normalizeNode(city);
    city.popular = !!city.popular;
    city.areas = Array.isArray(city.areas) ? city.areas : [];

    // Areas
    for (const area of city.areas) {
      normalizeNode(area);
      area.subareas = Array.isArray(area.subareas) ? area.subareas : [];

      // Subareas
      for (const sub of area.subareas) {
        normalizeNode(sub);
      }
    }
  }

  return loc;
}

function assertUnique(arr, key, ctxLabel) {
  const seen = new Set();
  for (const x of arr) {
    const k = x[key];
    if (seen.has(k)) {
      throw new Error(`Duplicate ${key} "${k}" found in ${ctxLabel}`);
    }
    seen.add(k);
  }
}

// ---------- Main ----------
async function run() {
  const uri = process.env.MONGO;
  if (!uri) {
    console.error("❌ Missing MONGO in .env");
    process.exit(1);
  }

  const args = new Set(process.argv.slice(2));
  const isDry = args.has("--dry");
  const shouldDrop = args.has("--drop");

  // Read & merge JSON
  const datasets = DATA_FILES.map(readJsonSafe).filter(Boolean);

  // Flatten if files export an object OR array:
  // - If the file exports { governorate_en, ... } single gov -> wrap into array of our model shape
  // - If file exports [{...}, ...] -> assume already model shape
  let merged = [];
  for (const data of datasets) {
    if (Array.isArray(data)) {
      merged.push(...data);
    } else if (data && typeof data === "object") {
      // Try to map the "bilingual file structure" into our Location model shape
      // Accept both:
      //   { governorate_en, governorate_ar, cities: [...] }
      //   { name, nameAr, slug, cities: [...] }
      const isBilingualGov =
        "governorate_en" in data || ("name" in data && "nameAr" in data);
      if (!isBilingualGov) {
        console.error("❌ Unsupported JSON structure in one of the files.");
        process.exit(1);
      }

      const loc = {
        name: data.name || data.governorate_en,
        nameAr: data.nameAr || data.governorate_ar,
        slug: data.slug || slugify(data.name || data.governorate_en),
        sort: typeof data.sort === "number" ? data.sort : 0,
        cities:
          (data.cities || []).map((c) => ({
            name: c.city_en || c.name,
            nameAr: c.city_ar || c.nameAr,
            slug: c.slug || slugify(c.city_en || c.name),
            popular: !!c.popular,
            areas: (c.areas || []).map((a) => ({
              name: a.en || a.name,
              nameAr: a.ar || a.nameAr,
              slug: a.slug || slugify(a.en || a.name),
              subareas: (a.subareas || []).map((s) => ({
                name: s.en || s.name,
                nameAr: s.ar || s.nameAr,
                slug: s.slug || slugify(s.en || s.name),
              })),
            })),
          })) || [],
      };

      merged.push(loc);
    }
  }

  // Normalize + validate
  merged = merged.map(normalizeLocationShape);

  // Ensure unique governorate slugs across dataset
  assertUnique(merged, "slug", "governorates dataset");

  // Optional drop
  if (!isDry && shouldDrop) {
    console.log("🧹 Dropping Location collection...");
    await Location.collection.drop().catch(() => {});
  }

  // Connect
  await mongoose.connect(uri, { dbName: process.env.DB_NAME || undefined });
  console.log("✅ Connected");

  if (isDry) {
    console.log(`🔎 DRY RUN: would upsert ${merged.length} governorates`);
    merged
      .slice(0, 3)
      .forEach((g) =>
        console.log(`• ${g.name} (${g.slug}) → cities=${g.cities.length}`)
      );
    await mongoose.disconnect();
    return;
  }

  // Bulk upsert per governorate
  const ops = merged.map((g) => ({
    updateOne: {
      filter: { slug: g.slug },
      update: {
        $set: {
          name: g.name,
          nameAr: g.nameAr,
          slug: g.slug,
          sort: g.sort || 0,
          cities: g.cities,
        },
      },
      upsert: true,
    },
  }));

  const res = await Location.bulkWrite(ops, { ordered: false });
  console.log(
    `🎉 Seeding done. Upserted/Modified: ${
      res.upsertedCount + (res.modifiedCount || 0)
    }`
  );

  await mongoose.disconnect();
  console.log("🔌 Disconnected");
}

run().catch((err) => {
  console.error("❌ Seeding error:", err);
  process.exit(1);
});
