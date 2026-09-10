import { baseApi } from "../baseApi";
import { PATHS } from "./paths";
import {
    HolidaysResponse,
    HolidayResponse,
    HolidaySelectOption,
    CreateHolidayRequest,
    UpdateHolidayRequest,
    DeleteHolidayResponse,
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

// Swagger (POST/PATCH /api/v1/holidays) declares the request body as
// multipart/form-data — same as rooms/courses on this backend — so a JSON
// body would be rejected. Only `name` and `date` are documented; nothing
// else is appended.
const appendHolidayFormData = (data: Partial<CreateHolidayRequest>): FormData => {
    const formData = new FormData();
    if (data.name !== undefined) formData.append("name", data.name);
    if (data.date !== undefined) formData.append("date", data.date);
    return formData;
};

export const holidaysApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        allHolidays: builder.query<HolidaysResponse, void>({
            query: () => ({
                url: PATHS.HOLIDAYS,
                method: "GET",
            }),
            transformResponse: (response: HolidaysResponse) => ({
                ...response,
                data: normalizeList<HolidaysResponse["data"][number]>(response?.data),
            }),
            providesTags: ["holiday"],
        }),
        holidayById: builder.query<HolidayResponse, string>({
            query: (id) => ({
                url: `${PATHS.HOLIDAYS}/${id}`,
                method: "GET",
            }),
            providesTags: ["holiday"],
        }),
        // GET /holidays/{id}/for-edit — same envelope as holidayById, used to
        // prefill the edit form (kept as its own endpoint since Swagger
        // documents it separately).
        holidayForEdit: builder.query<HolidayResponse, string>({
            query: (id) => ({
                url: `${PATHS.HOLIDAYS}/${id}/for-edit`,
                method: "GET",
            }),
            providesTags: ["holiday"],
        }),
        // GET /holidays/select — simplified {id, name} list for dropdowns.
        holidaysSelect: builder.query<HolidaySelectOption[], void>({
            query: () => ({
                url: `${PATHS.HOLIDAYS}/select`,
                method: "GET",
            }),
            transformResponse: (response: { data: unknown }) =>
                normalizeList<HolidaySelectOption>(response?.data),
            providesTags: ["holiday"],
        }),
        createHoliday: builder.mutation<HolidayResponse, CreateHolidayRequest>({
            query: (data) => ({
                url: PATHS.HOLIDAYS,
                method: "POST",
                body: appendHolidayFormData(data),
            }),
            invalidatesTags: ["holiday"],
        }),
        updateHoliday: builder.mutation<HolidayResponse, UpdateHolidayRequest>({
            query: ({ id, ...data }) => ({
                url: `${PATHS.HOLIDAYS}/${id}`,
                method: "PATCH",
                body: appendHolidayFormData(data),
            }),
            invalidatesTags: ["holiday"],
        }),
        deleteHoliday: builder.mutation<DeleteHolidayResponse, string>({
            query: (id) => ({
                url: `${PATHS.HOLIDAYS}/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["holiday"],
        }),
    }),
});

export const {
    useAllHolidaysQuery,
    useHolidayByIdQuery,
    useLazyHolidayForEditQuery,
    useHolidaysSelectQuery,
    useCreateHolidayMutation,
    useUpdateHolidayMutation,
    useDeleteHolidayMutation,
} = holidaysApi;
