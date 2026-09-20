import { defineConfig } from "vitest/config";
export default defineConfig({ test: { include: ["test/**/*.test.js"], testTimeout: 60000, hookTimeout: 120000, fileParallelism: false, env: { SEARCH_BACKEND: "local", MONGODB_URI: "", LOG_LEVEL: "silent", REFUSAL_THRESHOLD: "0.5" } } });
