import { baseApi } from "../baseApi";
import { PATHS } from "./paths";
import {
  SaveAttendanceRequest,
  SaveAttendanceResponse,
  AttendanceRecord,
  AttendanceStatus,
  GroupAttendanceQueryArgs,
} from "./types";

const normalizeStatus = (raw: unknown): AttendanceStatus | null => {
  if (typeof raw !== "string") return null;
  const upper = raw.toUpperCase();
  return upper === "PRESENT" || upper === "ABSENT" ? (upper as AttendanceStatus) : null;
};

const asId = (raw: unknown): string => {
  if (raw && typeof raw === "object") {
    return String((raw as Record<string, unknown>).id ?? "");
  }
  return raw === undefined || raw === null ? "" : String(raw);
};

// Backend's exact envelope for "group attendance" isn't documented beyond a
// 200 status. The endpoint description ("students AND their attendance")
// suggests the likely shape is per-student objects with a nested attendance
// array, e.g. [{ studentId, attendances: [{ date, status }] }] — but a flat
// [{ studentId, date, status }] array is also plausible, so both are handled.
const normalizeRecords = (raw: unknown): AttendanceRecord[] => {
  const container = (raw ?? {}) as Record<string, unknown>;
  const list: unknown[] = Array.isArray(raw)
    ? raw
    : Array.isArray(container.students)
    ? container.students
    : Array.isArray(container.records)
    ? container.records
    : Array.isArray(container.attendances)
    ? container.attendances
    : Array.isArray(container.data)
    ? container.data
    : [];

  const result: AttendanceRecord[] = [];

  list.forEach((item) => {
    const obj = (item ?? {}) as Record<string, unknown>;
    const studentId = asId(obj.studentId ?? obj.student ?? obj.id);
    const nested =
      (Array.isArray(obj.attendances) && obj.attendances) ||
      (Array.isArray(obj.records) && obj.records) ||
      (Array.isArray(obj.attendance) && obj.attendance) ||
      (Array.isArray(obj.days) && obj.days) ||
      null;

    if (nested) {
      (nested as Record<string, unknown>[]).forEach((entry) => {
        const date = String(entry?.date ?? "").slice(0, 10);
        if (!studentId || !date) return;
        result.push({
          studentId,
          date,
          status: normalizeStatus(entry?.status),
          reason: (entry?.reason as string | null | undefined) ?? null,
        });
      });
      return;
    }

    const date = String(obj.date ?? "").slice(0, 10);
    if (!studentId || !date) return;
    result.push({
      studentId,
      date,
      status: normalizeStatus(obj.status),
      reason: (obj.reason as string | null | undefined) ?? null,
    });
  });

  return result;
};

const normalizeDates = (raw: unknown): string[] => {
  const container = (raw ?? {}) as Record<string, unknown>;
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(container.dates)
    ? container.dates
    : Array.isArray(container.data)
    ? container.data
    : [];

  return (list as unknown[])
    .map((d) => {
      if (typeof d === "string") return d;
      const obj = d as Record<string, unknown> | null;
      return obj?.date ?? obj?.lessonDate ?? obj?.day ?? null;
    })
    .filter((d): d is string => typeof d === "string")
    .map((d) => d.slice(0, 10));
};

export const attendancesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    groupAttendanceDates: builder.query<string[], GroupAttendanceQueryArgs>({
      query: ({ groupId, month }) => ({
        url: `${PATHS.ATTENDANCES}/group/${groupId}/dates?month=${month}`,
        method: "GET",
      }),
      transformResponse: (response: { data: unknown }) => {
        // TEMP DEBUG — remove once the real response shape is confirmed.
        if (import.meta.env.DEV) console.log("[attendancesApi] dates raw response:", response);
        return normalizeDates(response?.data);
      },
      providesTags: ["attendance"],
    }),
    groupAttendance: builder.query<AttendanceRecord[], GroupAttendanceQueryArgs>({
      query: ({ groupId, month }) => ({
        url: `${PATHS.ATTENDANCES}/group/${groupId}?month=${month}`,
        method: "GET",
      }),
      transformResponse: (response: { data: unknown }) => {
        // TEMP DEBUG — remove once the real response shape is confirmed.
        if (import.meta.env.DEV) console.log("[attendancesApi] attendance raw response:", response);
        return normalizeRecords(response?.data);
      },
      providesTags: ["attendance"],
    }),
    saveAttendance: builder.mutation<SaveAttendanceResponse, SaveAttendanceRequest>({
      query: (body) => ({
        url: PATHS.ATTENDANCES,
        method: "POST",
        body,
      }),
      transformResponse: (response: SaveAttendanceResponse) => {
        // TEMP DEBUG — remove once the real response shape is confirmed.
        if (import.meta.env.DEV) console.log("[attendancesApi] save response:", response);
        return response;
      },
      invalidatesTags: ["attendance"],
    }),
  }),
});

export const {
  useGroupAttendanceDatesQuery,
  useGroupAttendanceQuery,
  useSaveAttendanceMutation,
} = attendancesApi;
