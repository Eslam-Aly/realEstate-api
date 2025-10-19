import mongoose from "mongoose";

// Location sub-schema (governorate/city coming from your locations collection)
const locationSchema = new mongoose.Schema(
  {
    governorate: {
      slug: { type: String, required: true, lowercase: true, trim: true },
      name: { type: String, required: true, trim: true },
    },
    city: {
      slug: { type: String, required: true, lowercase: true, trim: true },
      name: { type: String, required: true, trim: true },
    },
    // Only used when city.slug === "other"
    city_other_text: { type: String, default: "" },
  },
  { _id: false }
);

// Residential group (apartments, villas, duplex, studio)
const residentialSchema = new mongoose.Schema(
  {
    size: { type: Number, min: 0 }, // sqm
    bedrooms: { type: Number, min: 0 },
    bathrooms: { type: Number, min: 0 },
    floor: { type: Number, min: 0 },
    furnished: { type: Boolean, default: false },
    parking: { type: Boolean, default: false },
  },
  { _id: false }
);

// Land group
const landSchema = new mongoose.Schema(
  {
    plotArea: { type: Number, min: 0 }, // sqm
    frontage: { type: Number, min: 0 }, // meters
    zoning: {
      type: String,
      enum: ["residential", "commercial", "agricultural", "industrial"],
    },
    cornerLot: { type: Boolean, default: false },
  },
  { _id: false }
);

// Commercial group (shop/office/warehouse)
const commercialSchema = new mongoose.Schema(
  {
    floorArea: { type: Number, min: 0 }, // sqm
    frontage: { type: Number, min: 0 }, // meters
    licenseType: {
      type: String,
      enum: ["retail", "office", "restaurant", "warehouse", "clinic", "other"],
    },
    hasMezz: { type: Boolean, default: false },
    parkingSpots: { type: Number, min: 0 },
  },
  { _id: false }
);

// Whole building group
const buildingSchema = new mongoose.Schema(
  {
    totalFloors: { type: Number, min: 0 },
    totalUnits: { type: Number, min: 0 },
    elevator: { type: Boolean, default: false },
    landArea: { type: Number, min: 0 }, // sqm
    buildYear: { type: Number, min: 1800, max: new Date().getFullYear() },
  },
  { _id: false }
);

// Other (fallback) group
const otherSchema = new mongoose.Schema(
  {
    size: { type: Number, min: 0 }, // optional generic size
  },
  { _id: false }
);

const listingSchema = new mongoose.Schema(
  {
    // Core shared fields
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },

    // Keep a human-readable display string for compatibility (e.g., "Cairo - New Cairo (Near ...)")
    address: { type: String, default: "" },

    price: { type: Number, required: true, min: 0 },

    // Purpose and category drive which groups are relevant
    purpose: { type: String, required: true, enum: ["rent", "sale"] },
    category: {
      type: String,
      required: true,
      enum: [
        "apartment",
        "villa",
        "duplex",
        "studio",
        "land",
        "shop",
        "office",
        "warehouse",
        "building",
        "other",
      ],
    },

    // Images (at least one)
    images: {
      type: [String],
      required: true,
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: "At least one image is required",
      },
    },

    // User reference (keep as String for now to avoid breaking changes)
    userRef: { type: String, required: true },

    // Normalized location object (for searching & filtering)
    location: { type: locationSchema, required: true },

    // Optional groups by category (only fill what applies)
    residential: { type: residentialSchema, default: undefined },
    land: { type: landSchema, default: undefined },
    commercial: { type: commercialSchema, default: undefined },
    building: { type: buildingSchema, default: undefined },
    other: { type: otherSchema, default: undefined },
  },
  { timestamps: true }
);

// Helpful indexes for common queries
listingSchema.index({ purpose: 1, category: 1 });
listingSchema.index({ "location.governorate.slug": 1 });
listingSchema.index({ "location.city.slug": 1 });
listingSchema.index({ price: 1 });

const Listing =
  mongoose.models.Listing || mongoose.model("Listing", listingSchema);

export default Listing;
