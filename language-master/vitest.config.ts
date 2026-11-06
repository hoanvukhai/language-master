import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["tests/**/*.ui.test.tsx"],
    globals: true,
    // Each reference-view case renders all 54 questions in jsdom.
    testTimeout: 15000,
  },
});
