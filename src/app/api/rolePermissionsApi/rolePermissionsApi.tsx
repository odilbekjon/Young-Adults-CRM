import { baseApi } from "../baseApi";
import { PATHS } from "./paths";
import { RolePermissionSelectOption } from "./types";

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
    }),
});

export const { useRolePermissionsSelectQuery } = rolePermissionsApi;
