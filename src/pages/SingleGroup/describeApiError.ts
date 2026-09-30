import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { extractApiError } from "../../utils";

// Turns an RTK Query rejection into the short, concrete text shown in a toast
// after the localized "generic" message: the backend's own message (when it
// sent one) plus the HTTP status, e.g. "Only ACTIVE students can be frozen
// [HTTP 400]". A bare "Failed to freeze the student" hid both, which made a
// backend rejection indistinguishable from a broken button.
//
// Transport-level failures have no HTTP status: FETCH_ERROR is what fetch
// reports for a network drop or a CORS/preflight rejection (the browser
// console's Network tab shows the blocked request in that case).
export const describeApiError = (err: unknown): string => {
  const fe = err as Partial<FetchBaseQueryError> | undefined;
  const status = fe?.status;

  let detail = extractApiError(err);
  if (!detail) {
    const data = (fe as { data?: unknown } | undefined)?.data;
    if (typeof data === "string" && data.trim()) {
      detail = data.trim().replace(/\s+/g, " ").slice(0, 160);
    } else if (data && typeof data === "object") {
      const errors = (data as { errors?: unknown }).errors;
      if (errors) {
        try {
          detail = JSON.stringify(errors).slice(0, 160);
        } catch {
          // ignore — fall through to the status-only text
        }
      }
    }
  }

  let statusText = "";
  if (typeof status === "number") statusText = `HTTP ${status}`;
  else if (status === "FETCH_ERROR") statusText = "no response from the server (network or CORS error)";
  else if (status === "TIMEOUT_ERROR") statusText = "request timed out";
  else if (status === "PARSING_ERROR") {
    const original = (fe as { originalStatus?: number } | undefined)?.originalStatus;
    statusText = original ? `HTTP ${original}` : "unreadable server response";
  } else if (err instanceof Error && err.message) {
    detail = detail ?? err.message;
  }

  if (detail && statusText) return `${detail} [${statusText}]`;
  return detail ?? (statusText ? `[${statusText}]` : "");
};
