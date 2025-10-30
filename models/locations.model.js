// models/locations.model.js
import mongoose from "mongoose";

// --- Helpers ---------------------------------------------------------------
const uniqueByField = (field) => {
  return {
    validator: function (arr) {
      if (!Array.isArray(arr)) return true;
      const seen = new Set();
      for (const item of arr) {
        const val = item?.[field];
        if (!val) continue; // required handled by schema
        if (seen.has(val)) return false;
        seen.add(val);
      }
      return true;
    },
    message: (props) => `Duplicate ${field} detected in ${props.path}`,
  };
};

// --- Subarea --------------------------------------------------------------
const subAreaSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    nameAr: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
  },
  { _id: false }
);

// --- Area -----------------------------------------------------------------
const areaSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    nameAr: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    subareas: {
      type: [subAreaSchema],
      default: [],
      validate: uniqueByField("slug"),
    },
  },
  { _id: false }
);

// --- City -----------------------------------------------------------------
const citySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    nameAr: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    popular: { type: Boolean, default: false },
    areas: {
      type: [areaSchema],
      default: [],
      validate: uniqueByField("slug"),
    },
  },
  { _id: false }
);

// --- Governorate / Location ----------------------------------------------
const locationSchema = new mongoose.Schema(
  {
    // Governorate bilingual name
    name: { type: String, required: true, trim: true },
    nameAr: { type: String, required: true, trim: true },

    // Governorate slug (unique across collection)
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    sort: { type: Number, default: 0 },

    // Cities list (bilingual + nested areas + nested subareas)
    cities: {
      type: [citySchema],
      default: [],
      validate: uniqueByField("slug"),
    },
  },
  { timestamps: true, versionKey: false }
);

// Helpful indexes for list ordering / lookups
locationSchema.index({ sort: 1, name: 1 });
locationSchema.index({ slug: 1 }, { unique: true });

export default mongoose.model("Location", locationSchema);
