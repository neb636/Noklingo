import { defineConfig } from "vite";
import vinext from "vinext";

export default defineConfig({
  plugins: [vinext()],
  // Hooks must always resolve through the same React dispatcher, including
  // after vinext/Vite dependency optimization and hot reloads.
  resolve: { dedupe: ["react", "react-dom"] },
  server: {
    // Vinext requests global CSS both as a stylesheet and as a JavaScript
    // module during Pages Router hydration. Keep those response variants out
    // of the same browser cache entry (Firefox enforces the module MIME type).
    headers: { Vary: "Origin, Accept, Sec-Fetch-Dest" },
  },
});
