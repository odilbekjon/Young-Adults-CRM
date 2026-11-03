import { lazy, type ComponentType } from "react";

// Route pages are loaded when they are first visited (see Router.tsx) instead of
// all being shipped in one file up front. A deploy replaces the hashed chunk
// files, so a tab that was opened before it asks for a chunk that no longer
// exists and the import fails. One automatic reload fetches the new index.html
// (and with it the new file names); the timestamp keeps a chunk that is really
// unreachable (offline) from reloading in a loop - that second failure reaches
// the route error boundary instead.
const RELOAD_KEY = "chunkReloadAt";
const RELOAD_COOLDOWN_MS = 30_000;

const CHUNK_ERROR =
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Loading chunk .+ failed|Unable to preload CSS/i;

export const isChunkLoadError = (error: unknown): boolean =>
  CHUNK_ERROR.test(error instanceof Error ? error.message : String(error));

export const loadOrReload = async <T>(
  load: () => Promise<T>,
  reload: () => void = () => window.location.reload(),
): Promise<T> => {
  try {
    return await load();
  } catch (error) {
    if (!isChunkLoadError(error)) throw error;
    try {
      const last = Number(sessionStorage.getItem(RELOAD_KEY));
      if (!last || Date.now() - last > RELOAD_COOLDOWN_MS) {
        sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
        reload();
        // The page is being replaced: never settle, so nothing flashes an error.
        return new Promise<T>(() => {});
      }
    } catch {
      /* storage unavailable - fall through and report the failure */
    }
    throw error;
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = ComponentType<any>;

// lazyNamed(() => import("./pages/Students"), "Students") - for modules that
// export the page by name (the project's usual style).
export const lazyNamed = <K extends string, M extends Record<K, AnyComponent>>(load: () => Promise<M>, name: K) =>
  lazy(async () => ({ default: (await loadOrReload(load))[name] }));

// lazyDefault(() => import("./pages/Profile/Profile")) - for default exports.
export const lazyDefault = <C extends AnyComponent>(load: () => Promise<{ default: C }>) =>
  lazy(() => loadOrReload(load));
