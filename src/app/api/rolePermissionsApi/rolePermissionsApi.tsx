import { baseApi } from "../baseApi";
import { PATHS } from "./paths";
import { RolePermissionAssignmentResponse, RolePermissionSelectOption } from "./types";

// Backend ba'zan ro'yxatni tekis massiv, ba'zan {data: [...], meta} ko'rinishida
// qaytarishi mumkin — groupsApi/reasonsApi'dagi bir xil naqsh.
const normalizeList = <T,>(data: unknown): T[] => {
    if (Array.isArray(data)) return data as T[];
    if (data && typeof data === "object" && Array.isArray((data as { data?: unknown }).data)) {
        return (data as { data: T[] }).data;
    }
    return [];
};

export const rolePermissionsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // GET /role-permissions/select — "Barcha faol lavozimlarni qisqa
        // ro'yxatini qaytaradi" (active positions only, {id, name}).
        rolePermissionsSelect: builder.query<RolePermissionSelectOption[], void>({
            query: () => ({
                url: `${PATHS.ROLE_PERMISSIONS}/select`,
                method: "GET",
            }),
            transformResponse: (response: { data: unknown }) =>
                normalizeList<RolePermissionSelectOption>(response?.data),
        }),
        // POST /role-permissions/{id}/assign-user/{userId} — attaches one
        // additional lavozim to a user, on top of whichever one Users'
        // create/update endpoints set as the primary `rolePermissionId`.
        assignRolePermissionToUser: builder.mutation<RolePermissionAssignmentResponse, { id: string; userId: string }>({
            query: ({ id, userId }) => ({
                url: `${PATHS.ROLE_PERMISSIONS}/${id}/assign-user/${userId}`,
                method: "POST",
            }),
            invalidatesTags: ["staff"],
        }),
        // DELETE /role-permissions/{id}/remove-user/{userId}
        removeRolePermissionFromUser: builder.mutation<RolePermissionAssignmentResponse, { id: string; userId: string }>({
            query: ({ id, userId }) => ({
                url: `${PATHS.ROLE_PERMISSIONS}/${id}/remove-user/${userId}`,
                method: "DELETE",
            }),
            invalidatesTags: ["staff"],
        }),
    }),
});

export const {
    useRolePermissionsSelectQuery,
    useAssignRolePermissionToUserMutation,
    useRemoveRolePermissionFromUserMutation,
} = rolePermissionsApi;
