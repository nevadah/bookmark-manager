import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        sidebar: resolve(__dirname, "src/sidebar/main.tsx"),
        background: resolve(__dirname, "src/background/index.ts"),
      },
      output: {
        entryFileNames: "[name]/index.js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "[name]/[name][extname]",
      },
    },
  },
});
