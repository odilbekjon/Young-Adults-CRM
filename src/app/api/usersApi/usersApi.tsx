import { baseApi } from "../baseApi";
import { PATHS } from "./paths";
import {
    StaffUser,
    StaffUserBranchRef,
    StaffUserForEdit,
    RolePermissionRef,
    UsersRequest,
    UsersResult,
    CreateUserRequest,
    UpdateUserRequest,
    UserActionResponse,
    UserSelectOption,
} from "./types";

type Row = Record<string, unknown>;

const str = (...candidates: unknown[]): string => {
    for (const value of candidates) {
        if (typeof value === "string" && value) return value;
        if (typeof value === "number") return String(value);
    }
    return "";
};

const strOrNull = (...candidates: unknown[]): string | null => {
    for (const value of candidates) {
        if (typeof value === "string" && value) return value;
    }
    return null;
};

const normalizeRolePermission = (raw: unknown): RolePermissionRef | null => {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Row;
    const id = str(r.id, r._id);
    if (!id) return null;
    return { id, name: str(r.name) };
};

const normalizeStaffUserBranches = (raw: unknown): StaffUserBranchRef[] => {
    if (!Array.isArray(raw)) return [];
    return (raw as Row[])
        .map((entry) => {
            const branch = (entry.branch ?? {}) as Row;
            const id = str(entry.branchId, branch.id);
            if (!id) return null;
            return { branchId: id, branch: { id, name: str(branch.name) } };
        })
        .filter((b): b is StaffUserBranchRef => b !== null);
};

const normalizeStaffUser = (r: Row): StaffUser => ({
    id: str(r.id, r._id),
    name: str(r.name),
    email: strOrNull(r.email),
    phone: strOrNull(r.phone),
    role: str(r.role).toUpperCase(),
    rolePermission: normalizeRolePermission(r.rolePermission),
    photo: strOrNull(r.photo),
    status: str(r.status).toUpperCase() || "ACTIVE",
    createdAt: strOrNull(r.createdAt),
    branches: normalizeStaffUserBranches(r.branches),
});

const normalizeStaffUserForEdit = (r: Row): StaffUserForEdit => ({
    id: str(r.id, r._id),
    name: str(r.name),
    email: strOrNull(r.email),
    phone: strOrNull(r.phone),
    rolePermissionId: strOrNull(r.rolePermissionId),
    photo: strOrNull(r.photo),
    gender: strOrNull(r.gender),
    birthdate: strOrNull(r.birthdate),
    branchIds: Array.isArray(r.branchIds) ? (r.branchIds as unknown[]).map((id) => str(id)).filter(Boolean) : [],
});

// GET /users' confirmed real response is {success, data: [...]} with no
// meta captured — normalized the same defensive way as every other list
// endpoint here whose pagination envelope isn't fully documented
// (studentFreezesApi/groupsApi's studentGroups).
const normalizeUsersList = (raw: unknown): UsersResult => {
    const container = (raw ?? {}) as Row;
    const list: unknown[] = Array.isArray(raw)
        ? raw
        : Array.isArray(container.data)
        ? container.data
        : [];
    const rows = (list as Row[]).map(normalizeStaffUser);
    const meta = (container.meta ?? {}) as Row;
    const total = Number(meta.total ?? meta.totalItems) || rows.length;
    const limit = Number(meta.limit) || rows.length || 10;
    return {
        rows,
        meta: {
            total,
            page: Number(meta.page) || 1,
            limit,
            totalPages: Number(meta.totalPages) || Math.max(1, Math.ceil(total / Math.max(limit, 1))),
        },
    };
};

const pickRow = (raw: unknown): Row => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    const container = raw as Row;
    const nested = container.data;
    if (nested && typeof nested === "object" && !Array.isArray(nested)) return nested as Row;
    return container;
};

const buildUsersQueryString = (args: UsersRequest = {}): string => {
    const qs = new URLSearchParams();
    if (args.search) qs.set("search", args.search);
    if (args.status) qs.set("status", args.status);
    if (args.branchId) qs.set("branchId", args.branchId);
    qs.set("page", String(args.page ?? 1));
    qs.set("limit", String(args.limit ?? 10));
    return qs.toString();
};

// Swagger: POST /users and PATCH /users/{id} both declare multipart/form-data.
const appendUserFormData = (data: Partial<CreateUserRequest>): FormData => {
    const { branchIds, photo, ...rest } = data;
    const formData = new FormData();
    (Object.keys(rest) as (keyof typeof rest)[]).forEach((key) => {
        const value = rest[key];
        if (value !== undefined && value !== null && value !== "") formData.append(key, String(value));
    });
    if (photo) formData.append("photo", photo);
    // Array field — bracket suffix forces array parsing on multer/append-field
    // multipart parsers regardless of item count (same fix as groupsApi's
    // appendGroupFormData for teacherIds/studentIds, confirmed against this
    // backend's class-validator @IsArray() behavior).
    branchIds?.forEach((id) => formData.append("branchIds[]", id));
    return formData;
};

export const usersApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        staffUsers: builder.query<UsersResult, UsersRequest | void>({
            query: (args) => ({
                url: `${PATHS.USERS}?${buildUsersQueryString(args ?? {})}`,
                method: "GET",
            }),
            transformResponse: (response: unknown) => normalizeUsersList(response),
            providesTags: ["staff"],
        }),
        staffUserById: builder.query<StaffUser, string>({
            query: (id) => ({
                url: `${PATHS.USERS}/${id}`,
                method: "GET",
            }),
            transformResponse: (response: unknown) => normalizeStaffUser(pickRow(response)),
            providesTags: ["staff"],
        }),
        // GET /users/{id}/for-edit — confirmed live (2026-09) to be a
        // DIFFERENT, flatter shape than GET /users/{id} (see StaffUserForEdit):
        // it's the one endpoint that actually returns branchIds/gender/
        // birthdate for prefilling the edit form, which the list/detail
        // shapes don't carry.
        staffUserForEdit: builder.query<StaffUserForEdit, string>({
            query: (id) => ({
                url: `${PATHS.USERS}/${id}/for-edit`,
                method: "GET",
            }),
            transformResponse: (response: unknown) => normalizeStaffUserForEdit(pickRow(response)),
            providesTags: ["staff"],
        }),
        staffUsersExcel: builder.query<Blob, void>({
            query: () => ({
                url: `${PATHS.USERS}/excel`,
                method: "GET",
                responseHandler: (response) => response.blob(),
            }),
        }),
        // GET /users/select — branchId is a required query param per Swagger.
        staffUsersSelect: builder.query<UserSelectOption[], string>({
            query: (branchId) => ({
                url: `${PATHS.USERS}/select?branchId=${encodeURIComponent(branchId)}`,
                method: "GET",
            }),
            transformResponse: (response: unknown) => {
                const container = (response ?? {}) as Row;
                const list = Array.isArray(response) ? response : Array.isArray(container.data) ? container.data : [];
                return (list as Row[]).map((r) => ({ id: str(r.id, r._id), name: str(r.name), photo: strOrNull(r.photo) }));
            },
            providesTags: ["staff"],
        }),
        createStaffUser: builder.mutation<UserActionResponse, CreateUserRequest>({
            query: (data) => ({
                url: PATHS.USERS,
                method: "POST",
                body: appendUserFormData(data),
            }),
            invalidatesTags: ["staff"],
        }),
        updateStaffUser: builder.mutation<UserActionResponse, UpdateUserRequest>({
            query: ({ id, ...data }) => ({
                url: `${PATHS.USERS}/${id}`,
                method: "PATCH",
                body: appendUserFormData(data),
            }),
            invalidatesTags: ["staff"],
        }),
        toggleStaffUserStatus: builder.mutation<UserActionResponse, string>({
            query: (id) => ({
                url: `${PATHS.USERS}/${id}/toggle-status`,
                method: "PATCH",
            }),
            // Flipping status moves the user between the Staff list and the
            // Archive page — both must refetch, not just "staff".
            invalidatesTags: ["staff", "archive"],
        }),
        // DELETE /users/{id} — Swagger: hard delete; rejected with 409 if the
        // user is still assigned to a branch. Left for the caller to surface
        // via extractApiError rather than swallowed here.
        deleteStaffUser: builder.mutation<UserActionResponse, string>({
            query: (id) => ({
                url: `${PATHS.USERS}/${id}`,
                method: "DELETE",
            }),
            // Also drops the user out of the Archive page (GET /archives)
            // whenever a permanent delete is issued directly from there.
            invalidatesTags: ["staff", "archive"],
        }),
    }),
});

export const {
    useStaffUsersQuery,
    useStaffUserByIdQuery,
    useLazyStaffUserForEditQuery,
    useLazyStaffUsersExcelQuery,
    useStaffUsersSelectQuery,
    useCreateStaffUserMutation,
    useUpdateStaffUserMutation,
    useToggleStaffUserStatusMutation,
    useDeleteStaffUserMutation,
} = usersApi;
