import Location from "../../models/locations.model.js";

/**
 * Seeds a minimal governorate/city/area tree so listing normalization succeeds.
 */
export async function seedBasicLocation({
  governorate = {
    name: "Cairo",
    nameAr: "القاهرة",
    slug: "cairo",
  },
  city = {
    name: "New Cairo",
    nameAr: "القاهرة الجديدة",
    slug: "new-cairo",
  },
  area = {
    name: "Fifth Settlement",
    nameAr: "التجمع الخامس",
    slug: "fifth-settlement",
  },
} = {}) {
  return Location.create({
    ...governorate,
    cities: [
      {
        ...city,
        areas: [
          {
            ...area,
            subareas: Array.isArray(area.subareas) ? area.subareas : [],
          },
        ],
      },
    ],
  });
}
