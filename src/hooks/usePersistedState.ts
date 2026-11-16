import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

const PREFIX = "ya-crm:state:";

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const read = <T,>(key: string, initial: T): T => {
  try {
    const raw = window.sessionStorage.getItem(PREFIX + key);
    if (raw === null) return initial;
    const stored: unknown = JSON.parse(raw);
    // Merge object state over the defaults so a filter added in a later
    // release doesn't come back undefined from an older saved copy.
    if (isPlainObject(initial) && isPlainObject(stored)) return { ...initial, ...stored } as T;
    return stored as T;
  } catch {
    return initial;
  }
};

// ── Page filters across a logout ────────────────────────────────────────────
// The state below lives in sessionStorage (per tab). So that an account finds its
// filters, searches and sort orders again after signing out and back in - in any
// tab - a logout puts this tab's copy away under the account's id, and the next
// login of that same account takes it back out (see authSlice). Another account
// signing in on this browser starts from the defaults, not from someone else's
// filters.
const STASH_PREFIX = "ya-crm:saved-state:";

const persistedKeys = (): string[] => {
  const keys: string[] = [];
  for (let i = 0; i < window.sessionStorage.length; i += 1) {
    const key = window.sessionStorage.key(i);
    if (key?.startsWith(PREFIX)) keys.push(key);
  }
  return keys;
};

export const hasPersistedState = (): boolean => {
  try {
    return persistedKeys().length > 0;
  } catch {
    return false;
  }
};

// Puts this tab's page state away for `userId` and empties it for whoever signs
// in next. An account that leaves with no filters set comes back with none.
export const stashPersistedState = (userId: string): void => {
  if (!userId) return;
  try {
    const keys = persistedKeys();
    const saved: Record<string, string> = {};
    keys.forEach((key) => {
      const value = window.sessionStorage.getItem(key);
      if (value !== null) saved[key.slice(PREFIX.length)] = value;
    });
    if (keys.length > 0) window.localStorage.setItem(STASH_PREFIX + userId, JSON.stringify(saved));
    else window.localStorage.removeItem(STASH_PREFIX + userId);
    keys.forEach((key) => window.sessionStorage.removeItem(key));
  } catch {
    /* storage unavailable - the filters just aren't carried over */
  }
};

// Brings back what stashPersistedState put away for `userId`, replacing whatever
// page state this tab holds. Nothing put away = nothing changes.
export const restorePersistedState = (userId: string): void => {
  if (!userId) return;
  try {
    const raw = window.localStorage.getItem(STASH_PREFIX + userId);
    if (raw === null) return;
    const saved: unknown = JSON.parse(raw);
    if (!isPlainObject(saved)) return;
    persistedKeys().forEach((key) => window.sessionStorage.removeItem(key));
    Object.entries(saved).forEach(([key, value]) => {
      if (typeof value === "string") window.sessionStorage.setItem(PREFIX + key, value);
    });
  } catch {
    /* storage unavailable or an unreadable copy - start from the defaults */
  }
};

/**
 * useState that survives a browser refresh (kept in sessionStorage, so it is
 * per tab and is cleared when the tab is closed). Used for page filters,
 * search boxes and sort order — `key` must be unique per piece of state.
 * Storage being unavailable (private mode, quota) silently falls back to a
 * plain in-memory state.
 */
export const usePersistedState = <T,>(
  key: string,
  initial: T,
  // true = start from `initial` even if a saved copy exists (e.g. a deep link
  // that carries its own filters); later changes are still saved.
  ignoreStored = false,
): [T, Dispatch<SetStateAction<T>>] => {
  const [value, setValue] = useState<T>(() => (ignoreStored ? initial : read(key, initial)));

  useEffect(() => {
    try {
      window.sessionStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      /* storage unavailable — state just isn't persisted */
    }
  }, [key, value]);

  return [value, setValue];
};
