// Runs before every test file (see vitest.config.ts). Vitest is used without
// globals, so Testing Library's automatic cleanup has to be wired up by hand.
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// The app's i18n module (and the Redux slices) read localStorage the moment
// they are first imported, so English is forced before any test file gets to
// import them. Assertions on visible text use the English strings.
localStorage.setItem("appLanguage", "en");

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("appLanguage", "en");
  // No test may reach the real backend. A test that needs the network replaces
  // this with its own stub (see fetchStub.ts); anything else fails loudly here.
  vi.stubGlobal("fetch", (input: RequestInfo | URL) => {
    const url = input instanceof Request ? input.url : String(input);
    return Promise.reject(new Error(`Unexpected network request in a test: ${url}`));
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
