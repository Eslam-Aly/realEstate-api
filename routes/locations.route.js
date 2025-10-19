// routes/locations.js
import express from "express";
import Location from "../models/locations.model.js";
const router = express.Router();

router.get("/governorates", async (req, res) => {
  const govs = await Location.find({}, "name slug sort").sort({
    sort: 1,
    name: 1,
  });
  res.json(govs);
});

router.get("/cities/:slug", async (req, res) => {
  const doc = await Location.findOne(
    { slug: req.params.slug },
    "cities name slug"
  );
  if (!doc) return res.status(404).json({ message: "Governorate not found" });
  res.json(doc.cities);
});

export default router;
