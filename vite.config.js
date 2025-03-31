import { defineConfig } from "vite";

export default defineConfig({
  root: "src",
  base: "/rtc-signaling/",
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: "../dist",
    assetsDir: "assets",
    emptyOutDir: true,
  },
});
