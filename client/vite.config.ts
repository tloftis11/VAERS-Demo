import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
    fs: {
      // Allow importing shared/src from outside the client project root.
      allow: [path.resolve(__dirname, ".."), path.resolve(__dirname)],
    },
  },
});
