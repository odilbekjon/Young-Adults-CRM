import { baseApi } from "../baseApi";
import { PATHS } from "./paths";
import { decimalToNumber } from "../../../utils/decimal";
import { ArchiveRecord, ArchivesRequest, ArchivesResponse } from "./types";

// Backend ba'zan ro'yxatni tekis massiv, ba'zan {data: [...], meta} ko'rinishida
// qaytarishi mumkin — ikkalasini ham massivga normallashtiramiz (leadsApi/
// roomsApi'dagi bir xil naqsh).
const normalizeList = <T,>(data: unknown): T[] => {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && Array.isArray((data as { data?: unknown }).data)) {
    return (data as { data: T[] }).data;
  }
  return [];
};

type Row = Record<string, unknown>;

const isRow = (v: unknown): v is Row => !!v && typeof v === "object" && !Array.isArray(v);

const text = (v: unknown): string | null => {
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number") return String(v);
  return null;
};

// A person/reason can arrive as a bare string, or as {id, name} / {firstName,
// lastName} / {fullName}. Returns the display name only.
const refName = (v: unknown): string | null => {
  if (isRow(v)) {
    const full = text(v.name) ?? text(v.fullName);
    if (full) return full;
    return [text(v.firstName), text(v.lastName)].filter(Boolean).join(" ") || null;
  }
  return text(v);
};

const refId = (v: unknown): string | null => (isRow(v) ? text(v.id) : null);

const firstOf = (r: Row, keys: string[]): unknown => {
  for (const k of keys) {
    const v = r[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
};

// Students are archived through POST /students/{id}/status whose only free-
// text field is `reason`; the UI stores "<reason name> — <comment>" in it
// (see Students/StudentProfile/SingleGroup archive handlers). When the
// backend echoes that single string back with no separate comment, split it
// again so the Reason and Comment columns line up.
const SEPARATOR = " — ";

// Restore (toggle-status) and permanent delete both address the underlying
// student/teacher/staff record, never the archive row itself — so when the
// backend sends a role-specific id next to its own `id`, that one wins.
// `id` stays the fallback (and the only source for rows without such a key).
const ENTITY_ID_KEYS: Record<string, string[]> = {
  STUDENT: ["studentId"],
  TEACHER: ["teacherId"],
  ADMIN: ["userId"],
  SUPERADMIN: ["userId"],
};

const entityIdOf = (r: Row): string => {
  const role = (text(r.role) ?? "").toUpperCase();
  const keys = ENTITY_ID_KEYS[role] ?? [];
  for (const k of keys) {
    const v = text(r[k]);
    if (v) return v;
  }
  const nested = refId(r[role.toLowerCase()]);
  return nested ?? text(r.id) ?? text(r.userId) ?? "";
};

// GET /archives' response schema isn't published (Swagger only expands the
// request), so each row is normalized defensively over the field names the
// backend might use — same approach as groupsApi's normalizeStudentGroupRecord.
const normalizeArchiveRecord = (r: Row): ArchiveRecord => {
  const reasonRaw = firstOf(r, ["reason", "reasonName", "archiveReason", "archivedReason", "removalReason", "statusReason"]);
  let reasonName = refName(reasonRaw);
  let comment = text(firstOf(r, ["comment", "reasonComment", "archiveComment", "archivedComment", "note", "notes", "remark", "description"]));

  if (reasonName && !comment && typeof reasonRaw === "string" && reasonName.includes(SEPARATOR)) {
    const at = reasonName.indexOf(SEPARATOR);
    comment = reasonName.slice(at + SEPARATOR.length).trim() || null;
    reasonName = reasonName.slice(0, at).trim() || null;
  }

  const reasonId = text(r.reasonId) ?? refId(reasonRaw);
  const byRaw = firstOf(r, ["archivedBy", "archivedByName", "archivedByUser", "processedBy", "updatedBy", "modifiedBy", "actor", "staff"]);
  const byName = refName(byRaw);
  const branchRaw = firstOf(r, ["branch", "branchName"]);
  const branchName = refName(branchRaw);

  return {
    ...(r as unknown as ArchiveRecord),
    id: entityIdOf(r),
    name: refName(r) ?? "",
    phone: text(r.phone),
    role: text(r.role),
    balance: decimalToNumber(r.balance),
    branch: branchName ? { id: refId(branchRaw) ?? "", name: branchName } : null,
    reason: reasonName ? { id: reasonId ?? "", name: reasonName } : null,
    reasonId,
    comment,
    archivedBy: byName ? { id: refId(byRaw) ?? "", name: byName } : null,
    archivedAt: text(firstOf(r, ["archivedAt", "archivedDate", "archived_at", "deletedAt", "statusChangedAt", "updatedAt"])),
  };
};

export const archivesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    allArchives: builder.query<ArchivesResponse, ArchivesRequest | void>({
      query: ({
        page = 1, limit = 10, search, status, branchId, role, reasonId, startDate, endDate,
      } = {}) => {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", String(limit));
        if (search) params.set("search", search);
        if (status) params.set("status", status);
        if (branchId) params.set("branchId", branchId);
        if (role) params.set("role", role);
        if (reasonId) params.set("reasonId", reasonId);
        if (startDate) params.set("startDate", startDate);
        if (endDate) params.set("endDate", endDate);
        return {
          url: `${PATHS.ARCHIVES}?${params.toString()}`,
          method: "GET",
        };
      },
      transformResponse: (response: ArchivesResponse) => {
        const rows = normalizeList<Row>(response.data);
        // Dev-only: lets the real field names be checked in the console when
        // a column comes back empty.
        if (import.meta.env.DEV && rows[0]) console.info("[archives] first raw row", rows[0]);
        return { ...response, data: rows.map(normalizeArchiveRecord) };
      },
      providesTags: ["archive"],
    }),
  }),
});

export const { useAllArchivesQuery } = archivesApi;
