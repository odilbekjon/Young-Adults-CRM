import { baseApi } from "../baseApi";
import { PATHS } from "./paths";
import {
    BranchesResponse,
    BranchResponse,
    CreateBranchRequest,
    UpdateBranchRequest,
    DeleteBranchResponse,
} from "./types";

export const branchesApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        allBranches: builder.query<BranchesResponse, void>({
            query: () => ({
                url: PATHS.BRANCHES,
                method: "GET"
            }),
            providesTags: ["branch"],
        }),
        createBranch: builder.mutation<BranchResponse, CreateBranchRequest>({
            query: ({ name, address }) => {
                const formData = new FormData();
                formData.append("name", name);
                if (address) formData.append("address", address);
                return {
                    url: PATHS.BRANCHES,
                    method: "POST",
                    body: formData,
                };
            },
            invalidatesTags: ["branch"],
        }),
        updateBranch: builder.mutation<BranchResponse, UpdateBranchRequest>({
            query: ({ id, name, address }) => {
                const formData = new FormData();
                if (name !== undefined) formData.append("name", name);
                if (address !== undefined) formData.append("address", address);
                return {
                    url: `${PATHS.BRANCHES}/${id}`,
                    method: "PATCH",
                    body: formData,
                };
            },
            invalidatesTags: ["branch"],
        }),
        deleteBranch: builder.mutation<DeleteBranchResponse, string>({
            query: (id) => ({
                url: `${PATHS.BRANCHES}/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["branch"],
        }),
    })
})

export const {
    useAllBranchesQuery,
    useCreateBranchMutation,
    useUpdateBranchMutation,
    useDeleteBranchMutation,
} = branchesApi;
