import { useStorage } from "./../../../utils/store/store";
import { createApi, fetchBaseQuery, type BaseQueryFn, type FetchArgs, type FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import { logout } from "../../store/authSlice";

const rawBaseQuery = fetchBaseQuery({
  baseUrl:'https://young-adults-dj7r.onrender.com/api/v1/',
  credentials: 'include',
  prepareHeaders: (headers) => {
    const token = useStorage.getTokens()?.accessToken;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

// Centralized 401 handling: any request that comes back unauthorized clears
// the session so ProtectedRoute redirects to /login on the next render.
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  if (result.error?.status === 401) {
    api.dispatch(logout());
  }
  return result;
};

export const baseApi = createApi({
  reducerPath: "baseApi",
  baseQuery: baseQueryWithReauth,
  endpoints: () => ({}),
  tagTypes: ["user", "course", "branch", "room", "dashboard", "student", "group", "attendance", "teacher", "leadColumn", "leadForm", "lead", "leadSection", "leadSource", "payment"],
});
export default baseApi;