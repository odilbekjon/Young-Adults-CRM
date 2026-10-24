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
