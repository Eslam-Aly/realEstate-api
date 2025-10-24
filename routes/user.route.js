import express from "express";
import {
  test,
  updateUser,
  deleteUser,
  getUserListings,
  getUserPublic,
} from "../controllers/user.controller.js";
import { verifyToken } from "../utils/verifyUser.js";

const router = express.Router();

// Example route
router.get("/test", test);
router.post("/update/:id", verifyToken, updateUser);
router.delete("/delete/:id", verifyToken, deleteUser);
router.get("/listings", verifyToken, getUserListings);
router.get("/listings/:id", verifyToken, getUserListings);
router.get("/public/:id", getUserPublic);

export default router;
