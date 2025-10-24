import Listing from "../models/listing.model.js";
import SuggestedArea from "../models/suggestedArea.model.js";
import errorHandler from "../utils/error.js";
import mongoose from "mongoose";

/* -------------------------------------------------------------------------- */
/*                             helpers & constants                            */
/* -------------------------------------------------------------------------- */

const RESIDENTIAL_CATEGORIES = new Set([
  "apartment",
  "villa",
  "duplex",
  "studio",
]);
const COMMERCIAL_CATEGORIES = new Set(["shop", "office", "warehouse"]);

/**
 * Coerces a numeric field, returning `undefined` when the value is empty.
 */
const numOrUndef = (v) =>
  v === null || v === undefined || v === "" ? undefined : Number(v);
/**
 * Coerces a boolean field, returning `undefined` when the value is empty.
 */
const boolOrUndef = (v) =>
  v === null || v === undefined ? undefined : Boolean(v);
/**
 * Coerces a string field, returning `undefined` when the value is empty.
 */
const strOrUndef = (v) =>
  v === null || v === undefined || v === "" ? undefined : String(v);

/**
 * Builds the nested sub-document payload for the selected category so the
 * listing schema receives only the relevant fields.
 */
function buildSubdocsByCategory(category, body) {
  const out = {
    residential: undefined,
    land: undefined,
    commercial: undefined,
    building: undefined,
    other: undefined,
  };

  if (RESIDENTIAL_CATEGORIES.has(category)) {
    out.residential = {
      size: numOrUndef(body.size),
      bedrooms: numOrUndef(body.bedrooms),
      bathrooms: numOrUndef(body.bathrooms),
      floor: numOrUndef(body.floor),
      furnished: boolOrUndef(body.furnished),
      parking: boolOrUndef(body.parking),
      landArea: numOrUndef(body.landArea),
    };
  } else if (category === "land") {
    out.land = {
      plotArea: numOrUndef(body.plotArea),
      frontage: numOrUndef(body.frontage),
      zoning: strOrUndef(body.zoning),
      cornerLot: boolOrUndef(body.cornerLot),
    };
  } else if (COMMERCIAL_CATEGORIES.has(category)) {
    out.commercial = {
      floorArea: numOrUndef(body.floorArea),
      frontage: numOrUndef(body.frontage),
      licenseType: strOrUndef(body.licenseType),
      hasMezz: boolOrUndef(body.hasMezz),
      parkingSpots: numOrUndef(body.parkingSpots),
    };
  } else if (category === "building") {
    out.building = {
      totalFloors: numOrUndef(body.totalFloors),
      totalUnits: numOrUndef(body.totalUnits),
      elevator: boolOrUndef(body.elevator),
      landArea: numOrUndef(body.landArea),
      buildYear: numOrUndef(body.buildYear),
    };
  } else if (category === "other") {
    out.other = {
      size: numOrUndef(body.size),
    };
  }
  // drop empty groups
  for (const k of Object.keys(out))
    if (out[k] && Object.values(out[k]).every((v) => v === undefined))
      out[k] = undefined;
  return out;
}

/**
 * Validates that the request payload includes the full location object.
 */
function requireLocation(loc) {
  if (!loc?.governorate?.slug || !loc?.governorate?.name)
    return "Governorate is required";
  if (!loc?.city?.slug || !loc?.city?.name) return "City is required";
  return null;
}

/**
 * Generates the legacy `address` string used throughout the UI from the
 * normalised location object.
 */
function composeAddressDisplay(loc) {
  const extra =
    loc.city.slug === "other" && loc.city_other_text
      ? ` (${loc.city_other_text})`
      : "";
  return `${loc.governorate.name} - ${loc.city.name}${extra}`;
}

/* --------------------------------- CREATE --------------------------------- */
/**
 * Creates a new listing and attaches the authenticated user as owner.
 */
export const createListing = async (req, res, next) => {
  try {
    const {
      title,
      description,
      price,
      purpose, // "rent" | "sale"
      category, // e.g., "apartment" | "land" | "shop" | "building" | "other"
      images, // array of URLs
      location, // { governorate:{slug,name}, city:{slug,name}, city_other_text? }
      // plus flat fields for the group (size, bedrooms, plotArea, floorArea, etc.)
    } = req.body;

    const negotiable =
      req.body.negotiable === true || req.body.negotiable === "true";

    // required checks
    if (!title || !description || price == null || !purpose || !category) {
      return next(errorHandler(400, "Missing required fields"));
    }

    // attach the authenticated user if available
    const userRef = req.user?.id
      ? String(req.user.id)
      : strOrUndef(req.body.userRef);
    if (!userRef) return next(errorHandler(400, "User is required"));

    const locErr = requireLocation(location);
    if (locErr) return next(errorHandler(400, locErr));
    // Ensure at least one image (default fallback)
    const defaultImage =
      process.env.DEFAULT_LISTING_IMAGE_URL || "/placeholder.jpg";
    const imageArray =
      Array.isArray(images) && images.length > 0 ? images : [defaultImage];

    const groups = buildSubdocsByCategory(category, req.body);
    const addressDisplay = composeAddressDisplay(location);

    const doc = await Listing.create({
      title: String(title).trim(),
      description: String(description).trim(),
      price: Number(price),
      purpose,
      category,
      images: imageArray,
      userRef,
      negotiable,
      address: addressDisplay,
      location: {
        governorate: {
          slug: location.governorate.slug.toLowerCase(),
          name: location.governorate.name,
        },
        city: {
          slug: location.city.slug.toLowerCase(),
          name: location.city.name,
        },
        city_other_text:
          location.city.slug === "other" ? location.city_other_text || "" : "",
      },
      ...groups,
    });

    // fire-and-forget: log suggested areas when city is "other"
    if (location?.city?.slug === "other" && location?.city_other_text) {
      const raw = String(location.city_other_text).trim();
      const cleaned = raw
        .replace(/\s+/g, " ")
        .replace(/^[,\.\-_/\\]+|[,\.\-_/\\]+$/g, "");
      if (cleaned.length >= 2) {
        SuggestedArea.updateOne(
          {
            governorateSlug: location.governorate.slug.toLowerCase(),
            name: cleaned.toLowerCase(),
          },
          {
            $setOnInsert: {
              governorateName: location.governorate.name,
              displayName: cleaned,
              source: "listing",
            },
          },
          { upsert: true }
        ).catch((e) => console.warn("SuggestedArea upsert failed:", e.message));
      }
    }

    return res.status(201).json({ listing: doc });
  } catch (error) {
    next(error);
  }
};

/* --------------------------------- DELETE --------------------------------- */
/**
 * Deletes a listing owned by the authenticated user.
 */
export const deleteListing = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return next(errorHandler(404, "Listing not found"));

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

/* --------------------------------- UPDATE --------------------------------- */
/**
 * Updates an existing listing owned by the authenticated user.
 */
export const updateListing = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return next(errorHandler(400, "Invalid listing ID format"));
    }
    const listing = await Listing.findById(req.params.id);
    if (!listing) return next(errorHandler(404, "Listing not found"));

    if (listing.userRef !== req.user.id) {
      return next(
        errorHandler(403, "You are not allowed to update this listing")
      );
    }

    const payload = { ...req.body };

    if (typeof payload.negotiable !== "undefined") {
      payload.negotiable =
        payload.negotiable === true || payload.negotiable === "true";
    }

    // if location provided, validate + compose address
    if (payload.location) {
      const locErr = requireLocation(payload.location);
      if (locErr) return next(errorHandler(400, locErr));
      payload.address = composeAddressDisplay(payload.location);
      payload.location = {
        governorate: {
          slug: payload.location.governorate.slug.toLowerCase(),
          name: payload.location.governorate.name,
        },
        city: {
          slug: payload.location.city.slug.toLowerCase(),
          name: payload.location.city.name,
        },
        city_other_text:
          payload.location.city.slug === "other"
            ? payload.location.city_other_text || ""
            : "",
      };
    }

    // if category provided, rebuild groups accordingly
    if (payload.category) {
      const groups = buildSubdocsByCategory(payload.category, payload);
      Object.assign(payload, groups);
    }

    // Ensure at least one image when updating (if client sends empty array)
    if (payload.images) {
      const defaultImage =
        process.env.DEFAULT_LISTING_IMAGE_URL || "/placeholder.jpg";
      if (Array.isArray(payload.images) && payload.images.length === 0) {
        payload.images = [defaultImage];
      }
    }

    const updatedListing = await Listing.findByIdAndUpdate(
      req.params.id,
      payload,
      { new: true, runValidators: true }
    );
    return res.status(200).json({ updatedListing });
  } catch (error) {
    next(error);
  }
};

/* ----------------------------------- GET ---------------------------------- */
/**
 * Returns a single listing by id.
 */
export const getListing = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return next(errorHandler(400, "Invalid listing ID format"));
    }
    const listing = await Listing.findById(req.params.id);
    if (!listing) return next(errorHandler(404, "Listing not found"));
    return res.status(200).json(listing);
  } catch (error) {
    next(error);
  }
};

/* --------------------------------- GET MANY -------------------------------- */
/**
 * Provides a filtered, paginated list of listings for search/browse screens.
 */
export const getListings = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 12;
    const startIndex = parseInt(req.query.startIndex) || 0;
    const sort = req.query.sort || "createdAt";
    const order = (req.query.order || "desc").toLowerCase() === "desc" ? -1 : 1;

    const filter = {};
    const andClauses = [];

    // free text (Level 1: MongoDB text index)
    const term = (req.query.searchTerm || "").trim();
    const usingTextSearch = Boolean(term);
    if (usingTextSearch) {
      // Use $text to leverage the weighted text index
      filter.$text = { $search: term };
    }

    // purpose & category
    if (req.query.purpose) filter.purpose = req.query.purpose;
    if (req.query.category) filter.category = req.query.category;

    // location
    if (req.query.gov)
      filter["location.governorate.slug"] = String(req.query.gov).toLowerCase();
    if (req.query.city)
      filter["location.city.slug"] = String(req.query.city).toLowerCase();

    // price range
    const min = req.query.min != null ? Number(req.query.min) : undefined;
    const max = req.query.max != null ? Number(req.query.max) : undefined;
    if (min != null || max != null) {
      filter.price = {};
      if (min != null) filter.price.$gte = min;
      if (max != null) filter.price.$lte = max;
    }

    // residential attribute ranges
    const minBeds =
      req.query.minBedrooms != null ? Number(req.query.minBedrooms) : undefined;
    const maxBeds =
      req.query.maxBedrooms != null ? Number(req.query.maxBedrooms) : undefined;
    const minBaths =
      req.query.minBathrooms != null
        ? Number(req.query.minBathrooms)
        : undefined;
    const maxBaths =
      req.query.maxBathrooms != null
        ? Number(req.query.maxBathrooms)
        : undefined;
    const minSize =
      req.query.minSize != null ? Number(req.query.minSize) : undefined;
    const maxSize =
      req.query.maxSize != null ? Number(req.query.maxSize) : undefined;

    if (req.query.furnished === "true") filter["residential.furnished"] = true;
    if (req.query.parking === "true") filter["residential.parking"] = true;

    if (req.query.bedrooms) {
      filter["residential.bedrooms"] = Number(req.query.bedrooms);
    } else if (minBeds != null || maxBeds != null) {
      const range = {};
      if (minBeds != null) range.$gte = minBeds;
      if (maxBeds != null) range.$lte = maxBeds;
      filter["residential.bedrooms"] = range;
    }

    if (req.query.bathrooms) {
      filter["residential.bathrooms"] = Number(req.query.bathrooms);
    } else if (minBaths != null || maxBaths != null) {
      const range = {};
      if (minBaths != null) range.$gte = minBaths;
      if (maxBaths != null) range.$lte = maxBaths;
      filter["residential.bathrooms"] = range;
    }

    if (minSize != null || maxSize != null) {
      const sizeRange = {};
      if (minSize != null) sizeRange.$gte = minSize;
      if (maxSize != null) sizeRange.$lte = maxSize;

      andClauses.push({
        $or: [
          { "residential.size": sizeRange },
          { "land.plotArea": sizeRange },
          { "commercial.floorArea": sizeRange },
          { "building.landArea": sizeRange },
          { "other.size": sizeRange },
        ],
      });
    }

    if (andClauses.length) {
      filter.$and = andClauses;
    }

    // If using text, include score and sort by relevance first, then secondary sort
    const projection = usingTextSearch
      ? { score: { $meta: "textScore" } }
      : undefined;

    let query = Listing.find(filter, projection);
    if (usingTextSearch) {
      // Relevance first, then requested sort (e.g., createdAt desc)
      query = query.sort({ score: { $meta: "textScore" }, [sort]: order });
    } else {
      query = query.sort({ [sort]: order });
    }

    const listings = await query.skip(startIndex).limit(limit);

    return res.status(200).json(listings);
  } catch (error) {
    next(error);
  }
};
