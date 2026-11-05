import type { FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import { PATHS } from "./paths";
import { loginIdentifierCandidates } from "../../../utils/formatPhone";
import { LoginRequest, LoginResponse, MeResponse, RefreshRequest, RefreshResponse, SidebarResponse } from "./types";
import { baseApi } from "../baseApi";

export const authApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // POST /auth/login - multipart/form-data {identifier, password}. The
        // identifier is sent in the form the accounts are saved in (a phone as
        // +998 and 9 digits, however it was typed - see loginIdentifierCandidates)
        // and, only when the backend says those credentials are not right (401, or
        // 404 for an unknown account), tried once more in each equivalent spelling
        // (bare 9 digits, as typed; an email lower-cased) before the failure is
        // reported: an account saved before the forms normalized the phone may be
        // stored in any of them. A failed login changes nothing on the server, so
        // trying again is safe. The password is sent exactly as typed.
        login: builder.mutation<LoginResponse, LoginRequest>({
            async queryFn({ identifier, password }, _api, _extraOptions, fetchWithBQ) {
                const candidates = loginIdentifierCandidates(identifier);
                let failure: FetchBaseQueryError | undefined;
                for (const candidate of candidates.length > 0 ? candidates : [identifier]) {
                    const formData = new FormData();
                    formData.append("identifier", candidate);
                    formData.append("password", password);
                    const result = await fetchWithBQ({ url: PATHS.LOGIN, method: 'POST', body: formData });
                    if (!result.error) return { data: result.data as LoginResponse };
                    failure = result.error as FetchBaseQueryError;
                    if (failure.status !== 401 && failure.status !== 404) break;
                }
                return { error: failure as FetchBaseQueryError };
            },
        }),
        getMe: builder.query<MeResponse, void>({
            query: () => ({
                url: PATHS.GET,
                method: 'GET',
            }),
            providesTags: ["user"],
        }),
        // GET /auth/sidebar — {allAccess, labels}, used to drive which nav
        // items/routes are visible for the current user (AUTH_ROLE_DOCS.md §3).
        getSidebar: builder.query<SidebarResponse, void>({
            query: () => ({
                url: PATHS.SIDEBAR,
                method: 'GET',
            }),
            providesTags: ["user"],
        }),
        refreshToken: builder.mutation<RefreshResponse, RefreshRequest>({
            query: ({ refreshToken }) => {
                // POST /auth/refresh — confirmed via Swagger as multipart/form-data
                // with a single required field `refreshToken`. Exposed here for
                // completeness/manual use; baseApi's reauth wrapper calls this same
                // endpoint directly via its own base query (not through this hook)
                // to avoid a circular import between authApi and baseApi.
                const formData = new FormData();
                formData.append("refreshToken", refreshToken);
                return {
                    url: PATHS.REFRESH,
                    method: 'POST',
                    body: formData,
                };
            },
        }),
    })
})

export const { useLoginMutation, useGetMeQuery, useGetSidebarQuery, useRefreshTokenMutation } = authApi;
