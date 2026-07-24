import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";

// Build config for the standalone, backend-free physics demo that is published
// to GitHub Pages. The main app (index.html) requires the Telegram Mini App
// runtime + backend and is intentionally not part of this build.
export default defineConfig({
  base: "/TG_bot_game/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist-demo",
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, "demo.html"),
    },
  },
});
