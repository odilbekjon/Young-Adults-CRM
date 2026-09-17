import { baseApi } from "../baseApi";
import { PATHS } from "./paths";
import {
    RoomsResponse,
    RoomResponse,
    CreateRoomRequest,
    UpdateRoomRequest,
    DeleteRoomResponse,
    ToggleRoomStatusResponse,
} from "./types";

// Backend ba'zan ro'yxatni tekis massiv, ba'zan {data: [...], meta} ko'rinishida
// qaytarishi mumkin — ikkalasini ham massivga normallashtiramiz.
const normalizeList = <T,>(data: unknown): T[] => {
    if (Array.isArray(data)) return data as T[];
    if (data && typeof data === "object" && Array.isArray((data as { data?: unknown }).data)) {
        return (data as { data: T[] }).data;
    }
    return [];
};

export const roomsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        allRooms: builder.query<RoomsResponse, void>({
            query: () => ({
                url: PATHS.ROOMS,
                method: "GET"
            }),
            transformResponse: (response: RoomsResponse) => ({
                ...response,
                data: normalizeList<RoomsResponse["data"][number]>(response.data),
            }),
            providesTags: ["room"],
        }),
        createRoom: builder.mutation<RoomResponse, CreateRoomRequest>({
            query: ({ name, capacity, branchId }) => {
                const formData = new FormData();
                formData.append("name", name);
                formData.append("capacity", String(capacity));
                formData.append("branchId", branchId);
                return {
                    url: PATHS.ROOMS,
                    method: "POST",
                    body: formData,
                };
            },
            invalidatesTags: ["room"],
        }),
        updateRoom: builder.mutation<RoomResponse, UpdateRoomRequest>({
            query: ({ id, name, capacity, branchId }) => {
                const formData = new FormData();
                if (name !== undefined) formData.append("name", name);
                if (capacity !== undefined) formData.append("capacity", String(capacity));
                if (branchId !== undefined) formData.append("branchId", branchId);
                return {
                    url: `${PATHS.ROOMS}/${id}`,
                    method: "PATCH",
                    body: formData,
                };
            },
            invalidatesTags: ["room"],
        }),
        // PATCH /rooms/{id}/toggle-status (Swagger) — flips the room between
        // ACTIVE and INACTIVE (archive) without touching its groups, unlike
        // deleteRoom below (DELETE /rooms/{id}), which the backend rejects
        // outright while any group still references the room.
        toggleRoomStatus: builder.mutation<ToggleRoomStatusResponse, string>({
            query: (id) => ({
                url: `${PATHS.ROOMS}/${id}/toggle-status`,
                method: "PATCH",
            }),
            invalidatesTags: ["room"],
        }),
        // DELETE /rooms/{id} — Swagger: hard delete, rejected (409) if the
        // room still has groups assigned. Reserved for permanently removing
        // an already-archived (INACTIVE) room.
        deleteRoom: builder.mutation<DeleteRoomResponse, string>({
            query: (id) => ({
                url: `${PATHS.ROOMS}/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["room"],
        }),
    })
})

export const {
    useAllRoomsQuery,
    useCreateRoomMutation,
    useUpdateRoomMutation,
    useToggleRoomStatusMutation,
    useDeleteRoomMutation,
} = roomsApi;
