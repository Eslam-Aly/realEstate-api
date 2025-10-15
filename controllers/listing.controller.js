import Listing from "../models/listing.model.js";
import errorHandler from "../utils/error.js";
import mongoose from "mongoose";

export const createListing = async (req, res, next) => {
  try {
    const listing = await Listing.create(req.body);
    return res.status(201).json({ listing });
  } catch (error) {
    next(error);
  }
};

export const deleteListing = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return next(errorHandler(404, "Listing not found"));
    }

    if (listing.userRef !== req.user.id) {
      return next(
        errorHandler(403, "You are not allowed to delete this listing")
      );
    }

    await Listing.findByIdAndDelete(req.params.id);
    return res.status(200).json({ message: "Listing deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const updateListing = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return next(errorHandler(400, "Invalid listing ID format"));
    }
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return next(errorHandler(404, "Listing not found"));
    }

    if (listing.userRef !== req.user.id) {
      return next(
        errorHandler(403, "You are not allowed to update this listing")
      );
    }

    const updatedListing = await Listing.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    return res.status(200).json({ updatedListing });
  } catch (error) {
    next(error);
  }
};

export const getListing = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return next(errorHandler(400, "Invalid listing ID format"));
    }
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return next(errorHandler(404, "Listing not found"));
    }
    return res.status(200).json(listing);
  } catch (error) {
    next(error);
  }
};

export const getListings = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 12;
    const startIndex = parseInt(req.query.startIndex) || 0;
    const sort = req.query.sort || "createdAt";
    const order = (req.query.order || "desc").toLowerCase() === "desc" ? -1 : 1;

    const filter = {};
    const term = (req.query.searchTerm || "").trim();
    if (term) filter.title = { $regex: term, $options: "i" };

    if (req.query.furnished === "true") filter.furnished = true;
    if (req.query.parking === "true") filter.parking = true;

    if (typeof req.query.type === "string" && req.query.type !== "false") {
      filter.type = req.query.type; // "rent" | "sale"
    }

    const listings = await Listing.find(filter)
      .sort({ [sort]: order })
      .skip(startIndex)
      .limit(limit);

    return res.status(200).json(listings);
  } catch (error) {
    next(error);
  }
};
