import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
    // Proxy /api requests to Express during development
    // This avoids CORS issues entirely in dev — the browser thinks it's same-origin
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (id.includes("@radix-ui") || id.includes("cmdk") || id.includes("vaul")) {
            return "ui-kit";
          }

          if (id.includes("framer-motion") || id.includes("lucide-react")) {
            return "motion-icons";
          }

          if (id.includes("recharts")) {
            return "charts";
          }

          if (id.includes("axios") || id.includes("zod") || id.includes("date-fns")) {
            return "data-utils";
          }
        },
      },
    },
  },
}));
