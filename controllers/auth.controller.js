import User from "../models/user.model.js";
import bcryptjs from "bcryptjs";
import errorHandler from "../utils/error.js";
import jwt from "jsonwebtoken";

export const signup = async (req, res, next) => {
  const { username, email, password } = req.body;
  const hashedPassword = bcryptjs.hashSync(password, 10);
  const newUser = new User({ username, email, password: hashedPassword });
  try {
    await newUser.save();
    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    next(error);
  }
};

export const signin = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const isValidUser = await User.findOne({ email });
    if (!isValidUser) {
      return next(errorHandler(404, "user not found!"));
    }
    const isPasswordValid = bcryptjs.compareSync(
      password,
      isValidUser.password
    );
    if (!isPasswordValid) {
      return next(errorHandler(401, "Invalid email or password!"));
    }
    const token = jwt.sign({ id: isValidUser._id }, process.env.JWT_SECRET);
    res
      .cookie("access_token", token, { httpOnly: true })
      .status(200)
      .json({ message: "Signin successful" });
  } catch (error) {
    next(error);
  }
};
