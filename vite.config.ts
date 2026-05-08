import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { copyFileSync } from "fs";

export default defineConfig(({ mode }) => ({
    plugins: [
        react(),
        {
            name: 'firefox-manifest',
            closeBundle() {
                if (mode === 'firefox') {
                    copyFileSync(
                        resolve(__dirname, 'public/manifest.firefox.json'),
                        resolve(__dirname, 'dist-firefox/manifest.json')
                    );
                }
            }
        }
    ],
    build: {
        outDir: mode === 'firefox' ? 'dist-firefox' : 'dist',
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
}));
