import { PATHS } from "./paths";
import { LoginRequest, LoginResponse } from "./types";
import { baseApi } from "../baseApi";

export const authApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        login: builder.mutation<LoginResponse, LoginRequest>({
            query: (body) => ({
                url: PATHS.LOGIN,
                method: 'POST',
                body,
                // headers: {
                //     'Content-Type': 'application/json'
                // }
            })
        })
    })
})

export const { useLoginMutation, } = authApi;
