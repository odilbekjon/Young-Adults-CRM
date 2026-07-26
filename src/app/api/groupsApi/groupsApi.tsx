import { baseApi } from "../baseApi";
import { PATHS } from "./paths";
import { groupsRequest, groupsResponse } from "./types";

export const groupsApi = baseApi.injectEndpoints({
    endpoints: (builder) =>  ({
        allGroups: builder.query<groupsResponse,groupsRequest>({
            query: () => ({
                url: PATHS.GROUPS,
                method: "GET"
            }),
        }),
    })
})