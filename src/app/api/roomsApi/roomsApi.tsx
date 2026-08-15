import { baseApi } from "../baseApi";
import { PATHS } from "./paths";
import {
    RoomsResponse,
    RoomResponse,
    CreateRoomRequest,
    UpdateRoomRequest,
    DeleteRoomResponse,
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
    useDeleteRoomMutation,
} = roomsApi;
