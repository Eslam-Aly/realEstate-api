import "./setupEnv.js";

import mongoose from "mongoose";
import { beforeAll, afterAll, afterEach, vi } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: { ip: "127.0.0.1" },
  });
  process.env.MONGO = mongoServer.getUri();
  await mongoose.connect(process.env.MONGO, {
    dbName: "aqardot-test",
  });
});

afterEach(async () => {
  if (mongoose.connection.readyState !== 1) return;
  const collections = mongoose.connection.collections;
  await Promise.all(
    Object.values(collections).map((collection) => collection.deleteMany({}))
  );
  vi.restoreAllMocks();
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase().catch(() => {});
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
});
