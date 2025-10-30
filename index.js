import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import userRoute from "./routes/user.route.js";
import authRoute from "./routes/auth.route.js";
import cookieParser from "cookie-parser";
import listingsRoute from "./routes/listings.route.js";
import locationsRoute from "./routes/locations.route.js";
import favoriteRoute from "./routes/favorite.route.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cookieParser());

let mongoReady = false;

async function ensureMongo() {
  if (mongoReady || mongoose.connection.readyState === 1) return;
  try {
    await mongoose.connect(process.env.MONGO);
    mongoReady = true;
    console.log("MongoDB connected");
  } catch (err) {
    console.error("Failed to connect to MongoDB", err.message);
    throw err;
  }
}

// In serverless, make sure we have a connection for each invocation
app.use(async (req, res, next) => {
  try {
    await ensureMongo();
    next();
  } catch (e) {
    next(e);
  }
});

app.use("/api/user", userRoute);
app.use("/api/auth", authRoute);
app.use("/api/listings", listingsRoute);
app.use("/api/locations", locationsRoute);
app.use("/api/favorites", favoriteRoute);

// Health check route
app.get("/api/health", (_req, res) => {
  const mongoStatus =
    mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  res.json({
    ok: mongoStatus === "connected",
    message: "API is running",
    mongo: mongoStatus,
  });
});

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
  });
});

const shouldListen =
  process.env.NODE_ENV !== "test" && process.env.VERCEL !== "1";

if (shouldListen) {
  const PORT = process.env.PORT || 3000;
  ensureMongo()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`API server running on http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error("Failed to start server:", err.message);
      process.exit(1);
    });
}

export default app;
