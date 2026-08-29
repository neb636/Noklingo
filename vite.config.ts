import { defineConfig } from "vite";
import vinext from "vinext";

export default defineConfig({
  plugins: [vinext()],
  // Hooks must always resolve through the same React dispatcher, including
  // after vinext/Vite dependency optimization and hot reloads.
  resolve: { dedupe: ["react", "react-dom"] },
});
