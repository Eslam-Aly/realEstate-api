// models/Location.js
import mongoose from "mongoose";

const citySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    popular: { type: Boolean, default: false },
  },
  { _id: false }
);

const locationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    sort: { type: Number, default: 0 },
    cities: { type: [citySchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("Location", locationSchema);
