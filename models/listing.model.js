import mongoose from "mongoose";

const listingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    address: { type: String, required: true },
    regularPrice: { type: Number, required: true },
    discountedPrice: { type: Number, required: true },
    bedrooms: { type: Number, required: true },
    bathrooms: { type: Number, required: true },
    parking: { type: Boolean, required: true },
    furnished: { type: Boolean, required: true },
    images: { type: [String], required: true },
    type: { type: String, required: true },
    offer: { type: Boolean, required: true },
    userRef: { type: String, required: true },
  },
  { timestamps: true }
);
const Listing =
  mongoose.models.Listing || mongoose.model("Listing", listingSchema);

export default Listing;
