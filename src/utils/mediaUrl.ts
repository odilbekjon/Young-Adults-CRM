import { API_BASE_URL } from "../app/api/baseApi/baseApi";

const API_ORIGIN = new URL(API_BASE_URL).origin;

// Uploaded files (photos) may come back as an absolute URL or as a path
// relative to the API host — the browser can only load the former, so a bare
// path is resolved against the API origin.
export const resolveMediaUrl = (raw: unknown): string | null => {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value) return null;
  if (/^(https?:)?\/\//i.test(value) || value.startsWith("data:") || value.startsWith("blob:")) return value;
  return `${API_ORIGIN}/${value.replace(/^\/+/, "")}`;
};
