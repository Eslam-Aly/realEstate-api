import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setupTests.js"],
    hookTimeout: 30000,
  },
});
