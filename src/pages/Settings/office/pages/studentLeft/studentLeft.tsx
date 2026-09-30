import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Button,
  Checkbox,
  CircularProgress,
  MenuItem,
  Pagination,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { MdRefresh, MdTune, MdViewColumn } from "react-icons/md";

import { useAllGroupsQuery, useStudentGroupsQuery } from "../../../../../app/api/groupsApi";
import type { StudentGroupStatus } from "../../../../../app/api/groupsApi/types";
import { useAllCoursesQuery } from "../../../../../app/api/coursesApi";
import { useReasonsSelectQuery } from "../../../../../app/api/reasonsApi";
import { useStudentFreezesQuery } from "../../../../../app/api/studentFreezesApi";
import type { StudentFreezeRecord } from "../../../../../app/api/studentFreezesApi/types";
import { useStaffUsersSelectQuery } from "../../../../../app/api/usersApi";
import type { RootState } from "../../../../../app/store";
import { DatePickerField } from "../../../../SingleGroup/DatePickerField";

const PAGE_SIZE = 10;
const REASONS_LIMIT = 200;
const FREEZES_LIMIT = 200;

// A membership only shows up here once its status moves away from
// ACTIVE/PROBATION/FROZEN — same definition SingleGroup.tsx already uses to
// decide a student "left" a group (see its `archived` derivation).
const LEFT_STATUSES: StudentGroupStatus[] = ["INACTIVE", "DELETED"];

// What the student's membership was at the moment they left the group. The
// backend keeps no "status before leaving" field on /student-groups rows (the
// row just ends up INACTIVE/DELETED), so it is derived — see `leftAsOf`.
type LeftAs = "trial" | "frozen" | "active";
const LEFT_AS_OPTIONS: LeftAs[] = ["trial", "frozen", "active"];

interface LeftStudentRow {
  id: string;
  studentId: string;
  groupId: string;
  leftAs: LeftAs;
  reasonId: string;
  name: string;
  phone: string;
  course: string;
  group: string;
  teacher: string;
  status: string;
  reason: string;
  comment: string;
  staff: string;
  staffTime: string;
}

// Maps the tab id (used for state/comparison) to its translation key.
const TAB_LABEL_KEYS: Record<"new" | "old", string> = {
  new: "settings.office.studentLeft.tabs.new",
  old: "settings.office.studentLeft.tabs.old",
};

// Filter controls: white, thin border, 6px radius, 40px tall; the blue border
// shows while a select is open/focused.
const FIELD_HEIGHT = 40;
const FOCUS_BORDER = "#29b6f6";

const selectSx = {
  height: FIELD_HEIGHT,
  fontSize: "0.82rem",
  borderRadius: "6px",
  backgroundColor: "#fff",
  "& fieldset": { borderColor: "#e5e7eb", borderWidth: 1 },
  "&:hover fieldset": { borderColor: "#9ca3af" },
  "&.Mui-focused fieldset": { borderColor: FOCUS_BORDER, borderWidth: 1 },
};

const inputSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "6px",
    fontSize: "0.82rem",
    height: FIELD_HEIGHT,
    backgroundColor: "#fff",
    "& fieldset": { borderColor: "#e5e7eb", borderWidth: 1 },
    "&:hover fieldset": { borderColor: "#9ca3af" },
    "&.Mui-focused fieldset": { borderColor: FOCUS_BORDER, borderWidth: 1 },
  },
};

// Dropdown list opens right below the select (not over it).
const menuProps = {
  anchorOrigin: { vertical: "bottom", horizontal: "left" },
  transformOrigin: { vertical: "top", horizontal: "left" },
  slotProps: {
    paper: {
      sx: {
        mt: 0.5,
        maxHeight: 280,
        borderRadius: "6px",
        border: "1px solid #e5e7eb",
        boxShadow: "0 6px 16px rgba(0,0,0,0.08)",
        "& .MuiMenuItem-root": { fontSize: "0.82rem" },
      },
    },
  },
} as const;

// DatePickerField's trigger is styled with inline styles (big modal-style
// field, 10px radius, 12px padding) and is shared with modals, so it isn't
// touched — the filter bar scopes an override to `.sl-date` instead so the
// trigger matches the other 40px filter controls and never clips its text.
const DATE_FIELD_CSS = `
.sl-date { width: 100%; min-width: 0; }
.sl-date > div:first-child {
  box-sizing: border-box !important;
  width: 100% !important;
  height: ${FIELD_HEIGHT}px !important;
  padding: 0 12px !important;
  gap: 8px !important;
  border-radius: 6px !important;
  border-color: #e5e7eb !important;
  background: #fff !important;
  min-width: 0;
}
.sl-date > div:first-child:hover { border-color: #9ca3af !important; }
.sl-date > div:first-child svg { flex-shrink: 0; width: 16px; height: 16px; }
.sl-date > div:first-child span {
  font-size: 0.82rem !important;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
`;

const isoDay = (v: string) => (/^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : "");

// Derives the membership's state when the student left, from the fields the
// API really exposes:
//  - frozen: a /student-freezes record for this membership was ACTIVE, or its
//    [startDate, endDate] window covers the exit date;
//  - trial:  never activated — Activate/graduate-trial always stamps
//    paymentStartDate, so a null one means they left during the trial;
//  - active: activated (paymentStartDate set) and not frozen.
const leftAsOf = (
  m: { paymentStartDate: string | null; exitedAt: string | null; updatedAt: string | null },
  freezes: StudentFreezeRecord[]
): LeftAs => {
  const exitDay = isoDay(m.exitedAt ?? m.updatedAt ?? "");
  const wasFrozen = freezes.some(
    (f) =>
      f.status === "ACTIVE" ||
      (!!exitDay && f.status !== "CANCELLED" && f.startDate <= exitDay && (!f.endDate || exitDay <= f.endDate))
  );
  if (wasFrozen) return "frozen";
  return m.paymentStartDate ? "active" : "trial";
};

// ─── Component ────────────────────────────────────────────────────────────────
export const StudentLeft = () => {
  const { t } = useTranslation();
  const selectedBranchId = useSelector((s: RootState) => s.branch.selectedBranchId);

  const [tab, setTab] = useState<"new" | "old">("new");
  const [page, setPage] = useState(1);

  // Read once on mount so links open pre-filtered — same "read once into
  // initial state" convention already used by Finance > All Payments for its
  // Dashboard-driven date range:
  //  - ?leftType=trial|active (Dashboard cards) preselects the Status filter;
  //  - ?status=INACTIVE|DELETED (legacy) filters by the membership's own
  //    status; it has no dropdown of its own and is cleared by Reset.
  const [searchParams] = useSearchParams();
  const leftTypeParam = searchParams.get("leftType");
  const initialLeftAs: "" | LeftAs =
    leftTypeParam === "trial" || leftTypeParam === "active" || leftTypeParam === "frozen" ? leftTypeParam : "";
  const initialStatusParam = searchParams.get("status");
  const initialMembershipStatus: "" | StudentGroupStatus =
    initialStatusParam === "INACTIVE" || initialStatusParam === "DELETED" ? initialStatusParam : "";

  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");
  const [course, setCourse] = useState("");
  const [groupId, setGroupId] = useState("");
  const [teacher, setTeacher] = useState("");
  const [staff, setStaff] = useState("");
  const [reasonId, setReasonId] = useState("");
  const [status, setStatus] = useState<"" | LeftAs>(initialLeftAs);

  // Applied filters (only applied on "Filter" click)
  const [applied, setApplied] = useState<{
    search: string; course: string; groupId: string; teacher: string; staff: string;
    reasonId: string; status: "" | LeftAs; startDate: string; endDate: string;
    membershipStatus: "" | StudentGroupStatus;
  }>({
    search: "",
    course: "",
    groupId: "",
    teacher: "",
    staff: "",
    reasonId: "",
    status: initialLeftAs,
    startDate: "",
    endDate: "",
    membershipStatus: initialMembershipStatus,
  });

  const handleFilter = () => {
    setApplied((prev) => ({
      search, course, groupId, teacher, staff, reasonId, status, startDate, endDate,
      membershipStatus: prev.membershipStatus,
    }));
    setPage(1);
  };

  const handleReset = () => {
    setSearch(""); setCourse(""); setGroupId(""); setTeacher(""); setStaff("");
    setReasonId(""); setStatus(""); setStartDate(""); setEndDate("");
    setApplied({
      search: "", course: "", groupId: "", teacher: "", staff: "", reasonId: "", status: "",
      startDate: "", endDate: "", membershipStatus: "",
    });
    setPage(1);
  };

  // Changing the globally-selected branch re-queries the backend with a
  // different result set — reset to page 1 so the user isn't stranded on a
  // page number that no longer exists for the new branch.
  useEffect(() => {
    setPage(1);
  }, [selectedBranchId]);

  // GET /student-groups — branchId/search/groupId are supported server-side
  // (same query the SingleGroup page uses for its own roster); course/
  // teacher/date-range aren't documented params on this endpoint, so those
  // are applied client-side below, same as Groups.tsx already does for its
  // own branch-name filter on top of a server page. Real page/limit are sent
  // (rather than a fixed large limit sliced client-side) so rows beyond a
  // single page are actually reachable — this does mean a given page can mix
  // in non-"left" memberships that the LEFT_STATUSES filter below then
  // excludes, so a page can render fewer than PAGE_SIZE rows; there's no
  // documented way to filter by multiple statuses server-side to avoid that.
  const {
    data: studentGroupsData,
    isLoading,
    isFetching,
    isError,
  } = useStudentGroupsQuery(
    {
      branchId: selectedBranchId ?? undefined,
      groupId: applied.groupId || undefined,
      status: applied.membershipStatus || undefined,
      search: applied.search || undefined,
      page,
      limit: PAGE_SIZE,
    },
    { skip: tab === "old" }
  );

  // Reference data for enrichment (course/teacher aren't on StudentGroupRecord
  // itself — only groupName/groupId are) and for the filter dropdowns' real
  // option lists, same pattern Groups.tsx uses for its own filters.
  const { data: groupsData } = useAllGroupsQuery({ page: 1, limit: 100 }, { skip: tab === "old" });
  const { data: coursesData } = useAllCoursesQuery(undefined, { skip: tab === "old" });
  // GET /reasons/select — the same active-reasons list Settings > Reasons
  // manages (reasonsApi) and SingleGroup's "remove student" dialog stores
  // `reasonId` from, so the option ids match StudentGroupRecord.reasonId.
  const { data: reasonOptions } = useReasonsSelectQuery(
    { page: 1, limit: REASONS_LIMIT },
    { skip: tab === "old" }
  );
  // GET /student-freezes — needed to tell whether a student was frozen at the
  // moment they left (see leftAsOf).
  const { data: freezesData } = useStudentFreezesQuery(
    { page: 1, limit: FREEZES_LIMIT },
    { skip: tab === "old" }
  );
  // GET /users/select — branchId required per Swagger; same branch scoping
  // every other filter dropdown on this page already uses.
  const { data: staffOptions } = useStaffUsersSelectQuery(selectedBranchId ?? "", {
    skip: tab === "old" || !selectedBranchId,
  });

  const groupById = useMemo(
    () => new Map((groupsData?.data ?? []).map((g) => [g.id, g])),
    [groupsData]
  );

  const reasonNameById = useMemo(
    () => new Map((reasonOptions ?? []).map((r) => [r.id, r.name])),
    [reasonOptions]
  );

  const freezesByMembership = useMemo(() => {
    const map = new Map<string, StudentFreezeRecord[]>();
    const push = (key: string, f: StudentFreezeRecord) => map.set(key, [...(map.get(key) ?? []), f]);
    (freezesData?.rows ?? []).forEach((f) => {
      if (f.studentGroupId) push(`sg:${f.studentGroupId}`, f);
      else if (f.groupId) push(`${f.studentId}|${f.groupId}`, f);
    });
    return map;
  }, [freezesData]);

  const rows: LeftStudentRow[] = useMemo(
    () =>
      (studentGroupsData?.rows ?? [])
        .filter((m) => LEFT_STATUSES.includes(m.status as StudentGroupStatus))
        .map((m) => {
          const g = groupById.get(m.groupId);
          const freezes = [
            ...(freezesByMembership.get(`sg:${m.id}`) ?? []),
            ...(freezesByMembership.get(`${m.studentId}|${m.groupId}`) ?? []),
          ];
          return {
            id: m.id,
            studentId: m.studentId,
            groupId: m.groupId,
            leftAs: leftAsOf(m, freezes),
            reasonId: m.reasonId ?? "",
            name: m.studentName || "—",
            phone: m.studentPhone || "",
            course: g?.course?.name ?? "—",
            group: m.groupName || g?.name || "—",
            teacher: g?.teachers?.map((tc) => tc.name).join(", ") || "—",
            status: m.status,
            // `reason` is only free text on some responses; the Reason record
            // itself is referenced by reasonId, so prefer its real name.
            reason: (m.reasonId && reasonNameById.get(m.reasonId)) || m.reason || "—",
            comment: m.comment ?? "—",
            staff: m.processedBy ?? "—",
            staffTime: m.exitedAt ?? m.updatedAt ?? "—",
          };
        }),
    [studentGroupsData, groupById, freezesByMembership, reasonNameById]
  );

  const COURSES = useMemo(() => (coursesData?.data ?? []).map((c) => c.name), [coursesData]);
  const GROUPS = useMemo(() => (groupsData?.data ?? []).map((g) => ({ id: g.id, name: g.name })), [groupsData]);
  const TEACHERS = useMemo(
    () => [...new Set((groupsData?.data ?? []).flatMap((g) => g.teachers?.map((tc) => tc.name) ?? []))],
    [groupsData]
  );
  // StudentGroupRecord.processedBy (LeftStudentRow.staff) is a free-text name,
  // not a confirmed id (see its own defensive-typing comment in
  // groupsApi/types.d.ts) — matched by name here, same as the Teachers filter.
  const STAFF_NAMES = useMemo(() => (staffOptions ?? []).map((s) => s.name), [staffOptions]);

  const filtered = rows.filter((r) => {
    const day = isoDay(r.staffTime);
    return (
      (!applied.course || r.course === applied.course) &&
      (!applied.teacher || r.teacher.split(", ").includes(applied.teacher)) &&
      (!applied.staff || r.staff === applied.staff) &&
      (!applied.reasonId ||
        r.reasonId === applied.reasonId ||
        (!!reasonNameById.get(applied.reasonId) && r.reason === reasonNameById.get(applied.reasonId))) &&
      (!applied.status || r.leftAs === applied.status) &&
      (!applied.startDate || (!!day && day >= applied.startDate)) &&
      (!applied.endDate || (!!day && day <= applied.endDate))
    );
  });

  // `filtered` is already just this one server page's rows narrowed to the
  // LEFT_STATUSES/course/teacher/reason/date filters — no further slicing.
  const totalPages = studentGroupsData?.meta?.totalPages ?? 1;
  const pageData = filtered;
  const busy = tab === "new" && (isLoading || isFetching);
  const statusLabel = (s: string) => t(`settings.office.studentLeft.statusLabels.${s}`, s);
  const leftAsLabel = (s: LeftAs) => t(`settings.office.studentLeft.leftStatuses.${s}`);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Typography variant="h5" sx={{ fontWeight: 700, color: "#1f2937" }}>
          {t("settings.office.studentLeft.title")}
        </Typography>
        <Typography variant="body2" sx={{ color: "#6b7280" }}>
          {t("settings.office.studentLeft.quantity", { count: filtered.length })}
        </Typography>
      </div>

      {/* Attention Banner */}
      <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-5">
        <div className="mt-0.5 flex-shrink-0 bg-green-500 rounded-full p-0.5">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 7l3.5 3.5L12 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <p className="text-green-700 font-semibold text-sm mb-0.5">{t("settings.office.studentLeft.attentionBanner.title")}</p>
          <p className="text-green-700 text-xs leading-relaxed">
            {t("settings.office.studentLeft.attentionBanner.message")}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 mb-5 border border-gray-200 rounded-md w-fit bg-white overflow-hidden">
        {(["new", "old"] as const).map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => { setTab(tabKey); setPage(1); }}
            className={`px-5 py-1.5 text-sm font-medium capitalize transition-colors ${
              tab === tabKey
                ? "bg-white text-gray-800 border-b-2 border-blue-400"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            {t(TAB_LABEL_KEYS[tabKey])}
          </button>
        ))}
      </div>

      {tab === "old" ? (
        <div className="bg-white rounded-lg shadow-sm py-16 text-center text-gray-400 text-sm">
          {t("settings.office.studentLeft.oldTableUnavailable")}
        </div>
      ) : (
        <>
          {/* Filters — two compact rows on desktop (6 columns): dates, search,
              course, group, teachers / staff, reasons, status, Filter + Reset.
              Wraps into fewer columns on narrower screens. */}
          <style>{DATE_FIELD_CSS}</style>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 mb-4 items-center">
            {/* Start date */}
            <div className="sl-date">
              <DatePickerField
                value={startDate}
                onChange={setStartDate}
                placeholder={t("settings.office.studentLeft.filters.startDate")}
              />
            </div>
            {/* End date */}
            <div className="sl-date">
              <DatePickerField
                value={endDate}
                onChange={setEndDate}
                placeholder={t("settings.office.studentLeft.filters.endDate")}
              />
            </div>
            {/* Search */}
            <TextField
              size="small"
              fullWidth
              placeholder={t("settings.office.studentLeft.filters.searchByNameOrPhone")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleFilter()}
              sx={inputSx}
            />
            {/* Course */}
            <Select displayEmpty fullWidth size="small" value={course} onChange={(e) => setCourse(e.target.value)} MenuProps={menuProps} sx={selectSx}>
              <MenuItem value=""><em style={{ color: "#9ca3af", fontStyle: "normal" }}>{t("settings.office.studentLeft.filters.course")}</em></MenuItem>
              {COURSES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
            {/* Group */}
            <Select displayEmpty fullWidth size="small" value={groupId} onChange={(e) => setGroupId(e.target.value)} MenuProps={menuProps} sx={selectSx}>
              <MenuItem value=""><em style={{ color: "#9ca3af", fontStyle: "normal" }}>{t("settings.office.studentLeft.filters.group")}</em></MenuItem>
              {GROUPS.map((g) => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
            </Select>
            {/* Teachers */}
            <Select displayEmpty fullWidth size="small" value={teacher} onChange={(e) => setTeacher(e.target.value)} MenuProps={menuProps} sx={selectSx}>
              <MenuItem value=""><em style={{ color: "#9ca3af", fontStyle: "normal" }}>{t("settings.office.studentLeft.filters.teachers")}</em></MenuItem>
              {TEACHERS.map((tc) => <MenuItem key={tc} value={tc}>{tc}</MenuItem>)}
            </Select>
            {/* Staff */}
            <Select displayEmpty fullWidth size="small" value={staff} onChange={(e) => setStaff(e.target.value)} MenuProps={menuProps} sx={selectSx}>
              <MenuItem value=""><em style={{ color: "#9ca3af", fontStyle: "normal" }}>{t("settings.office.studentLeft.filters.staff")}</em></MenuItem>
              {STAFF_NAMES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </Select>
            {/* Reasons */}
            <Select displayEmpty fullWidth size="small" value={reasonId} onChange={(e) => setReasonId(e.target.value)} MenuProps={menuProps} sx={selectSx}>
              <MenuItem value=""><em style={{ color: "#9ca3af", fontStyle: "normal" }}>{t("settings.office.studentLeft.filters.reasonsForArchiving")}</em></MenuItem>
              {(reasonOptions ?? []).map((r) => <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>)}
            </Select>
            {/* Status — what the student was when they left the group */}
            <Select displayEmpty fullWidth size="small" value={status} onChange={(e) => setStatus(e.target.value as "" | LeftAs)} MenuProps={menuProps} sx={selectSx}>
              <MenuItem value=""><em style={{ color: "#9ca3af", fontStyle: "normal" }}>{t("settings.office.studentLeft.filters.status")}</em></MenuItem>
              {LEFT_AS_OPTIONS.map((s) => <MenuItem key={s} value={s}>{leftAsLabel(s)}</MenuItem>)}
            </Select>
            {/* Filter + Reset */}
            <div className="flex items-center gap-2">
              <Button
                variant="contained"
                onClick={handleFilter}
                sx={{
                  backgroundColor: "#29b6f6",
                  "&:hover": { backgroundColor: "#0288d1" },
                  textTransform: "none",
                  fontWeight: 600,
                  borderRadius: "6px",
                  height: FIELD_HEIGHT,
                  px: 3,
                  boxShadow: "none",
                  flexShrink: 0,
                }}
              >
                {t("settings.office.studentLeft.filters.filter")}
              </Button>
              <button
                type="button"
                onClick={handleReset}
                title={t("settings.office.studentLeft.filters.reset")}
                aria-label={t("settings.office.studentLeft.filters.reset")}
                className="flex items-center justify-center w-10 h-10 border border-gray-200 rounded-md bg-white text-gray-500 hover:bg-gray-50 transition-colors flex-shrink-0"
              >
                <MdRefresh size={18} />
              </button>
            </div>
          </div>

          {/* Table toolbar */}
          <div className="flex justify-end gap-2 mb-3">
            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-md bg-white text-gray-500 text-sm hover:bg-gray-50 transition-colors">
              <MdTune size={15} /> {t("settings.office.studentLeft.toolbar.filters")}
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-md bg-white text-gray-500 text-sm hover:bg-gray-50 transition-colors">
              <MdViewColumn size={15} /> {t("settings.office.studentLeft.toolbar.columns")}
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-3 py-3 w-8 text-left">
                    <Checkbox size="small" sx={{ color: "#d1d5db", "&.Mui-checked": { color: "#29b6f6" } }} />
                  </th>
                  {[
                    t("settings.office.studentLeft.table.number"),
                    t("settings.office.studentLeft.table.student"),
                    t("settings.office.studentLeft.table.phone"),
                    t("settings.office.studentLeft.table.course"),
                    t("settings.office.studentLeft.table.group"),
                    t("settings.office.studentLeft.table.teacher"),
                    t("settings.office.studentLeft.table.status"),
                    t("settings.office.studentLeft.table.reasonsForRemoval"),
                    t("settings.office.studentLeft.table.comment"),
                    t("settings.office.studentLeft.table.staff"),
                  ].map((h) => (
                    <th key={h} className="text-left px-3 py-3 text-gray-600 font-semibold text-xs whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {busy ? (
                  <tr>
                    <td colSpan={11} className="text-center py-12">
                      <CircularProgress size={26} />
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={11} className="text-center py-12 text-red-500 text-sm">
                      {t("settings.office.studentLeft.loadError")}
                    </td>
                  </tr>
                ) : pageData.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-12 text-gray-400">{t("settings.office.studentLeft.noData")}</td>
                  </tr>
                ) : (
                  pageData.map((r, idx) => (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-3">
                        <Checkbox size="small" sx={{ color: "#d1d5db", "&.Mui-checked": { color: "#29b6f6" } }} />
                      </td>
                      <td className="px-3 py-3 text-gray-500 text-sm">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                      <td className="px-3 py-3">
                        <span className="text-blue-500 cursor-pointer hover:underline font-medium whitespace-nowrap">
                          {r.name}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-700 font-medium whitespace-nowrap">{r.phone}</td>
                      <td className="px-3 py-3">
                        <span className="text-blue-500 cursor-pointer hover:underline">{r.course}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-blue-500 cursor-pointer hover:underline">{r.group}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-blue-500 cursor-pointer hover:underline whitespace-nowrap">{r.teacher}</span>
                      </td>
                      <td className="px-3 py-3 text-gray-700">{statusLabel(r.status)}</td>
                      <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{r.reason}</td>
                      <td className="px-3 py-3 text-gray-500">{r.comment}</td>
                      <td className="px-3 py-3">
                        <div className="text-blue-500 cursor-pointer hover:underline whitespace-nowrap text-sm">{r.staff}</div>
                        <div className="text-gray-400 text-xs">{r.staffTime}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center py-4 border-t border-gray-100">
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(_, v) => setPage(v)}
                  size="small"
                  sx={{
                    "& .MuiPaginationItem-root": { color: "#6b7280", borderRadius: "6px" },
                    "& .Mui-selected": { backgroundColor: "#29b6f6 !important", color: "#fff !important" },
                  }}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
