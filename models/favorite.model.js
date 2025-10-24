import mongoose, { Schema } from "mongoose";

const FavoriteSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    listingId: { type: Schema.Types.ObjectId, ref: "Listing", required: true },
  },
  { timestamps: true }
);

// One favorite per (user, listing)
FavoriteSchema.index({ userId: 1, listingId: 1 }, { unique: true });

// Common queries
FavoriteSchema.index({ userId: 1, createdAt: -1 });
FavoriteSchema.index({ listingId: 1 });

export default mongoose.model("Favorite", FavoriteSchema);
