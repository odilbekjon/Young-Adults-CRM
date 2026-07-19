import { useStorage } from "./../../../utils/store/store";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const baseApi = createApi({
  reducerPath: "baseApi",
  baseQuery: fetchBaseQuery({
    baseUrl: 'https://backend.youngadults.uz',
    credentials: 'include',
    prepareHeaders: (headers) => {
      headers.set("Content-Type", "application/json");
      const token = useStorage.getTokens()?.accessToken;
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),
  endpoints: () => ({}),
  tagTypes: ["user", "complaint", "message", "branch", "employee", "about", "course" ],
});
export default baseApi;