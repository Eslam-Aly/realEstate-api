// seed/seedLocations.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import Location from "../models/locations.model.js";
import { LOCATIONS } from "./locations.data.js";

dotenv.config(); // needs MONGODB_URI in .env

async function run() {
  const uri = process.env.MONGO;
  if (!uri) {
    console.error("❌ Missing MONGODB_URI in .env");
    process.exit(1);
  }

  await mongoose.connect(uri, { dbName: process.env.DB_NAME || undefined });
  console.log("✅ Connected");

  // idempotent upsert per governorate
  for (const g of LOCATIONS) {
    await Location.updateOne(
      { slug: g.slug },
      { $set: { name: g.name, slug: g.slug, sort: g.sort, cities: g.cities } },
      { upsert: true }
    );
    console.log(`Upserted: ${g.name}`);
  }

  console.log("🎉 Seeding done");
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
