import Listing from "../../models/listing.model.js";

export function buildNormalizedLocation() {
  return {
    governorate: {
      slug: "cairo",
      name: "Cairo",
      nameAr: "القاهرة",
    },
    city: {
      slug: "new-cairo",
      name: "New Cairo",
      nameAr: "القاهرة الجديدة",
    },
    area: {
      slug: "fifth-settlement",
      name: "Fifth Settlement",
      nameAr: "التجمع الخامس",
    },
    city_other_text: "",
  };
}

export async function createListingDoc({ user, overrides = {} } = {}) {
  if (!user) {
    throw new Error("user is required to create a listing");
  }

  const location = overrides.location || buildNormalizedLocation();
  const listing = await Listing.create({
    title: overrides.title || "Test Listing",
    description: overrides.description || "Nice place",
    price: overrides.price || 1000,
    purpose: overrides.purpose || "rent",
    category: overrides.category || "apartment",
    images: overrides.images || ["https://example.com/image.jpg"],
    userRef: user._id.toString(),
    contact: overrides.contact || {
      phone: "+201012345678",
      whatsapp: true,
    },
    location,
    address:
      overrides.address ||
      `${location.governorate.name} - ${location.city.name}${
        location.area ? ` - ${location.area.name}` : ""
      }`,
    residential: overrides.residential || { size: 120, bedrooms: 2 },
    ...overrides,
  });

  return listing;
}
