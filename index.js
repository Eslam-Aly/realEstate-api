import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import userRoute from "./routees/user.route.js";
import authRoute from "./routees/auth.route.js";
dotenv.config();

const app = express();
app.use(express.json());

mongoose
  .connect(process.env.MONGO)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB", err.message);
  });

app.listen(3000, () => {
  console.log("API server running on http://localhost:3000");
});

//eslammahmud18_db_user
//92AUf7IWO6lwnrGk

app.use("/api/user", userRoute);
app.use("/api/auth", authRoute);

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
  });
});
