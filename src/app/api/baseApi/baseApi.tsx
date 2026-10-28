import { useStorage } from "./../../../utils/store/store";
import {
  createApi,
  fetchBaseQuery,
  retry,
  type BaseQueryApi,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import i18n from "../../../i18n";
import { logout, setToken } from "../../store/authSlice";
// The project migrated off the old Render-hosted backend
// (young-adults-dj7r.onrender.com) to this dedicated host (confirmed live,
// 2026-09-24: nginx/Ubuntu, not Render — real login, /courses, /auth/me,
// /auth/sidebar all verified working here). Everything is still namespaced
// under /api/v1 (e.g. /api/v1/auth/login, /api/v1/courses).
//
// rawBaseQuery below retries transport-level failures (FETCH_ERROR/
// TIMEOUT_ERROR) for up to ~70s — originally to survive Render's free-tier
// cold starts, which don't apply to this host, but harmless to keep as a
// general resilience margin against transient network errors.

export const API_BASE_URL = "https://api.youngadults-crm.uz/api/v1";

// Courses are shared by every branch, so reading them must not be narrowed
// by the branch picked in the header.
const isCoursesRead = (arg: string | FetchArgs): boolean => {
  const url = typeof arg === "string" ? arg : arg.url;
  const method = typeof arg === "string" ? "GET" : (arg.method ?? "GET").toUpperCase();
  return method === "GET" && /^\/?courses(\/|\?|$)/.test(url);
};

const fetchQuery = fetchBaseQuery({
  // Fixed on purpose: a stale VITE_API_URL left in the hosting dashboard
  // (Vercel) kept builds pointing at the old Render backend.
  baseUrl: API_BASE_URL,
  credentials: 'include',
  prepareHeaders: (headers, { getState, arg }) => {
    const token = useStorage.getTokens()?.accessToken;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  
    const state = getState() as { branch?: { selectedBranchId?: string | null } };
    const branchId = state.branch?.selectedBranchId;
    // A request that names its own branch keeps it (see coursesApi's branchHeader).
    if (branchId && !headers.has("x-branch-id") && !isCoursesRead(arg)) {
      headers.set("x-branch-id", branchId);
    }
    headers.set("x-lang", i18n.language);
    return headers;
  },
});


// At most MAX_IN_FLIGHT requests are on the wire at once; the rest wait their
// turn. Pages mount a dozen-plus queries and bulk actions add many more — all
// fired together they stall the browser and flood the backend (each one also
// waits behind the others anyway). Writes jump the queue so a click is never
// stuck behind a pile of background reads. A request cancelled while still
// queued is dropped without being sent.
//
// On top of that the backend answers HTTP 429 ("Bir vaqtda bitta API ga 3 tadan
// ortiq parallel so'rov yuborish taqiqlangan") to a 4th parallel request to ONE
// endpoint, so the global cap alone is not enough: all 6 slots could go to the
// same route (a bulk action firing 30 identical per-item writes). Writes
// stay one below that limit: requests the browser aborted but the server is
// still finishing, and other tabs, may be using the same budget. A 429 that
// still slips through is retried below.
const MAX_IN_FLIGHT = 6;
const MAX_READS_PER_ENDPOINT = 3;
const MAX_WRITES_PER_ENDPOINT = 2;

type QueuedRequest = { endpoint: string; isWrite: boolean; start: () => void };

let inFlight = 0;
const inFlightByEndpoint = new Map<string, number>();
const queue: QueuedRequest[] = [];

// "/groups/<uuid>/students?page=1" -> "groups/:id/students". The method is left
// out on purpose: it is unknown whether the server counts per route or per
// method + route, and grouping by route is the safe side of both.
const endpointOf = (arg: string | FetchArgs): string => {
  const url = typeof arg === "string" ? arg : arg.url;
  return url
    .split("?")[0]
    .split("/")
    .filter(Boolean)
    // Ids (UUIDs, numbers) always contain a digit; route words never do.
    .map((segment) => (/\d/.test(segment) ? ":id" : segment))
    .join("/");
};

const hasRoom = ({ endpoint, isWrite }: Pick<QueuedRequest, "endpoint" | "isWrite">): boolean =>
  inFlight < MAX_IN_FLIGHT &&
  (inFlightByEndpoint.get(endpoint) ?? 0) < (isWrite ? MAX_WRITES_PER_ENDPOINT : MAX_READS_PER_ENDPOINT);

const takeSlot = (endpoint: string) => {
  inFlight += 1;
  inFlightByEndpoint.set(endpoint, (inFlightByEndpoint.get(endpoint) ?? 0) + 1);
};

// Frees a slot and hands it to the first queued request that fits. One stuck
// behind a busy endpoint is skipped so it cannot hold back requests to others.
const releaseSlot = (endpoint: string) => {
  inFlight -= 1;
  const left = (inFlightByEndpoint.get(endpoint) ?? 1) - 1;
  if (left > 0) inFlightByEndpoint.set(endpoint, left);
  else inFlightByEndpoint.delete(endpoint);

  const index = queue.findIndex(hasRoom);
  if (index === -1) return;
  const [next] = queue.splice(index, 1);
  takeSlot(next.endpoint);
  next.start();
};

const withSlot = async <T,>(
  signal: AbortSignal | undefined,
  endpoint: string,
  isWrite: boolean,
  run: () => Promise<T>,
): Promise<T | null> => {
  if (hasRoom({ endpoint, isWrite })) {
    takeSlot(endpoint);
  } else {
    await new Promise<void>((start) => {
      const entry = { endpoint, isWrite, start };
      // Writes go ahead of every queued read, but stay in order among themselves.
      const firstRead = queue.findIndex((queued) => !queued.isWrite);
      if (isWrite && firstRead !== -1) queue.splice(firstRead, 0, entry);
      else queue.push(entry);
    });
  }
  // The slot is now ours (taken just above, or handed over by `releaseSlot`).
  try {
    if (signal?.aborted) return null;
    return await run();
  } finally {
    releaseSlot(endpoint);
  }
};

// A 429 is refused before the backend runs the handler, so re-sending is safe
// for reads and writes alike. Each attempt goes back through the limiter and
// the pause in between holds no slot.
const MAX_RATE_LIMIT_RETRIES = 4;
const MAX_RETRY_AFTER_MS = 5000;

const rateLimitDelayMs = (response: Response | undefined, attempt: number): number => {
  const retryAfterSeconds = Number(response?.headers.get("Retry-After"));
  if (retryAfterSeconds > 0) return Math.min(retryAfterSeconds * 1000, MAX_RETRY_AFTER_MS);
  return 400 * attempt * (0.75 + Math.random() * 0.5);
};

// Resolves after `ms`, or earlier if the request is cancelled meanwhile.
const pause = (ms: number, signal: AbortSignal | undefined) =>
  new Promise<void>((resolve) => {
    const done = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    signal?.addEventListener("abort", done);
  });

// Resolves null when the request was cancelled before it was sent.
const sendWithinLimits = async (
  args: string | FetchArgs,
  isWrite: boolean,
  api: BaseQueryApi,
  extraOptions: object,
) => {
  const endpoint = endpointOf(args);
  for (let attempt = 1; ; attempt += 1) {
    const sent = await withSlot(api.signal, endpoint, isWrite, async () => fetchQuery(args, api, extraOptions));
    if (sent?.error?.status !== 429 || attempt > MAX_RATE_LIMIT_RETRIES) return sent;
    await pause(rateLimitDelayMs(sent.meta?.response, attempt), api.signal);
  }
};

const rawBaseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = retry(
  async (args, api, extraOptions) => {
    const method = typeof args === "string" ? "GET" : (args.method ?? "GET").toUpperCase();
    const isWrite = method !== "GET" && method !== "HEAD";
    const sent = await sendWithinLimits(args, isWrite, api, extraOptions);
    const result = sent ?? { error: { status: "FETCH_ERROR" as const, error: "Request cancelled" } };
    // Cancelled before it was sent: nothing to retry, nothing to report.
    if (sent === null) retry.fail(result.error);
    if (!result.error) return result;
    if (result.error.status === "FETCH_ERROR" || result.error.status === "TIMEOUT_ERROR") {
      // Only reads are retried. A write that failed at transport level (e.g. an
      // upload the proxy cut off) would otherwise be re-sent a dozen times —
      // minutes of spinner, and a risk of duplicate submits.
      if (isWrite) retry.fail(result.error);
      return result;
    }
    // Any real HTTP response (including error statuses) is final — stop retrying.
    retry.fail(result.error);
    return result;
  },
  {
    maxRetries: 12,
    backoff: async (attempt) => {
      const delayMs = Math.min(2000 * attempt, 7000);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    },
  }
);

// POST /auth/refresh — confirmed via Swagger as multipart/form-data with a
// required `refreshToken` field. Called directly through rawBaseQuery (not
// through authApi's hook) to avoid a circular import: authApi injects into
// baseApi, so baseApi can't import authApi back.
const requestTokenRefresh = async (
  api: BaseQueryApi,
  extraOptions: object
): Promise<boolean> => {
  const refreshToken = useStorage.getTokens()?.refreshToken;
  if (!refreshToken) return false;

  const formData = new FormData();
  formData.append("refreshToken", refreshToken);

  const refreshResult = await rawBaseQuery(
    { url: "auth/refresh", method: "POST", body: formData },
    // Every waiting request shares this refresh, so it must outlive the one
    // that started it — RTK aborts that caller's signal when it unmounts.
    { ...api, signal: new AbortController().signal },
    extraOptions
  );

  const data = refreshResult.data as
    | { data?: { token?: string; accessToken?: string; refreshToken?: string } }
    | undefined;
  const newAccessToken = data?.data?.token ?? data?.data?.accessToken;

  if (refreshResult.error || !newAccessToken) {
    return false;
  }

  // Refresh tokens are commonly single-use/rotated — persist whatever the
  // backend hands back (falling back to the one we just spent if it isn't
  // rotated) so the next 401 can refresh again instead of dead-ending.
  useStorage.setCredentials({
    token: newAccessToken,
    refreshToken: data?.data?.refreshToken ?? refreshToken,
  });
  api.dispatch(setToken(newAccessToken));
  return true;
};

// Multiple requests can 401 at the same time (e.g. a page firing several
// queries in parallel right as the access token expires) — every 401 shares
// this single in-flight refresh instead of each firing its own, since a
// second concurrent call could invalidate the first if refresh tokens are
// single-use on the backend.
let refreshPromise: Promise<boolean> | null = null;

// Centralized 401 handling: on an unauthorized response, try to renew the
// session via the refresh token before giving up. Only a failed (or absent)
// refresh clears the session so ProtectedRoute redirects to /login.
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    if (!refreshPromise) {
      refreshPromise = requestTokenRefresh(api, extraOptions).finally(() => {
        refreshPromise = null;
      });
    }
    const refreshed = await refreshPromise;

    if (refreshed) {
      result = await rawBaseQuery(args, api, extraOptions);
    } else {
      api.dispatch(logout());
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: "baseApi",
  baseQuery: baseQueryWithReauth,
  endpoints: () => ({}),
  tagTypes: ["user", "course", "branch", "room", "dashboard", "student", "group", "studentGroup", "attendance", "teacher", "leadColumn", "leadForm", "lead", "leadSection", "leadSource", "payment", "smsAutoSetting", "smsTemplate", "smsHistory", "smsConfig", "archive", "holiday", "reason", "report", "salary", "generalSettings", "studentFreeze", "studentPortal", "staff", "teacherPortal", "tag", "studentDiscount"],
});
export default baseApi;