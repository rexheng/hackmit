import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import {localYZFPlugin} from './local-model-assets.js';

export default defineConfig({
  plugins: [react(), tailwind(), localYZFPlugin()],
  server: { proxy: { "/api/vehicles": "http://127.0.0.1:3001", "/api": "http://localhost:3000", "/manuals": "http://localhost:3000" } },
  build: { outDir: "dist", chunkSizeWarningLimit: 1500 },
});
