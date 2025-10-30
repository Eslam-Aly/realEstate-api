import Location from "../models/locations.model.js";

/**
 * Helpers
 */
function langProject(item, lang = "both") {
  if (!item) return item;

  const englishName = item.name;
  const arabicName = item.nameAr;
  const base = { slug: item.slug };

  if (lang === "en") {
    return {
      ...base,
      name: englishName || arabicName || "",
      nameAr: arabicName,
    };
  }

  if (lang === "ar") {
    return {
      ...base,
      name: arabicName || englishName || "",
      nameEn: englishName,
    };
  }

  return {
    ...base,
    name: englishName || "",
    nameAr: arabicName || "",
  };
}

function dedupeBySlug(arr = []) {
  const seen = new Set();
  const out = [];
  for (const item of arr) {
    const slug = item?.slug;
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push(item);
  }
  return out;
}

function getLang(req) {
  const lang = (req.query.lang || "both").toLowerCase();
  return ["en", "ar", "both"].includes(lang) ? lang : "both";
}

export const getGovernorates = async (req, res) => {
  const lang = getLang(req);
  const q = (req.query.q || "").trim();
  const filter = {};

  if (q) {
    filter.$or = [
      { name: new RegExp(q, "i") },
      { nameAr: new RegExp(q, "i") },
      { slug: new RegExp(q.replace(/\s+/g, "-").toLowerCase(), "i") },
    ];
  }

  const govsRaw = await Location.find(filter, "name nameAr slug sort")
    .sort({ sort: 1, name: 1 })
    .lean();

  const uniqueGovs = [];
  const seen = new Set();
  for (const gov of govsRaw) {
    if (seen.has(gov.slug)) continue;
    seen.add(gov.slug);
    uniqueGovs.push(gov);
  }

  res.json(
    uniqueGovs.map((g) => ({
      ...langProject(g, lang),
      sort: g.sort,
    }))
  );
};

export const getGovernorateCities = async (req, res) => {
  const lang = getLang(req);
  const doc = await Location.findOne(
    { slug: req.params.govSlug },
    "name nameAr slug cities"
  ).lean();

  if (!doc) return res.status(404).json({ message: "Governorate not found" });

  const cities = dedupeBySlug(doc.cities || [])
    .map((c) => ({
      ...langProject(c, lang),
      popular: !!c.popular,
    }))
    .sort((a, b) => {
      const A = (a.name || a.nameAr || "").toString();
      const B = (b.name || b.nameAr || "").toString();
      return A.localeCompare(B, "en", { sensitivity: "base" });
    });

  res.json({
    governorate: langProject(doc, lang),
    count: cities.length,
    cities,
  });
};

export const getGovernorateAreas = async (req, res) => {
  const lang = getLang(req);
  const { govSlug, citySlug } = req.params;

  const doc = await Location.findOne(
    { slug: govSlug, "cities.slug": citySlug },
    { "cities.$": 1, name: 1, nameAr: 1, slug: 1 }
  ).lean();

  if (!doc || !doc.cities?.length)
    return res.status(404).json({ message: "City not found in governorate" });

  const city = doc.cities[0];

  const areas = dedupeBySlug(city.areas || [])
    .map((a) => langProject(a, lang))
    .sort((a, b) => {
      const A = (a.name || a.nameAr || "").toString();
      const B = (b.name || b.nameAr || "").toString();
      return A.localeCompare(B, "en", { sensitivity: "base" });
    });

  res.json({
    governorate: langProject(
      { name: doc.name, nameAr: doc.nameAr, slug: doc.slug },
      lang
    ),
    city: langProject(city, lang),
    count: areas.length,
    areas,
  });
};

export const getGovernorateSubareas = async (req, res) => {
  const lang = getLang(req);
  const { govSlug, citySlug, areaSlug } = req.params;

  const doc = await Location.findOne(
    {
      slug: govSlug,
      "cities.slug": citySlug,
      "cities.areas.slug": areaSlug,
    },
    {
      name: 1,
      nameAr: 1,
      slug: 1,
      "cities.$": 1,
    }
  ).lean();

  if (!doc || !doc.cities?.length)
    return res.status(404).json({ message: "Area not found" });

  const city = doc.cities[0];
  const area = (city.areas || []).find((a) => a.slug === areaSlug);
  if (!area) return res.status(404).json({ message: "Area not found" });

  const subareas = dedupeBySlug(area.subareas || [])
    .map((a) => langProject(a, lang))
    .sort((a, b) => {
      const A = (a.name || a.nameAr || "").toString();
      const B = (b.name || b.nameAr || "").toString();
      return A.localeCompare(B, "en", { sensitivity: "base" });
    });

  res.json({
    governorate: langProject(
      { name: doc.name, nameAr: doc.nameAr, slug: doc.slug },
      lang
    ),
    city: langProject(city, lang),
    area: langProject(area, lang),
    count: subareas.length,
    subareas,
  });
};

export const getGovernorateTree = async (req, res) => {
  const lang = getLang(req);
  const doc = await Location.findOne(
    { slug: req.params.govSlug },
    "name nameAr slug sort cities"
  ).lean();

  if (!doc) return res.status(404).json({ message: "Governorate not found" });

  const shaped = {
    ...langProject(doc, lang),
    sort: doc.sort,
    cities: dedupeBySlug(doc.cities || []).map((c) => ({
      ...langProject(c, lang),
      popular: !!c.popular,
      areas: dedupeBySlug(c.areas || []).map((a) => ({
        ...langProject(a, lang),
        subareas: dedupeBySlug(a.subareas || []).map((s) => langProject(s, lang)),
      })),
    })),
  };

  res.json(shaped);
};
