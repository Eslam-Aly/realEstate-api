// models/SuggestedArea.js
import mongoose from "mongoose";

const suggestedAreaSchema = new mongoose.Schema(
  {
    governorateSlug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    governorateName: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true, lowercase: true }, // suggested area
    // optionally keep original casing if you want to display it later:
    displayName: { type: String, trim: true },
    source: { type: String, enum: ["listing"], default: "listing" }, // where it came from
  },
  { timestamps: true }
);

// Prevent duplicates per governorate (same normalized area name)
suggestedAreaSchema.index({ governorateSlug: 1, name: 1 }, { unique: true });

const SuggestedArea = mongoose.model("SuggestedArea", suggestedAreaSchema);
export default SuggestedArea;
