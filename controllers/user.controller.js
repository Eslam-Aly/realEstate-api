import bcryptjs from "bcryptjs";

import User from "../models/User.model.js";
import errorHandler from "../utils/error.js";
import Listing from "../models/Listing.model.js";

export const test = (req, res) => {
  res.json({ message: "api route is working" });
};

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
