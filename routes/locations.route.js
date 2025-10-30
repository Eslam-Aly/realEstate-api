// routes/locations.route.js
import express from "express";
import {
  getGovernorates,
  getGovernorateCities,
  getGovernorateAreas,
  getGovernorateSubareas,
  getGovernorateTree,
} from "../controllers/locations.controller.js";

const router = express.Router();

router.get("/governorates", getGovernorates);
router.get("/governorates/:govSlug/cities", getGovernorateCities);
router.get(
  "/governorates/:govSlug/cities/:citySlug/areas",
  getGovernorateAreas
);
router.get(
  "/governorates/:govSlug/cities/:citySlug/areas/:areaSlug/subareas",
  getGovernorateSubareas
);
router.get("/governorates/:govSlug/tree", getGovernorateTree);

export default router;
