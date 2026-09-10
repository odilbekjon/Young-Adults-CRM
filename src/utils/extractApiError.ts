import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";

// This backend reports validation failures as {success:false, error: string
// | string[], statusCode} (confirmed against its 401 envelope), not the
// stock NestJS {message} shape — so unwrap() rejections are checked for
// both, and the real message is surfaced instead of a generic string.
export const extractApiError = (err: unknown): string | null => {
  const fetchError = err as FetchBaseQueryError;
  const data = fetchError?.data as { error?: string | string[]; message?: string | string[] } | undefined;
  const detail = data?.error ?? data?.message;
  if (Array.isArray(detail)) return detail.join(" ");
  if (typeof detail === "string") return detail;
  return null;
};
