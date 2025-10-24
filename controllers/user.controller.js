import bcryptjs from "bcryptjs";

import User from "../models/user.model.js";
import errorHandler from "../utils/error.js";
import Listing from "../models/listing.model.js";

/**
 * Public endpoint: fetches limited public user info (username, avatar, createdAt).
 */

export const getUserPublic = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select(
      "username avatar createdAt"
    );
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

/**
 * Basic health check route to confirm the user router is mounted.
 */
export const test = (req, res) => {
  res.json({ message: "api route is working" });
};

/**
 * Allows a user to update their own profile. Supports username/email/password/avatar.
 * Hashes the password if provided before persisting it.
 */
export const updateUser = async (req, res, next) => {
  if (req.user.id !== req.params.id)
    return next(errorHandler(403, "You can update only your account!"));
  try {
    if (req.body.password) {
      req.body.password = bcryptjs.hashSync(req.body.password, 10);
    }
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          username: req.body.username,
          email: req.body.email,
          password: req.body.password,
          avatar: req.body.avatar,
        },
      },
      { new: true }
    );
    const { password, ...rest } = updatedUser._doc;
    res.status(200).json(rest);
  } catch (error) {
    next(error);
  }
};

/**
 * Deletes the authenticated user's account and clears the auth cookie.
 */
export const deleteUser = async (req, res, next) => {
  if (req.user.id !== req.params.id)
    return next(errorHandler(401, "You can delete only your account!"));
  try {
    await User.findByIdAndDelete(req.params.id);
    res.clearCookie("access_token");
    res.status(200).json("User has been deleted.");
  } catch (error) {
    next(error);
  }
};

/**
 * Lists all listings that belong to the authenticated user.
 * Accepts either `:id` param or defaults to the token's user id.
 */
export const getUserListings = async (req, res, next) => {
  try {
    const userId = req.params.id || req.user.id;

    if (req.user.id !== userId) {
      return next(errorHandler(401, "You can access only your listings!"));
    }

    const listings = await Listing.find({ userRef: userId });
    res.status(200).json(listings);
  } catch (error) {
    next(error);
  }
};
