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

const fetchQuery = fetchBaseQuery({
  baseUrl:'https://young-adults-dj7r.onrender.com/api/v1/',
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = useStorage.getTokens()?.accessToken;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    // Centralized branch scoping: every request (GET, POST, PUT, DELETE)
    // picks up the currently selected branch from Redux, so individual API
    // files don't each need to thread a branchId param through.
    const state = getState() as { branch?: { selectedBranchId?: string | null } };
    const branchId = state.branch?.selectedBranchId;
    if (branchId) {
      headers.set("x-branch-id", branchId);
    }
    headers.set("x-lang", i18n.language);
    return headers;
  },
});

// The backend runs on Render's free tier, which spins the server down after
// inactivity — the first request(s) after that arrive while it's still
// waking up and fail with a connection error (not an HTTP error status).
// Retry only those transport-level failures (FETCH_ERROR/TIMEOUT_ERROR);
// real HTTP responses (400/401/404/500) bail out immediately so app-level
// error handling (e.g. the 401 refresh flow below) isn't delayed.
//
// Render's free-tier cold start commonly takes 30-60s to finish waking the
// server, but RTK Query's default backoff (maxRetries: 4, capped ~2s/step)
// gives up after only a few seconds — nowhere near long enough, which is
// what was surfacing as "Network error" on the very first request after a
// period of inactivity (e.g. the first login of the day). Retry steadily
// for up to ~70s instead so that first request survives the wake-up.
const rawBaseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = retry(
  async (args, api, extraOptions) => {
    const result = await fetchQuery(args, api, extraOptions);
    if (!result.error) return result;
    if (result.error.status === "FETCH_ERROR" || result.error.status === "TIMEOUT_ERROR") {
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
    api,
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
  tagTypes: ["user", "course", "branch", "room", "dashboard", "student", "group", "studentGroup", "attendance", "teacher", "leadColumn", "leadForm", "lead", "leadSection", "leadSource", "payment", "smsAutoSetting", "smsTemplate", "archive", "holiday", "reason", "report", "salary", "generalSettings", "studentFreeze", "studentPortal", "staff", "teacherPortal"],
});
export default baseApi;