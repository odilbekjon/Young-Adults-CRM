import { baseApi } from "../baseApi";
import { PATHS } from "./paths";
import {
  SaveAttendanceRequest,
  SaveAttendanceResponse,
  AttendanceRecord,
  AttendanceStatus,
  GroupAttendanceQueryArgs,
  AttendanceReportQueryArgs,
  AttendanceReportRow,
  AttendanceReportMeta,
  AttendanceReportResult,
  AttendanceReportAttendanceStatus,
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

// Confirmed live (2026-09): GET /attendances/group/{id} returns
// { dates: string[], table: [{ studentId, studentName, ..., attendances:
// [{ date, status, reason, attendance }] }] } — the `table` field wasn't in
// any of the previously-guessed candidates below, so every response parsed
// to an empty list and a freshly-saved mark would vanish from the grid on
// reload even though it was genuinely persisted server-side (confirmed via
// a direct GET right after save). The other candidates are kept as a
// fallback in case the shape varies by endpoint version.
const normalizeRecords = (raw: unknown): AttendanceRecord[] => {
  const container = (raw ?? {}) as Record<string, unknown>;
  const list: unknown[] = Array.isArray(raw)
    ? raw
    : Array.isArray(container.table)
    ? container.table
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

const asString = (raw: unknown): string =>
  raw === undefined || raw === null ? "" : String(raw);

const normalizeReportMeta = (raw: unknown): AttendanceReportMeta => {
  const obj = (raw ?? {}) as Record<string, unknown>;
  return {
    total: Number(obj.total ?? 0) || 0,
    page: Number(obj.page ?? 1) || 1,
    limit: Number(obj.limit ?? 10) || 10,
    totalPages: Number(obj.totalPages ?? 0) || 0,
  };
};

const normalizeReportAttendanceStatus = (raw: unknown): AttendanceReportAttendanceStatus | null => {
  if (typeof raw !== "string") return null;
  const upper = raw.toUpperCase();
  return upper === "PRESENT" || upper === "ABSENT" || upper === "EXCUSED" || upper === "UNMARKED"
    ? (upper as AttendanceReportAttendanceStatus)
    : null;
};

const normalizeReportGroupStatus = (raw: unknown): AttendanceReportRow["status"] => {
  if (typeof raw !== "string") return null;
  const upper = raw.toUpperCase();
  return upper === "ACTIVE" || upper === "INACTIVE" || upper === "PROBATION" || upper === "FROZEN" || upper === "DELETED"
    ? (upper as AttendanceReportRow["status"])
    : null;
};

// Backend's exact row shape isn't documented beyond the endpoint
// description, so each field is read from a few plausible name variants
// (flat or nested under student/group/teacher objects) — same defensive
// approach as normalizeRecords above.
const normalizeReportRow = (raw: unknown, index: number): AttendanceReportRow => {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const student = (obj.student ?? {}) as Record<string, unknown>;
  const group = (obj.group ?? {}) as Record<string, unknown>;
  const teacher = (obj.teacher ?? {}) as Record<string, unknown>;

  return {
    id: asString(obj.id ?? obj.attendanceId ?? `row-${index}`),
    date: obj.date ? String(obj.date).slice(0, 10) : null,
    studentId: asId(obj.studentId ?? student.id ?? obj.student) || null,
    studentName: asString(obj.studentName ?? obj.name ?? student.name ?? student.fullName),
    phone: asString(obj.phone ?? obj.studentPhone ?? student.phone),
    status: normalizeReportGroupStatus(obj.status ?? obj.studentStatus),
    groupId: asId(obj.groupId ?? group.id ?? (typeof obj.group === "string" ? obj.group : undefined)) || null,
    groupName: asString(obj.groupName ?? group.name ?? (typeof obj.group === "string" ? obj.group : "")),
    teacherId: asId(obj.teacherId ?? teacher.id ?? (typeof obj.teacher === "string" ? obj.teacher : undefined)) || null,
    teacherName: asString(
      obj.teacherName ?? teacher.name ?? teacher.fullName ?? (typeof obj.teacher === "string" ? obj.teacher : "")
    ),
    attendanceStatus: normalizeReportAttendanceStatus(obj.attendanceStatus ?? obj.attendance),
    comment: obj.comment ? asString(obj.comment) : obj.lastComment ? asString(obj.lastComment) : null,
  };
};

const normalizeReportRows = (raw: unknown): AttendanceReportRow[] => {
  const list = Array.isArray(raw) ? raw : [];
  return list.map((item, index) => normalizeReportRow(item, index));
};

export const attendancesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    groupAttendanceDates: builder.query<string[], GroupAttendanceQueryArgs>({
      query: ({ groupId, month }) => ({
        url: `${PATHS.ATTENDANCES}/group/${groupId}/dates?month=${month}`,
        method: "GET",
      }),
      transformResponse: (response: { data: unknown }) => normalizeDates(response?.data),
      providesTags: ["attendance"],
    }),
    groupAttendance: builder.query<AttendanceRecord[], GroupAttendanceQueryArgs>({
      query: ({ groupId, month }) => ({
        url: `${PATHS.ATTENDANCES}/group/${groupId}?month=${month}`,
        method: "GET",
      }),
      transformResponse: (response: { data: unknown }) => normalizeRecords(response?.data),
      providesTags: ["attendance"],
    }),
    attendanceReport: builder.query<AttendanceReportResult, AttendanceReportQueryArgs>({
      query: (args) => {
        const qs = new URLSearchParams();
        if (args.date) qs.set("date", args.date);
        if (args.name) qs.set("name", args.name);
        if (args.phone) qs.set("phone", args.phone);
        if (args.status) qs.set("status", args.status);
        if (args.groupId) qs.set("groupId", args.groupId);
        if (args.teacherId) qs.set("teacherId", args.teacherId);
        if (args.attendanceStatus) qs.set("attendanceStatus", args.attendanceStatus);
        if (args.branchId) qs.set("branchId", args.branchId);
        qs.set("page", String(args.page ?? 1));
        qs.set("limit", String(args.limit ?? 10));
        return {
          url: `${PATHS.ATTENDANCES}/report?${qs.toString()}`,
          method: "GET",
        };
      },
      transformResponse: (response: { success: boolean; data: unknown; meta?: unknown }) => {
        // TEMP DEBUG — remove once the real row shape is confirmed.
        if (import.meta.env.DEV) console.log("[attendancesApi] report raw response:", response);
        return {
          rows: normalizeReportRows(response?.data),
          meta: normalizeReportMeta(response?.meta),
        };
      },
      providesTags: ["attendance"],
    }),
    saveAttendance: builder.mutation<SaveAttendanceResponse, SaveAttendanceRequest>({
      // Swagger labels this endpoint's body as multipart/form-data, but that
      // was confirmed wrong against the real backend: sending `records` as a
      // multipart field (JSON-stringified) 400'd, because a multipart parser
      // (multer/busboy) hands the array-typed DTO field a raw string instead
      // of parsing it back into an array, which fails validation. This
      // endpoint has no file to upload (unlike students/leads/rooms, which
      // genuinely use multipart for photo fields), so the Swagger label here
      // looks like a documentation artifact — plain JSON is what the backend
      // actually accepts.
      query: (body) => ({
        url: PATHS.ATTENDANCES,
        method: "POST",
        body,
      }),
      invalidatesTags: ["attendance"],
    }),
    // GET /attendances/group/{id}/excel — confirmed via Swagger: downloads the
    // group's monthly attendance sheet as a file. Modeled as a lazy query
    // returning a Blob (fetchBaseQuery's responseHandler reads the raw
    // response) since it's a one-off download trigger, not cached list data.
    groupAttendanceExcel: builder.query<Blob, GroupAttendanceQueryArgs>({
      query: ({ groupId, month }) => ({
        url: `${PATHS.ATTENDANCES}/group/${groupId}/excel?month=${month}`,
        method: "GET",
        responseHandler: (response) => response.blob(),
      }),
    }),
  }),
});

export const {
  useGroupAttendanceDatesQuery,
  useGroupAttendanceQuery,
  useAttendanceReportQuery,
  useSaveAttendanceMutation,
  useLazyGroupAttendanceExcelQuery,
} = attendancesApi;
