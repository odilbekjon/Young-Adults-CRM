import { PATHS } from "./paths";
import { LoginRequest, LoginResponse, MeResponse, RefreshRequest, RefreshResponse, SidebarResponse } from "./types";
import { baseApi } from "../baseApi";

export const authApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        login: builder.mutation<LoginResponse, LoginRequest>({
            query: ({ identifier, password }) => {
                // POST /auth/login — confirmed via Swagger as multipart/form-data.
                const formData = new FormData();
                formData.append("identifier", identifier);
                formData.append("password", password);
                return {
                    url: PATHS.LOGIN,
                    method: 'POST',
                    body: formData,
                };
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
