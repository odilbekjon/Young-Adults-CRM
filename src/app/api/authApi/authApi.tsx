import { PATHS } from "./paths";
import { LoginRequest, LoginResponse, MeResponse } from "./types";
import { baseApi } from "../baseApi";

export const authApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        login: builder.mutation<LoginResponse, LoginRequest>({
            query: ({ identifier, password }) => ({
                url: PATHS.LOGIN,
                method: 'POST',
                body: { identifier, password },
            }),
        }),
        getMe: builder.query<MeResponse, void>({
            query: () => ({
                url: PATHS.GET,
                method: 'GET',
            }),
            providesTags: ["user"],
        })
    })
})

export const { useLoginMutation, useGetMeQuery } = authApi;
