import { baseApi } from "../baseApi";
import { PATHS } from "./paths";
import { coursesRequest, coursesResponse } from "./types";

export const coursesApi = baseApi.injectEndpoints({
    endpoints: (builder) =>  ({
        allCourses: builder.query<coursesResponse,coursesRequest>({
            query: () => ({
                url: PATHS.COURSES,
                method: "GET"
            }),
        }),
    })
})