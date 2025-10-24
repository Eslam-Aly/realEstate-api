import mongoose from "mongoose";
import Favorite from "../models/favorite.model.js";
import Listing from "../models/listing.model.js";

/**
 * Normalises the authenticated user id regardless of the token payload shape.
 */
const getUid = (req) => req.user?.id || req.user?._id;

/**
 * Adds (or keeps) a listing in the caller's favourites.
 */
export const addFavorite = async (req, res) => {
  try {
    const rawUserId = getUid(req);
    if (!rawUserId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!mongoose.Types.ObjectId.isValid(req.params.listingId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid listing id" });
    }
    const userId = new mongoose.Types.ObjectId(rawUserId);
    const listingId = new mongoose.Types.ObjectId(req.params.listingId);

    // Optional: ensure listing exists
    const exists = await Listing.exists({ _id: listingId });
    if (!exists)
      return res
        .status(404)
        .json({ success: false, message: "Listing not found" });

    await Favorite.updateOne(
      { userId, listingId },
      { $setOnInsert: { userId, listingId } },
      { upsert: true }
    );

    res.json({ success: true });
  } catch (e) {
    // Handle unique constraint etc.
    res
      .status(500)
      .json({ success: false, message: e.message || "Failed to add favorite" });
  }
};

/**
 * Removes a favourite listing for the current user.
 */
export const removeFavorite = async (req, res) => {
  try {
    const rawUserId = getUid(req);
    if (!rawUserId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!mongoose.Types.ObjectId.isValid(req.params.listingId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid listing id" });
    }
    const userId = new mongoose.Types.ObjectId(rawUserId);
    const listingId = new mongoose.Types.ObjectId(req.params.listingId);
    await Favorite.deleteOne({ userId, listingId });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: e.message || "Failed to remove favorite",
    });
  }
};

/**
 * Returns just the listing ids that the caller has favourited.
 * Useful for hydrating the client-side store quickly.
 */
export const listFavoriteIds = async (req, res) => {
  try {
    const rawUserId = getUid(req);
    if (!rawUserId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const userId = new mongoose.Types.ObjectId(rawUserId);
    const rows = await Favorite.find({ userId }).select("listingId");
    res.json(rows.map((r) => String(r.listingId)));
  } catch (e) {
    res.status(500).json({
      success: false,
      message: e.message || "Failed to load favorites",
    });
  }
};

/**
 * Returns the full listing documents for the caller's favourites.
 * Supports simple pagination via `page` and `limit` query params.
 */
export const listFavorites = async (req, res) => {
  try {
    const rawUserId = getUid(req);
    if (!rawUserId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const userId = new mongoose.Types.ObjectId(rawUserId);
    const limit = Math.min(Number(req.query.limit) || 24, 60);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      Favorite.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("listingId"),
      Favorite.countDocuments({ userId }),
    ]);

    res.json({
      results: rows.map((r) => r.listingId).filter(Boolean),
      total,
      page,
      limit,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: e.message || "Failed to load favorites",
    });
  }
};
