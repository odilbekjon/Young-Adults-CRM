import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
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
import type { RootState } from "../../../../../app/store";
import { DatePickerField } from "../../../../SingleGroup/DatePickerField";

const PAGE_SIZE = 10;

// A membership only shows up here once its status moves away from
// ACTIVE/PROBATION/FROZEN — same definition SingleGroup.tsx already uses to
// decide a student "left" a group (see its `archived` derivation).
const LEFT_STATUSES: StudentGroupStatus[] = ["INACTIVE", "DELETED"];

interface LeftStudentRow {
  id: string;
  studentId: string;
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

const selectSx = {
  height: 38,
  fontSize: "0.82rem",
  borderRadius: "6px",
  backgroundColor: "#fff",
  "& fieldset": { borderColor: "#e5e7eb" },
  "&:hover fieldset": { borderColor: "#9ca3af" },
  "&.Mui-focused fieldset": { borderColor: "#29b6f6" },
};

const inputSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "6px",
    fontSize: "0.82rem",
    height: 38,
    backgroundColor: "#fff",
    "& fieldset": { borderColor: "#e5e7eb" },
    "&:hover fieldset": { borderColor: "#9ca3af" },
    "&.Mui-focused fieldset": { borderColor: "#29b6f6" },
  },
};

// ─── Component ────────────────────────────────────────────────────────────────
export const StudentLeft = () => {
  const { t } = useTranslation();
  const selectedBranchId = useSelector((s: RootState) => s.branch.selectedBranchId);

  const [tab, setTab] = useState<"new" | "old">("new");
  const [page, setPage] = useState(1);

  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");
  const [course, setCourse] = useState("");
  const [groupId, setGroupId] = useState("");
  const [teacher, setTeacher] = useState("");
  const [reasonId, setReasonId] = useState("");
  const [status, setStatus] = useState<"" | StudentGroupStatus>("");

  // Applied filters (only applied on "Filter" click)
  const [applied, setApplied] = useState({
    search: "",
    course: "",
    groupId: "",
    teacher: "",
    reasonId: "",
    status: "" as "" | StudentGroupStatus,
    startDate: "",
    endDate: "",
  });

  const handleFilter = () => {
    setApplied({ search, course, groupId, teacher, reasonId, status, startDate, endDate });
    setPage(1);
  };

  const handleReset = () => {
    setSearch(""); setCourse(""); setGroupId(""); setTeacher("");
    setReasonId(""); setStatus(""); setStartDate(""); setEndDate("");
    setApplied({ search: "", course: "", groupId: "", teacher: "", reasonId: "", status: "", startDate: "", endDate: "" });
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
  const { data: reasonOptions } = useReasonsSelectQuery(undefined, { skip: tab === "old" });

  const groupById = useMemo(
    () => new Map((groupsData?.data ?? []).map((g) => [g.id, g])),
    [groupsData]
  );

  const rows: LeftStudentRow[] = useMemo(
    () =>
      (studentGroupsData?.rows ?? [])
        .filter((m) => LEFT_STATUSES.includes(m.status as StudentGroupStatus))
        .map((m) => {
          const g = groupById.get(m.groupId);
          return {
            id: m.id,
            studentId: m.studentId,
            name: m.studentName || "—",
            phone: m.studentPhone || "",
            course: g?.course?.name ?? "—",
            group: m.groupName || g?.name || "—",
            teacher: g?.teachers?.map((tc) => tc.name).join(", ") || "—",
            status: m.status,
            reason: m.reason ?? "—",
            comment: m.comment ?? "—",
            staff: m.processedBy ?? "—",
            staffTime: m.exitedAt ?? m.updatedAt ?? "—",
          };
        }),
    [studentGroupsData, groupById]
  );

  const COURSES = useMemo(() => (coursesData?.data ?? []).map((c) => c.name), [coursesData]);
  const GROUPS = useMemo(() => (groupsData?.data ?? []).map((g) => ({ id: g.id, name: g.name })), [groupsData]);
  const TEACHERS = useMemo(
    () => [...new Set((groupsData?.data ?? []).flatMap((g) => g.teachers?.map((tc) => tc.name) ?? []))],
    [groupsData]
  );
  const STATUSES: StudentGroupStatus[] = LEFT_STATUSES;

  const filtered = rows.filter((r) => {
    return (
      (!applied.course || r.course === applied.course) &&
      (!applied.teacher || r.teacher.split(", ").includes(applied.teacher)) &&
      (!applied.reasonId || r.reason === (reasonOptions ?? []).find((o) => o.id === applied.reasonId)?.name) &&
      (!applied.status || r.status === applied.status) &&
      (!applied.startDate || r.staffTime >= applied.startDate) &&
      (!applied.endDate || r.staffTime <= applied.endDate)
    );
  });

  // `filtered` is already just this one server page's rows narrowed to the
  // LEFT_STATUSES/course/teacher/reason/date filters — no further slicing.
  const totalPages = studentGroupsData?.meta?.totalPages ?? 1;
  const pageData = filtered;
  const busy = tab === "new" && (isLoading || isFetching);
  const statusLabel = (s: string) => t(`settings.office.studentLeft.statusLabels.${s}`, s);

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
          {/* Filters Row 1 */}
          <div className="flex flex-wrap gap-2 mb-2">
            {/* Start date */}
            <DatePickerField value={startDate} onChange={setStartDate} />
            {/* End date */}
            <DatePickerField value={endDate} onChange={setEndDate} />
            {/* Search */}
            <TextField
              size="small"
              placeholder={t("settings.office.studentLeft.filters.searchByNameOrPhone")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleFilter()}
              sx={{ ...inputSx, width: 200 }}
            />
            {/* Course */}
            <Select displayEmpty size="small" value={course} onChange={(e) => setCourse(e.target.value)} sx={{ ...selectSx, width: 150 }}>
              <MenuItem value=""><em style={{ color: "#9ca3af", fontStyle: "normal" }}>{t("settings.office.studentLeft.filters.course")}</em></MenuItem>
              {COURSES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
            {/* Group */}
            <Select displayEmpty size="small" value={groupId} onChange={(e) => setGroupId(e.target.value)} sx={{ ...selectSx, width: 150 }}>
              <MenuItem value=""><em style={{ color: "#9ca3af", fontStyle: "normal" }}>{t("settings.office.studentLeft.filters.group")}</em></MenuItem>
              {GROUPS.map((g) => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
            </Select>
            {/* Teachers */}
            <Select displayEmpty size="small" value={teacher} onChange={(e) => setTeacher(e.target.value)} sx={{ ...selectSx, width: 170 }}>
              <MenuItem value=""><em style={{ color: "#9ca3af", fontStyle: "normal" }}>{t("settings.office.studentLeft.filters.teachers")}</em></MenuItem>
              {TEACHERS.map((tc) => <MenuItem key={tc} value={tc}>{tc}</MenuItem>)}
            </Select>
            {/* Reasons */}
            <Select displayEmpty size="small" value={reasonId} onChange={(e) => setReasonId(e.target.value)} sx={{ ...selectSx, width: 190 }}>
              <MenuItem value=""><em style={{ color: "#9ca3af", fontStyle: "normal" }}>{t("settings.office.studentLeft.filters.reasonsForArchiving")}</em></MenuItem>
              {(reasonOptions ?? []).map((r) => <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>)}
            </Select>
          </div>

          {/* Filters Row 2 */}
          <div className="flex items-center gap-2 mb-5">
            <Select displayEmpty size="small" value={status} onChange={(e) => setStatus(e.target.value as "" | StudentGroupStatus)} sx={{ ...selectSx, width: 140 }}>
              <MenuItem value=""><em style={{ color: "#9ca3af", fontStyle: "normal" }}>{t("settings.office.studentLeft.filters.status")}</em></MenuItem>
              {STATUSES.map((s) => <MenuItem key={s} value={s}>{statusLabel(s)}</MenuItem>)}
            </Select>
            <Button
              variant="contained"
              onClick={handleFilter}
              sx={{
                backgroundColor: "#29b6f6",
                "&:hover": { backgroundColor: "#0288d1" },
                textTransform: "none",
                fontWeight: 600,
                borderRadius: "6px",
                height: 38,
                px: 3,
                boxShadow: "none",
              }}
            >
              {t("settings.office.studentLeft.filters.filter")}
            </Button>
            <button
              onClick={handleReset}
              className="flex items-center justify-center w-9 h-9 border border-gray-200 rounded-md bg-white text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <MdRefresh size={18} />
            </button>
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
