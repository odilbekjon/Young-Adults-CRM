import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Kept apart from vite.config.ts on purpose: the tests have their own
// environment and nothing here may leak into the production build.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
    // The app is used in Uzbekistan (UTC+5, no DST). Running the whole suite in
    // that zone makes the "local calendar day vs. UTC day" tests meaningful:
    // between 00:00 and 05:00 local time toISOString() still reports the
    // previous day.
    env: { TZ: "Asia/Tashkent" },
    // Every test starts from a clean slate: spies restored, stubbed globals
    // (fetch) put back.
    restoreMocks: true,
    unstubGlobals: true,
  },
});
