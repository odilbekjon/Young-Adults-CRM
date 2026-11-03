import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isChunkLoadError, loadOrReload } from "../lazyPage";

const chunkError = () => new TypeError("Failed to fetch dynamically imported module: https://example.test/assets/Students-abc123.js");

beforeEach(() => sessionStorage.clear());
afterEach(() => vi.useRealTimers());

describe("isChunkLoadError", () => {
  it.each([
    ["Failed to fetch dynamically imported module: https://x/assets/a.js", true], // Chrome, Edge
    ["error loading dynamically imported module: https://x/assets/a.js", true], // Firefox
    ["Importing a module script failed.", true], // Safari
    ["Loading chunk 12 failed.", true],
    ["Cannot read properties of undefined (reading 'map')", false],
    ["Network request failed", false],
  ])("%s -> %s", (message, expected) => {
    expect(isChunkLoadError(new Error(message))).toBe(expected);
  });

  it("reads a thrown string too", () => {
    expect(isChunkLoadError("Importing a module script failed.")).toBe(true);
  });
});

describe("loadOrReload", () => {
  it("hands back what the import resolves with", async () => {
    const reload = vi.fn();
    await expect(loadOrReload(async () => "module", reload)).resolves.toBe("module");
    expect(reload).not.toHaveBeenCalled();
  });

  it("passes an ordinary error through without reloading", async () => {
    const reload = vi.fn();
    await expect(loadOrReload(() => Promise.reject(new Error("boom")), reload)).rejects.toThrow("boom");
    expect(reload).not.toHaveBeenCalled();
  });

  it("reloads the page once when a chunk can no longer be fetched, and never settles", async () => {
    const reload = vi.fn();
    let settled = false;
    void loadOrReload(() => Promise.reject(chunkError()), reload).then(
      () => { settled = true; },
      () => { settled = true; },
    );
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(reload).toHaveBeenCalledTimes(1);
    expect(settled).toBe(false);
    expect(Number(sessionStorage.getItem("chunkReloadAt"))).toBeGreaterThan(0);
  });

  it("reports the failure instead of reloading again right after a reload", async () => {
    vi.useFakeTimers();
    const reload = vi.fn();
    sessionStorage.setItem("chunkReloadAt", String(Date.now() - 5_000));

    await expect(loadOrReload(() => Promise.reject(chunkError()), reload)).rejects.toThrow("dynamically imported");
    expect(reload).not.toHaveBeenCalled();
  });

  it("reloads again once the cool-down has passed", async () => {
    vi.useFakeTimers();
    const reload = vi.fn();
    sessionStorage.setItem("chunkReloadAt", String(Date.now() - 31_000));

    void loadOrReload(() => Promise.reject(chunkError()), reload);
    await vi.advanceTimersByTimeAsync(0);

    expect(reload).toHaveBeenCalledTimes(1);
  });
});
