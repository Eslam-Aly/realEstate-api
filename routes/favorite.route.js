import express from "express";
import {
  addFavorite,
  removeFavorite,
  listFavorites,
  listFavoriteIds,
} from "../controllers/favorite.controller.js";
// Adjust this import to whatever you use (verifyToken / verifyUser, etc.)
import { verifyToken } from "../utils/verifyUser.js";

const router = express.Router();

router.get("/", verifyToken, listFavorites);
router.get("/ids", verifyToken, listFavoriteIds);
router.post("/:listingId", verifyToken, addFavorite);
router.delete("/:listingId", verifyToken, removeFavorite);

export default router;
