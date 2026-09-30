// src/pages/groups/SingleGroup.tsx

import {
  Box, Chip, CircularProgress, Divider, IconButton, List, ListItem,
  ListItemText, MenuItem, Paper, Select,
  Stack, Tab, Tabs, Typography, Button,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import type { RootState } from "../../app/store";
import { MdEdit, MdEmail, MdDownload, MdDelete, MdCalendarToday, MdKeyboardArrowDown } from "react-icons/md";
import { GoPlus } from "react-icons/go";
import { BsThreeDotsVertical } from "react-icons/bs";
import {
  findTeacherById,
  type Group as LegacyGroup,
} from "../../constants/Teachers";
import {
  useGroupByIdQuery,
  useLazyGroupForEditQuery,
  useGroupsSelectQuery,
  useAddStudentToGroupMutation,
  useTransferStudentMutation,
  useUpdateGroupMutation,
  useToggleGroupStatusMutation,
  useLazyGroupExcelQuery,
  useStudentGroupsQuery,
  useLazyStudentGroupsQuery,
  useFreezeStudentGroupMutation,
  useUnfreezeStudentGroupMutation,
  useUpdateStudentGroupStatusMutation,
  useUpdateStudentGroupMutation,
  useGraduateTrialStudentGroupMutation,
} from "../../app/api/groupsApi";
import type { GroupDetail, StudentGroupRecord, UpdateGroupRequest } from "../../app/api/groupsApi/types";
import {
  useAllStudentsQuery,
  useTransferStudentBranchMutation,
  useLazyStudentByIdQuery,
  useUpdateStudentStatusMutation,
} from "../../app/api/studentsApi";
import type { StudentDetail } from "../../app/api/studentsApi/types";
import { useAllCoursesQuery } from "../../app/api/coursesApi";
import { useAllRoomsQuery } from "../../app/api/roomsApi";
import { useAllBranchesQuery } from "../../app/api/branchesApi/branchesApi";
import { useTeachersSelectQuery } from "../../app/api/teachersApi";
import { useReasonsSelectQuery } from "../../app/api/reasonsApi";
import { useToast } from "../../Context/ToastContext";
import { extractApiError, formatTrainingDate } from "../../utils";
import { formatDate } from "../../constants/FlatStudents";

import { AddStudentDrawer, type AddStudentPayload } from "./AddStudentDrawer/AddStudentDrawer";
import { describeApiError } from "./describeApiError";

import { Attendance } from "./tabs/Attendance";
import { Grade } from "./tabs/Grade";
import { OnlineLessons } from "./tabs/OnlineLessons";
import { DiscountPrices } from "./tabs/DiscountPrices";
import { Exams } from "./tabs/Exams";
import { History } from "./tabs/History";
import { Comments } from "./tabs/Comments";

import { GroupStudent } from "./types";
import { ActionIconBtn } from "./ActionIconBtn";
import { StudentHoverCard } from "./StudentHoverCard";
import { StudentActionsMenu } from "./StudentActionsMenu";
import { FreezeModal } from "./FreezeModal";
import { ActivateModal } from "./ActivateModal";
import { GraduateTrialModal } from "./GraduateTrialModal";
import { EditGroupDrawer } from "./EditGroupDrawer";
import { SmsDrawer } from "../../components/SmsDrawer";
import { AddNoteModal } from "./AddNoteModal";
import { ReminderDrawer } from "./ReminderDrawer";
import { AddPayment } from "../../components/AddPayment";
import { MoveStudentDialog } from "./MoveStudentDialog";
import { RemoveStudentDialog } from "./RemoveStudentDialog";

const TAB_KEYS = [
  "attendance", "grade", "onlineLessons",
  "discountPrices", "exams", "history", "comments",
];

// GroupDetail.students carries no balance/archived/frozen status at all, so
// those start out as neutral defaults here and are corrected afterwards by
// overlaying real per-membership data from GET /student-groups (see
// combinedStudents below) — studentGroupId in particular comes only from
// that overlay, since it's the /student-groups row's own id, required by
// freeze/unfreeze/status-change calls (distinct from realId, the student's
// own id).
type RealGroupStudent = GroupStudent & { realId: string; studentGroupId?: string; isTrial?: boolean };

const pad2 = (n: number) => String(n).padStart(2, "0");
// Local calendar date as YYYY-MM-DD (toISOString() is UTC, which lands on the
// previous day for the first hours after midnight in UTC+5).
const todayLocalISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

// POST /student-groups' response envelope isn't documented beyond a 200, so
// the new membership's id is picked up defensively ({data: {id}} or {id}) and
// ignored if the row obviously belongs to a different group.
const membershipIdFromCreateResponse = (res: unknown, groupId: string): string | undefined => {
  if (!res || typeof res !== "object") return undefined;
  const container = res as Record<string, unknown>;
  const row = (container.data && typeof container.data === "object" && !Array.isArray(container.data)
    ? container.data
    : container) as Record<string, unknown>;
  if (typeof row.groupId === "string" && row.groupId !== groupId) return undefined;
  return typeof row.id === "string" && row.id ? row.id : undefined;
};

const toLegacyGroup = (d: GroupDetail): LegacyGroup => ({
  id: 0,
  name: d.name,
  badge: d.courseName,
  badgeColor: "blue",
  startDate: d.trainingStart ?? "",
  endDate: d.trainingEnd ?? "",
  schedule: `${d.daysType === "EVEN" ? "Even days" : d.daysType === "ODD" ? "Odd days" : d.daysType ?? "—"} · ${d.time ?? ""}`,
  room: d.roomName ?? "—",
  roomCapacity: d.roomCapacity ?? undefined,
  studentCount: d.students?.length ?? 0,
  students: [],
  course: d.courseName,
  teacher: d.teachers?.map((tch) => tch.name).join(", ") || "—",
  teacherId: 0,
  price: d.coursePrice?.d?.[0] ?? undefined,
  days: d.daysType === "EVEN" ? "Even days" : d.daysType === "ODD" ? "Odd days" : (d.daysType || "—"),
  lessonStartTime: d.time ?? "",
  branch: undefined,
});

const toRealStudents = (d: GroupDetail): RealGroupStudent[] =>
  (d.students ?? []).map((s, i) => ({
    id: i + 1,
    realId: s.id,
    name: s.name,
    phone: s.phone,
    active: true,
    archived: false,
    balance: 0,
  }));

// A student is archived-in-this-group if their /student-groups membership
// row (passed in already filtered to INACTIVE/DELETED — see the two
// separate status-scoped queries in SingleGroup, since the unscoped list
// excludes both) and they're not among GroupDetail's currently-active
// students. This is the authoritative per-group membership status, unlike
// the group history log (join/leave events), which only lets you infer
// "probably left" indirectly and can miss/misdate entries.
const deriveArchivedFromMemberships = (
  records: StudentGroupRecord[],
  activeStudentIds: Set<string>
): RealGroupStudent[] =>
  records
    .filter((r) => (r.status === "INACTIVE" || r.status === "DELETED") && !activeStudentIds.has(r.studentId))
    .map((r, i) => ({
      id: -(i + 1),
      realId: r.studentId,
      name: r.studentName || "—",
      phone: r.studentPhone || "",
      active: false,
      archived: true,
      balance: 0,
    }));

export const SingleGroup = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [tabIndex, setTabIndex] = useState(0);
  const [sortBy, setSortBy] = useState("az");
  const [showCoins, setShowCoins] = useState(false);

  const { data: groupDetailData, isLoading: groupLoading } = useGroupByIdQuery(id ?? "", { skip: !id });
  const [fetchGroupForEdit, { data: groupForEditData }] = useLazyGroupForEditQuery();
  const { data: groupsSelectData } = useGroupsSelectQuery();
  const selectedBranchId = useSelector((s: RootState) => s.branch.selectedBranchId);
  const { data: allStudentsData } = useAllStudentsQuery({ page: 1, limit: 100, branchId: selectedBranchId ?? undefined });
  const { data: allCoursesData } = useAllCoursesQuery();
  const { data: allRoomsData } = useAllRoomsQuery();
  const { data: allBranchesData } = useAllBranchesQuery();
  const { data: teacherSelectData } = useTeachersSelectQuery({ branchId: selectedBranchId ?? "all" });
  // GET /reasons/select — only ACTIVE reasons (the branch comes from the
  // x-branch-id header baseApi already sends), first 200 so a branch with
  // more than the backend's default page size doesn't lose options. The ids
  // are what PATCH /student-groups/{id}/status takes as `reasonId`.
  const {
    data: reasonOptions,
    isLoading: reasonsLoading,
    isError: reasonsError,
  } = useReasonsSelectQuery({ status: "ACTIVE", page: 1, limit: 200 });
  // Full membership roster for this group — the authoritative source for
  // each student's real status and their /student-groups row id (see
  // combinedStudents). Confirmed live that omitting `status` does NOT
  // return every status as this used to assume: the backend silently
  // excludes INACTIVE/DELETED rows unless one of those is requested
  // explicitly, so archived memberships need their own two calls below —
  // without them deriveArchivedFromMemberships never has any real data to
  // show, and "Arxivdagi o'quvchilarni ko'rsatish" (show archived
  // students) always renders empty. Also confirmed live that combining
  // `groupId` with an archived `status` returns nothing even when a
  // matching row exists (the two filters don't appear to compose on this
  // backend) — so these two are fetched unscoped (branch-wide, same as
  // `studentId`+`status` does work) and filtered to this group client-side
  // instead of via the `groupId` param.
  const { data: studentGroupsData } = useStudentGroupsQuery({ groupId: id ?? "", limit: 500 }, { skip: !id });
  const { data: inactiveStudentGroupsData } = useStudentGroupsQuery(
    { status: "INACTIVE", limit: 500 }, { skip: !id }
  );
  const { data: deletedStudentGroupsData } = useStudentGroupsQuery(
    { status: "DELETED", limit: 500 }, { skip: !id }
  );
  const [addStudentToGroup, { isLoading: isAssigning }] = useAddStudentToGroupMutation();
  const [fetchNewMembership] = useLazyStudentGroupsQuery();
  const [transferStudent, { isLoading: isTransferring }] = useTransferStudentMutation();
  const [updateGroup, { isLoading: isSavingGroup }] = useUpdateGroupMutation();
  const [toggleGroupStatus] = useToggleGroupStatusMutation();
  const [freezeStudentGroup, { isLoading: isFreezing }] = useFreezeStudentGroupMutation();
  const [unfreezeStudentGroup, { isLoading: isUnfreezing }] = useUnfreezeStudentGroupMutation();
  const [updateStudentGroupStatus, { isLoading: isChangingMembershipStatus }] = useUpdateStudentGroupStatusMutation();
  const [updateStudentGroup, { isLoading: isSavingMembershipDates }] = useUpdateStudentGroupMutation();
  const [graduateTrialStudentGroup] = useGraduateTrialStudentGroupMutation();
  const [transferStudentBranch, { isLoading: isMovingBranch }] = useTransferStudentBranchMutation();
  const [updateStudentStatus, { isLoading: isArchivingStudent }] = useUpdateStudentStatusMutation();
  const [fetchStudentDetail] = useLazyStudentByIdQuery();
  const [fetchGroupExcel, { isFetching: isExportingExcel }] = useLazyGroupExcelQuery();

  const group = groupDetailData ? toLegacyGroup(groupDetailData.data) : undefined;
  const teacher = group ? findTeacherById(group.teacherId) : undefined;
  const [students, setStudents] = useState<RealGroupStudent[]>([]);
  // Students just moved to another group from this page — kept out of the
  // roster until the /student-groups refetch confirms they're gone (see
  // extraStudents below, which would otherwise briefly re-add them from the
  // stale membership rows).
  const [movedOutIds, setMovedOutIds] = useState<Set<string>>(() => new Set());
  // Students moved to ANOTHER BRANCH from this page (POST /students/{id}/
  // transfer-branch). Unlike movedOutIds above this is never pruned: the
  // backend ends their memberships in the old branch, so they'd otherwise
  // resurface here as archived ("show archived") rows or, while the legacy
  // GroupDetail.students relation is stale, as live ones. Their old groups
  // belong on the Student Profile page only, not on a group's member list.
  const [branchMovedIds, setBranchMovedIds] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    if (groupDetailData) setStudents(toRealStudents(groupDetailData.data));
  }, [groupDetailData]);
  const [showArchived, setShowArchived] = useState(false);

  // Memberships that are still part of the group (PROBATION / ACTIVE /
  // FROZEN) — the GET /student-groups query above already scopes to this
  // group, the groupId check is just a guard.
  const liveMembershipRows = useMemo(
    () => (studentGroupsData?.rows ?? []).filter(
      (r) => r.status !== "INACTIVE" && r.status !== "DELETED" && (!r.groupId || r.groupId === id)
    ),
    [studentGroupsData, id]
  );

  // GroupDetail.students is the legacy relation — POST /student-groups (how
  // "Add student" now creates a member) isn't guaranteed to write to it, so a
  // freshly added (frozen) student could otherwise be missing from the roster
  // entirely. /student-groups is the authoritative roster (see the comment on
  // studentGroupsData above), so any live membership the legacy relation
  // doesn't list is added here.
  const extraStudents = useMemo<RealGroupStudent[]>(() => {
    if (!groupDetailData) return [];
    const known = new Set(students.map((s) => s.realId));
    const out: RealGroupStudent[] = [];
    liveMembershipRows.forEach((r) => {
      if (!r.studentId || known.has(r.studentId) || movedOutIds.has(r.studentId) || branchMovedIds.has(r.studentId)) return;
      known.add(r.studentId);
      out.push({
        id: students.length + out.length + 1,
        realId: r.studentId,
        name: r.studentName || "—",
        phone: r.studentPhone || "",
        active: true,
        archived: false,
        balance: 0,
      });
    });
    return out;
  }, [groupDetailData, students, liveMembershipRows, movedOutIds, branchMovedIds]);

  useEffect(() => {
    setMovedOutIds((prev) => {
      if (prev.size === 0) return prev;
      const live = new Set(liveMembershipRows.map((r) => r.studentId));
      const next = new Set([...prev].filter((sid) => live.has(sid)));
      return next.size === prev.size ? prev : next;
    });
  }, [liveMembershipRows]);

  // Branch-wide (see the fetch comment above) — narrowed to this group here.
  const archivedRowsForThisGroup = useMemo(
    () => [
      ...(inactiveStudentGroupsData?.rows ?? []),
      ...(deletedStudentGroupsData?.rows ?? []),
    ].filter((r) => r.groupId === id),
    [inactiveStudentGroupsData, deletedStudentGroupsData, id]
  );

  const archivedStudents = useMemo(() => {
    // A student with a live membership (e.g. re-added after being removed)
    // isn't archived here, even though an older INACTIVE row still exists.
    const activeIds = new Set([...students, ...extraStudents].map((s) => s.realId));
    liveMembershipRows.forEach((r) => activeIds.add(r.studentId));
    return deriveArchivedFromMemberships(archivedRowsForThisGroup, activeIds)
      .filter((s) => !branchMovedIds.has(s.realId));
  }, [archivedRowsForThisGroup, students, extraStudents, liveMembershipRows, branchMovedIds]);

  const membershipByStudentId = useMemo(() => {
    const map = new Map<string, StudentGroupRecord>();
    // A student removed via SingleGroup itself (status -> INACTIVE/DELETED)
    // still lingers in GroupDetail.students (the legacy relation `students`
    // above is built from) until that separately-cached query refetches —
    // merging in the two archived-status queries here means this overlay
    // still correctly marks them archived/frozen even during that window,
    // instead of falling back to students' stale "active" default because
    // the unfiltered query alone doesn't carry INACTIVE/DELETED rows.
    // A student who was removed and later re-added has two rows here (the
    // old INACTIVE one and the new live one) — the newer row (by createdAt)
    // must win, otherwise the re-added student would read as archived and
    // their freeze/activate calls would target the dead membership id. The
    // same row appearing in both lists keeps the later (archived-query) copy.
    // A live (PROBATION/ACTIVE/FROZEN) row always beats an archived one no
    // matter what their createdAt values say — freeze/activate/remove must
    // never be aimed at a dead (INACTIVE/DELETED) membership id, which the
    // backend answers with an error that reads as "freeze doesn't work".
    const isLive = (m: StudentGroupRecord) => m.status !== "INACTIVE" && m.status !== "DELETED";
    [...(studentGroupsData?.rows ?? []), ...archivedRowsForThisGroup].forEach((m) => {
      if (!m.studentId) return;
      // Same guard liveMembershipRows uses: a row that names a different
      // group must never supply this roster's status / membership id.
      if (m.groupId && m.groupId !== id) return;
      const prev = map.get(m.studentId);
      if (!prev) { map.set(m.studentId, m); return; }
      if (isLive(m) !== isLive(prev)) {
        if (isLive(m)) map.set(m.studentId, m);
        return;
      }
      if ((m.createdAt ?? "") >= (prev.createdAt ?? "")) map.set(m.studentId, m);
    });
    return map;
  }, [studentGroupsData, archivedRowsForThisGroup, id]);

  // GroupDetail.students has no balance field (see toRealStudents above,
  // which defaults everyone to 0) — GET /students does carry the real
  // balance, and allStudentsData is already fetched (first 100 of the branch)
  // for exactly this, so it's reused here rather than firing a second request. Without
  // this overlay the roster's debt dot (bgcolor keyed off s.balance) always
  // read the placeholder 0 and rendered green even for actual debtors.
  const balanceByStudentId = useMemo(
    () => new Map((allStudentsData?.data ?? []).map((s) => [s.id, s.balance])),
    [allStudentsData]
  );

  // Overlays each student's real membership status/id (from
  // membershipByStudentId) on top of the neutral GroupDetail-derived
  // defaults — active/archived only change for students a matching
  // /student-groups row was actually found for; everyone else keeps the
  // prior placeholder rather than being guessed at.
  const combinedStudents = useMemo(() => {
    // branchMovedIds is also applied here (not just to extra/archived
    // rows) because `students` is re-seeded from GroupDetail on every refetch
    // and that legacy relation can lag behind the transfer.
    const base = [...students, ...extraStudents, ...archivedStudents]
      .filter((s) => !branchMovedIds.has(s.realId));
    return base.map((s) => {
      const membership = membershipByStudentId.get(s.realId);
      const realBalance = balanceByStudentId.get(s.realId);
      return {
        ...s,
        ...(membership && {
          studentGroupId: membership.id,
          active: membership.status === "ACTIVE" || membership.status === "PROBATION",
          archived: membership.status === "INACTIVE" || membership.status === "DELETED",
          isTrial: membership.status === "PROBATION",
        }),
        ...(realBalance !== undefined && { balance: realBalance }),
      };
    });
  }, [students, extraStudents, archivedStudents, membershipByStudentId, balanceByStudentId, branchMovedIds]);

  // The Add student modal searches the whole student list itself (GET
  // /students?search=) — this only tells it who is already in this group so
  // those rows are marked instead of being addable a second time.
  const memberStatusById = useMemo(() => {
    const map: Record<string, "active" | "archived"> = {};
    combinedStudents.forEach((s) => { map[s.realId] = s.archived ? "archived" : "active"; });
    return map;
  }, [combinedStudents]);

  const otherGroups = useMemo(
    () => (groupsSelectData ?? []).filter((g) => g.id !== id),
    [groupsSelectData, id]
  );

  const courseOptions = useMemo(
    () => (allCoursesData?.data ?? []).map((c) => ({ id: c.id, name: c.name, months: c.months })),
    [allCoursesData]
  );
  const roomOptions = useMemo(
    () => (allRoomsData?.data ?? []).map((r) => ({ id: r.id, name: r.name })),
    [allRoomsData]
  );
  const activeTeachers = teacherSelectData ?? [];

  // Student dot menu
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedStudent, setSelectedStudent] = useState<RealGroupStudent | null>(null);

  // Student hover card
  const [hoverStudent, setHoverStudent] = useState<ReturnType<typeof buildHoverData> | null>(null);
  const [hoverAnchorEl, setHoverAnchorEl] = useState<HTMLElement | null>(null);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  // GroupDetail.students only carries {id,name,role,photo,phone} — no
  // balance/dates — so the hover card's real numbers are fetched lazily via
  // GET /students/{id} once hovered, keyed here to ignore a stale response
  // if the user has since moved on to a different student.
  const hoverRequestId = useRef<string | null>(null);

  // Drawers
  const [editOpen, setEditOpen] = useState(false);
  const [smsOpen, setSmsOpen] = useState(false);
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Student action states
  const [freezeOpen, setFreezeOpen] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);
  const [graduateTrialOpen, setGraduateTrialOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [removeReasonId, setRemoveReasonId] = useState<string>("");
  const [removeComment, setRemoveComment] = useState("");
  const [removeRecalculate, setRemoveRecalculate] = useState(false);
  const [removeScope, setRemoveScope] = useState<"current" | "all">("current");
  // "Delete student" side of the dialog's toggle — archives the whole account
  // (never a hard delete, that only exists on the Archive page).
  const [removeDeleteMode, setRemoveDeleteMode] = useState(false);

  if (groupLoading) {
    return (
      <Box p={4} sx={{ display: "flex", justifyContent: "center" }}><CircularProgress /></Box>
    );
  }

  if (!group || !groupDetailData) {
    return (
      <Box p={4}><Typography>{t("singleGroup.notFound")}</Typography></Box>
    );
  }

  const visibleStudents = combinedStudents.filter((s) => showArchived || !s.archived);

  // "Newest"/"Oldest" sort by when the student joined THIS group (their
  // /student-groups membership joinedAt, falling back to that row's
  // createdAt) — the closest real signal to "when were they added".
  const joinedTimeOf = (uid: string): string => {
    const m = membershipByStudentId.get(uid);
    return m?.joinedAt ?? m?.createdAt ?? "";
  };

  const sortedStudents = [...visibleStudents].sort((a, b) => {
    if (sortBy === "za") return b.name.localeCompare(a.name);
    if (sortBy === "newest") return joinedTimeOf(b.realId).localeCompare(joinedTimeOf(a.realId));
    if (sortBy === "oldest") return joinedTimeOf(a.realId).localeCompare(joinedTimeOf(b.realId));
    return a.name.localeCompare(b.name);
  });

  // The group's branch isn't in GroupDetail directly — it's derived from its
  // course, which does carry a nested branch object (Course.branch.name).
  const groupCourse = allCoursesData?.data.find((c) => c.id === groupDetailData.data.courseId);
  const branchName = groupCourse?.branch?.name;

  // GET /branches returns every branch regardless of status, including
  // soft-deleted ones (status: "DELETED") and deactivated ones (status:
  // "INACTIVE") — Header's own branch dropdown already filters to ACTIVE
  // only for this exact reason; this picker didn't, so staff could transfer
  // a student into a branch that no longer exists.
  const branchOptions = (allBranchesData?.data ?? [])
    .filter((b) => b.status === "ACTIVE")
    .map((b) => ({ id: b.id, name: b.name }));

  const handleOpenMenu = (e: React.MouseEvent<HTMLElement>, student: RealGroupStudent) => {
    e.stopPropagation();
    // The hover card is armed by simply moving the pointer onto the row (to
    // reach the "..." button) — left alone it pops up ~200ms later on top of
    // the freshly opened actions menu and swallows clicks meant for its items.
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    if (leaveTimeout.current) clearTimeout(leaveTimeout.current);
    hoverRequestId.current = null;
    setHoverStudent(null);
    setHoverAnchorEl(null);
    setMenuAnchor(e.currentTarget);
    setSelectedStudent(student);
  };
  const handleCloseMenu = () => setMenuAnchor(null);

  // uid — talabaning haqiqiy backend UUID'si (RealGroupStudent.realId /
  // buildHoverData'dan uid maydoni orqali keladi), profilga shu bilan o'tamiz.
  const handleGoToProfile = (uid: string) => {
    setHoverStudent(null);
    setHoverAnchorEl(null);
    navigate(`/students/${uid}`);
  };

  // `detail` (GET /students/{id}) carries the real balance/status/dates that
  // GroupDetail.students doesn't — when present, it takes priority over the
  // group-summary placeholder so the card shows real numbers instead of 0.
  function buildHoverData(student: RealGroupStudent, detail?: StudentDetail | null) {
    // joinedAt comes from this group's own /student-groups membership row —
    // distinct from detail.groupsStart (activatedAt), which reflects the
    // student's earliest group across the whole account, not this group.
    const membership = membershipByStudentId.get(student.realId);
    return {
      id: student.id,
      uid: student.realId,
      name: detail?.name ?? student.name,
      phone: detail?.phone ?? student.phone,
      active: detail ? detail.status === "ACTIVE" : student.active,
      status: detail?.status,
      balance: detail?.balance ?? student.balance,
      addedAt: detail?.createdAt ? formatDate(detail.createdAt) : student.addedAt,
      activatedAt: detail?.groupsStart ? formatDate(detail.groupsStart) : student.activatedAt,
      joinedAt: membership?.joinedAt ? formatDate(membership.joinedAt) : undefined,
      // Read-only — GET /students/{id} returns this, but no endpoint in this
      // app can write it, so "Add new note" (StudentActionsMenu) can't save
      // to it yet.
      note: detail?.comment ?? undefined,
      frozenAt: student.frozenAt,
    };
  }

  const handleStudentMouseEnter = (e: React.MouseEvent<HTMLElement>, student: RealGroupStudent) => {
    if (menuAnchor) return;
    if (leaveTimeout.current) clearTimeout(leaveTimeout.current);
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    const target = e.currentTarget;
    hoverTimeout.current = setTimeout(() => {
      setHoverStudent(buildHoverData(student));
      setHoverAnchorEl(target);
      hoverRequestId.current = student.realId;
      fetchStudentDetail(student.realId)
        .then((res) => {
          if (hoverRequestId.current !== student.realId || !res.data) return;
          setHoverStudent(buildHoverData(student, res.data.data));
        })
        .catch(() => {});
    }, student.active ? 200 : 80);
  };

  const handleStudentMouseLeave = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    leaveTimeout.current = setTimeout(() => {
      setHoverStudent(null);
      setHoverAnchorEl(null);
      hoverRequestId.current = null;
    }, 300);
  };

  const handleHoverCardMouseEnter = () => {
    if (leaveTimeout.current) clearTimeout(leaveTimeout.current);
  };

  const handleHoverCardMouseLeave = () => {
    leaveTimeout.current = setTimeout(() => {
      setHoverStudent(null);
      setHoverAnchorEl(null);
    }, 250);
  };

  // The freeze/unfreeze/status endpoints are keyed on the LIVE membership's
  // own id (never the student id, never a dead INACTIVE/DELETED row). The id
  // captured on the roster row is normally right, but it comes from a cached
  // overlay — so it is re-resolved here: first from the current live rows,
  // then (if the cache has nothing, e.g. the row was created a moment ago)
  // straight from GET /student-groups, taking the newest live row.
  const resolveLiveMembershipId = async (student: RealGroupStudent): Promise<string | undefined> => {
    const cached = liveMembershipRows.find((r) => r.studentId === student.realId);
    if (cached?.id) return cached.id;
    if (id) {
      try {
        const found = await fetchNewMembership({ groupId: id, studentId: student.realId, limit: 20 }).unwrap();
        const live = found.rows
          .filter((r) => r.status !== "INACTIVE" && r.status !== "DELETED"
            && (!r.groupId || r.groupId === id) && (!r.studentId || r.studentId === student.realId))
          .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
        if (live[0]?.id) return live[0].id;
      } catch {
        // Fall through to the id already on the row.
      }
    }
    return student.studentGroupId;
  };

  const handleFreezeConfirm = async (data: { reason: string; startDate: string; recalculateBalance: boolean }) => {
    if (!selectedStudent) return;
    const studentGroupId = await resolveLiveMembershipId(selectedStudent);
    if (!studentGroupId) {
      toast.error(t("singleGroup.freezeModal.toast.error"));
      return;
    }
    try {
      // POST /student-groups/{id}/freeze (Swagger): {id} is the membership's
      // own id (StudentGroupRecord.id), not the student id — startDate is
      // required. `recalculateBalance` isn't part of the documented request
      // body, so it isn't sent — the checkbox stays purely local until the
      // backend documents support for it. The membership's real status
      // (FROZEN) comes back through the studentGroup/group tag invalidation
      // below and combinedStudents' overlay — no local optimistic patch,
      // same pattern as handleActivateArchived/handleBackToTrialLesson.
      await freezeStudentGroup({
        id: studentGroupId,
        startDate: data.startDate,
        reason: data.reason.trim() || undefined,
      }).unwrap();
      toast.success(t("singleGroup.freezeModal.toast.success"));
      setFreezeOpen(false);
    } catch (err) {
      // Backend message + HTTP status (the request/response itself is also in
      // the console — see logStudentGroupAction in groupsApi).
      const detail = describeApiError(err);
      const generic = t("singleGroup.freezeModal.toast.error");
      toast.error(detail ? `${generic}: ${detail}` : generic);
    }
  };

  const handleActivateConfirm = async (paymentStartDate: string) => {
    if (!selectedStudent) return;
    const studentGroupId = await resolveLiveMembershipId(selectedStudent);
    if (!studentGroupId) {
      toast.error(t("singleGroup.activateModal.toast.notFound"));
      return;
    }
    // POST /student-groups/{id}/unfreeze — same membership id as freeze,
    // multipart body {endDate} (the date the freeze ends = today, the moment
    // staff release the student; deliberately NOT the picked "since when"
    // date, which may be backdated to before the freeze started and would be
    // rejected as an end before the start) (FROZEN -> ACTIVE). Followed by PATCH
    // /student-groups/{id} {paymentStartDate} — same combo
    // handleGraduateTrialConfirm already uses to record which date the
    // backend should calculate this membership's payment/debt accounting
    // from (per PATCH .../status's own doc comment: "Agar ACTIVE qilinsa,
    // to'lov hisobi boshlanadi"). The two steps are reported separately: once
    // the unfreeze has gone through the student IS active, so a failure of
    // the date step alone must not read as "activation failed".
    try {
      await unfreezeStudentGroup({ id: studentGroupId, endDate: todayLocalISO() }).unwrap();
    } catch (err) {
      const detail = describeApiError(err);
      const generic = t("singleGroup.activateModal.toast.error");
      toast.error(detail ? `${generic}: ${detail}` : generic);
      return;
    }
    setActivateOpen(false);
    try {
      await updateStudentGroup({ id: studentGroupId, paymentStartDate }).unwrap();
      toast.success(t("singleGroup.activateModal.toast.success"));
    } catch (err) {
      const detail = describeApiError(err);
      const generic = t("singleGroup.activateModal.toast.dateError");
      toast.error(detail ? `${generic}: ${detail}` : generic);
    }
  };

  const handleExportExcel = async () => {
    if (!id) return;
    try {
      const blob = await fetchGroupExcel(id).unwrap();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const safeName = group.name.replace(/[^\w\s-]/g, "").trim() || "group";
      link.download = `${safeName}-students.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t("singleGroup.leftPanel.exportError"));
    }
  };

  const isSelectedArchived = Boolean(selectedStudent?.archived);
  const isSelectedFrozen = selectedStudent ? !selectedStudent.active && !selectedStudent.archived : false;
  const isSelectedTrial = Boolean(selectedStudent?.isTrial) && !isSelectedArchived && !isSelectedFrozen;

  // Both actions below use PATCH /student-groups/{id}/status (Swagger:
  // status is required) to bring an archived (INACTIVE/DELETED) membership
  // back — "Activate" straight to ACTIVE, "Back to trial lesson" to
  // PROBATION — rather than the pure local-state stand-ins these were
  // before (no backend call at all).
  const handleActivateArchived = async () => {
    const target = selectedStudent;
    handleCloseMenu();
    if (!target?.studentGroupId) {
      toast.error(t("singleGroup.studentActionsMenu.toast.error"));
      return;
    }
    try {
      await updateStudentGroupStatus({ id: target.studentGroupId, status: "ACTIVE" }).unwrap();
      toast.success(t("singleGroup.studentActionsMenu.toast.activated"));
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t("singleGroup.studentActionsMenu.toast.error");
      toast.error(detail ? `${generic}: ${detail}` : generic);
    }
  };

  const handleBackToTrialLesson = async () => {
    const target = selectedStudent;
    handleCloseMenu();
    if (!target?.studentGroupId) {
      toast.error(t("singleGroup.studentActionsMenu.toast.error"));
      return;
    }
    try {
      await updateStudentGroupStatus({ id: target.studentGroupId, status: "PROBATION" }).unwrap();
      toast.success(t("singleGroup.studentActionsMenu.toast.backToTrial"));
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t("singleGroup.studentActionsMenu.toast.error");
      toast.error(detail ? `${generic}: ${detail}` : generic);
    }
  };

  // Promotes a PROBATION (trial-lesson) membership to ACTIVE via the
  // dedicated POST /student-groups/{id}/graduate-trial (Swagger: no request
  // body) — unlike the two-step PATCH .../status + PATCH .../{id} this used
  // to do by hand, this endpoint also activates the student's account if it
  // was inactive and converts their lead to CONVERTED when they came in
  // through one, neither of which the manual version ever did. Swagger
  // shows no body for graduate-trial itself, so the admin-picked
  // paymentStartDate is still applied as a follow-up PATCH /student-groups/
  // {id} (same call as before) once the promotion itself has gone through.
  const handleGraduateTrialConfirm = async (paymentStartDate: string) => {
    const target = selectedStudent;
    setGraduateTrialOpen(false);
    if (!target?.studentGroupId) {
      toast.error(t("singleGroup.graduateTrialModal.toast.error"));
      return;
    }
    try {
      await graduateTrialStudentGroup(target.studentGroupId).unwrap();
      await updateStudentGroup({ id: target.studentGroupId, paymentStartDate }).unwrap();
      toast.success(t("singleGroup.graduateTrialModal.toast.success"));
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t("singleGroup.graduateTrialModal.toast.error");
      toast.error(detail ? `${generic}: ${detail}` : generic);
    }
  };

  const resetRemoveState = () => {
    setRemoveReasonId("");
    setRemoveComment("");
    setRemoveRecalculate(false);
    setRemoveScope("current");
    setRemoveDeleteMode(false);
  };

  const handleCloseRemove = () => {
    setRemoveOpen(false);
    resetRemoveState();
  };

  const handleRemoveStudent = async () => {
    if (!selectedStudent) return;
    const studentId = selectedStudent.realId;
    const studentGroupId = await resolveLiveMembershipId(selectedStudent);
    if (!studentGroupId) {
      toast.error(t("singleGroup.removeStudentDialog.toast.error"));
      return;
    }
    // reasonId (reasonsApi's real Reason selection) has no matching text
    // field of its own on the account-level status endpoint below — its
    // `reason` is a free-text string, so the selected reason's name is
    // combined with the comment textarea into one string for it, while the
    // student-group status call still gets reasonId/reason separately as
    // documented.
    const reasonName = reasonOptions?.find((r) => r.id === removeReasonId)?.name;
    const combinedReason = [reasonName, removeComment.trim()].filter(Boolean).join(" — ") || undefined;
    // "Delete student" = archive the whole account, i.e. the same outcome as
    // removing from ALL groups (and never a permanent DELETE), so it takes
    // the "all" path below regardless of what the scope radios (locked to
    // "all" in this mode) last held.
    const effectiveScope = removeDeleteMode ? "all" : removeScope;
    try {
      // Step 1 — PATCH /student-groups/{id}/status: ends this membership (or,
      // with isAllGroup, every membership this student has) so it stops
      // showing as active in whichever group(s) it covers. Swagger: status
      // required; reason/reasonId/isAllGroup optional.
      await updateStudentGroupStatus({
        id: studentGroupId,
        status: "INACTIVE",
        reasonId: removeReasonId || undefined,
        reason: removeComment.trim() || undefined,
        // Only ever sent when true — multipart carries booleans as strings and
        // this backend's validator rejects/mis-coerces a literal "false"
        // (same story as PaymentMethod.isDefault), so "current group" simply
        // omits the flag and lets it default to false.
        isAllGroup: effectiveScope === "all" ? true : undefined,
      }).unwrap();

      // Step 2 — only archive the student's whole account (POST
      // /students/{id}/status, which also records the reason to their
      // history — the source of the Archive page's reason/comment columns)
      // when they were removed from EVERY group (removeScope === "all") —
      // removing them from just the current group must leave their
      // account-wide status, and their other group memberships, untouched.
      // A permanent delete is only reachable from the Archive page itself.
      // POST /students/{id}/status is used instead of the blind PATCH
      // /students/{id}/toggle-status, which takes no body (so it can't carry
      // the reason) and would flip an already-archived student back to ACTIVE.
      if (effectiveScope === "all") {
        await updateStudentStatus({ id: studentId, status: "INACTIVE", reason: combinedReason }).unwrap();
      }

      toast.success(t(removeDeleteMode
        ? "singleGroup.removeStudentDialog.toast.archived"
        : "singleGroup.removeStudentDialog.toast.removed"));
      setRemoveOpen(false);
      resetRemoveState();
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t("singleGroup.removeStudentDialog.toast.error");
      toast.error(detail ? `${generic}: ${detail}` : generic);
    }
  };

  const handleAddStudentSubmit = async ({ studentId, joinedAt, customPrice, discountReason }: AddStudentPayload) => {
    if (!id) return;
    // POST /student-groups (not POST /groups/{id}/students/assign):
    // confirmed live that the assign endpoint never creates a row in the
    // /student-groups membership table, so a student added through it has
    // no studentGroupId — silently breaking freeze/unfreeze/status-change
    // (all keyed on that id) for every student added this way. Only the
    // /student-groups resource itself creates the row those calls need.
    // Body is multipart/form-data (see addStudentToGroup in groupsApi):
    // studentId + groupId required; joinedAt ("since when"), customPrice and
    // discountReason optional. Starts on PROBATION (never ACTIVE) with no
    // paymentStartDate — going through ACTIVE, even briefly, would trigger
    // PATCH .../status's documented "payment accounting starts" side effect
    // before a staff member meant it to.
    let created: unknown;
    try {
      created = await addStudentToGroup({
        studentId, groupId: id, status: "PROBATION", joinedAt, customPrice, discountReason,
      }).unwrap();
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t("singleGroup.addStudentDrawer.toast.error");
      toast.error(detail ? `${generic}: ${detail}` : generic);
      return;
    }
    setAddStudentOpen(false);
    // An explicit re-add must show up even if this student was moved out of
    // this group (or to another branch) earlier in this session.
    setMovedOutIds((prev) => { if (!prev.has(studentId)) return prev; const next = new Set(prev); next.delete(studentId); return next; });
    setBranchMovedIds((prev) => { if (!prev.has(studentId)) return prev; const next = new Set(prev); next.delete(studentId); return next; });

    // Business rule: a newly added student must NOT read as active — they
    // land FROZEN, and a staff member explicitly activates them afterwards
    // (StudentActionsMenu's "Activate" -> ActivateModal asks "since when" and
    // unfreezes + sets the payment start date). Creation itself only
    // documents PROBATION/ACTIVE as initial statuses, so the brand-new
    // membership is frozen as an immediate follow-up through the one
    // endpoint that IS documented for FROZEN (POST /student-groups/{id}/
    // freeze, startDate required). Its id comes from the create response
    // when present, otherwise it's looked up via GET /student-groups.
    try {
      let newMembershipId = membershipIdFromCreateResponse(created, id);
      if (!newMembershipId) {
        const found = await fetchNewMembership({ groupId: id, studentId, limit: 1 }).unwrap();
        newMembershipId = found.rows[0]?.id;
      }
      if (!newMembershipId) throw new Error("new membership id not found");
      await freezeStudentGroup({
        id: newMembershipId,
        startDate: joinedAt || todayLocalISO(),
      }).unwrap();
      toast.success(t("singleGroup.addStudentDrawer.toast.success"));
    } catch (err) {
      // The student WAS added — only the follow-up freeze failed — so this
      // is a distinct, narrower warning rather than the generic add-failed
      // error above. It used to swallow the reason entirely; now the
      // backend's message + HTTP status are appended (and the failed request
      // is in the console — see logStudentGroupAction in groupsApi).
      const detail = describeApiError(err);
      toast.success(t("singleGroup.addStudentDrawer.toast.success"));
      const generic = t("singleGroup.addStudentDrawer.toast.freezeError");
      toast.error(detail ? `${generic}: ${detail}` : generic);
    }
  };

  const handleMoveStudent = async (newGroupId: string, reason: string) => {
    if (!selectedStudent || !id) return;
    try {
      await transferStudent({ id, studentId: selectedStudent.realId, newGroupId, reason }).unwrap();
      toast.success(t("singleGroup.moveStudentDialog.toast.success"));
      // Drop them from this (source) group's roster right away instead of
      // waiting on the "group"/"studentGroup" tag refetch — transfer moves
      // them to a different group entirely, so there's nothing left here to
      // reconcile via the membership overlay the way freeze/archive do.
      const movedRealId = selectedStudent.realId;
      setStudents((prev) => prev.filter((s) => s.realId !== movedRealId));
      setMovedOutIds((prev) => new Set(prev).add(movedRealId));
      setMoveOpen(false);
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t("singleGroup.moveStudentDialog.toast.error");
      toast.error(detail ? `${generic}: ${detail}` : generic);
    }
  };

  const handleMoveToBranch = async (branchId: string, reason?: string): Promise<boolean> => {
    if (!selectedStudent) return false;
    try {
      // POST /students/{id}/transfer-branch — Swagger body {newBranchId,
      // reason}. Like the sibling group-transfer endpoint (which 400s
      // without one), `reason` is always sent: the typed one, or a
      // localized default when the field is left empty.
      const movedRealId = selectedStudent.realId;
      await transferStudentBranch({
        id: movedRealId,
        newBranchId: branchId,
        reason: reason?.trim() || t("singleGroup.studentActionsMenu.moveToBranchModal.defaultReason"),
      }).unwrap();
      toast.success(t("singleGroup.studentActionsMenu.moveToBranchModal.toast.success"));
      // The backend ends the student's memberships in the old branch (see
      // TransferStudentBranchRequest in studentsApi/types.d.ts) and the
      // mutation's tags ("student"/"group"/"studentGroup") refetch the roster
      // — but that lags, and the ended rows would then resurface under "show
      // archived". Take the student off THIS group's member list right away
      // and for good (branchMovedIds); their old groups remain visible on the
      // Student Profile page, which reads its own data.
      setStudents((prev) => prev.filter((s) => s.realId !== movedRealId));
      setBranchMovedIds((prev) => new Set(prev).add(movedRealId));
      setHoverStudent(null);
      setHoverAnchorEl(null);
      return true;
    } catch (err) {
      const apiDetail = extractApiError(err);
      const generic = t("singleGroup.studentActionsMenu.moveToBranchModal.toast.error");
      toast.error(apiDetail ? `${generic}: ${apiDetail}` : generic);
      return false;
    }
  };

  const handleSaveGroup = async (data: Omit<UpdateGroupRequest, "id">) => {
    if (!id) return;
    try {
      await updateGroup({ id, ...data }).unwrap();
      toast.success(t("singleGroup.editGroupDrawer.toast.success"));
      setEditOpen(false);
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t("singleGroup.editGroupDrawer.toast.error");
      toast.error(detail ? `${generic}: ${detail}` : generic);
    }
  };

  // "Delete" on this page is the same archive toggle used everywhere else in
  // the app (PATCH /groups/{id}/toggle-status -> INACTIVE), not a real
  // DELETE — the group can be restored from the Archive page afterwards.
  const handleDeleteConfirm = async () => {
    setDeleteConfirmOpen(false);
    if (!id) return;
    try {
      await toggleGroupStatus(id).unwrap();
      toast.success(t("singleGroup.leftPanel.toast.statusToggled"));
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t("singleGroup.leftPanel.toast.statusToggleError");
      toast.error(detail ? `${generic}: ${detail}` : generic);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f7f8fa" }}>
      {/* PAGE TITLE */}
      <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" rowGap={0.5} px={3} pt={3} pb={2}>
        <Typography
          variant="h5" fontWeight={700}
          sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
          onClick={() => navigate(-1)}
        >
          {group.name}
        </Typography>
        <Typography variant="h5" color="text.secondary">·</Typography>
        <Typography variant="h5" fontWeight={700}>{group.course}</Typography>
        <Typography variant="h5" color="text.secondary">·</Typography>
        <Typography
          variant="h5" fontWeight={700}
          sx={{ cursor: "pointer", color: "#185FA5", "&:hover": { textDecoration: "underline" } }}
          onClick={() => teacher && navigate(`/teachers/${teacher.id}`)}
        >
          {group.teacher}
        </Typography>
      </Stack>

      <Stack direction={{ xs: "column", md: "row" }} gap={2} px={3} pb={3} alignItems="flex-start">
        {/* ── LEFT PANEL ── */}
        <Paper sx={{ width: { xs: "100%", md: 300 }, flexShrink: 0, borderRadius: 3, p: 2.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Typography fontSize={14}><b>{t("singleGroup.leftPanel.course")}:</b> {group.course}</Typography>
              <Typography fontSize={14}><b>{t("singleGroup.leftPanel.teacher")}:</b> {group.teacher}</Typography>
              <Typography fontSize={14}>
                <b>{t("singleGroup.leftPanel.price")}:</b> {group.price ? `${group.price.toLocaleString()} UZS` : "—"}
              </Typography>
              <Typography fontSize={14}><b>{t("singleGroup.leftPanel.time")}:</b> {group.days} · {group.lessonStartTime}</Typography>
            </Box>

            <Stack spacing={1}>
              <ActionIconBtn
                label={t("singleGroup.leftPanel.editGroup")}
                onClick={() => { if (id) fetchGroupForEdit(id); setEditOpen(true); }}
                color="#1976d2"
              >
                <MdEdit size={16} color="#1976d2" />
              </ActionIconBtn>
              <ActionIconBtn label={t("singleGroup.leftPanel.sendSms")} onClick={() => setSmsOpen(true)} color="#f57c00">
                <MdEmail size={16} color="#f57c00" />
              </ActionIconBtn>
              <ActionIconBtn label={t("singleGroup.leftPanel.addStudent")} onClick={() => setAddStudentOpen(true)} color="#1976d2">
                <GoPlus size={16} color="#1976d2" />
              </ActionIconBtn>
              <ActionIconBtn label={t("singleGroup.leftPanel.deleteGroup")} onClick={() => setDeleteConfirmOpen(true)} color="#d32f2f">
                <MdDelete size={16} color="#d32f2f" />
              </ActionIconBtn>
            </Stack>
          </Stack>

          <Divider sx={{ my: 1.5 }} />

          <Typography fontSize={14}><b>{t("singleGroup.leftPanel.rooms")}:</b> {group.room}</Typography>
          <Typography fontSize={14}><b>{t("singleGroup.leftPanel.roomCapacity")}:</b> {group.roomCapacity ?? 30}</Typography>

          <Box
            sx={{
              mt: 1.5, p: 1.5, borderRadius: 2,
              bgcolor: "#f5f7fb", border: "1px solid #eef0f4",
            }}
          >
            <Stack direction="row" alignItems="center" spacing={0.8} mb={1}>
              <MdCalendarToday size={14} color="#6b7280" />
              <Typography
                fontSize={11.5} fontWeight={700} color="text.secondary"
                sx={{ textTransform: "uppercase", letterSpacing: 0.4 }}
              >
                {t("singleGroup.leftPanel.trainingDates")}
              </Typography>
            </Stack>

            {group.startDate || group.endDate ? (
              <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" rowGap={1}>
                <Box>
                  <Typography fontSize={10.5} color="text.secondary">
                    {t("singleGroup.leftPanel.trainingStart")}
                  </Typography>
                  <Typography fontSize={13.5} fontWeight={600} color="#1a1a1a">
                    {formatTrainingDate(group.startDate)}
                  </Typography>
                </Box>
                <Typography fontSize={14} color="#c1c7d0">→</Typography>
                <Box>
                  <Typography fontSize={10.5} color="text.secondary">
                    {t("singleGroup.leftPanel.trainingEnd")}
                  </Typography>
                  <Typography fontSize={13.5} fontWeight={600} color="#1a1a1a">
                    {formatTrainingDate(group.endDate)}
                  </Typography>
                </Box>
              </Stack>
            ) : (
              <Typography fontSize={13} color="text.secondary">
                {t("singleGroup.leftPanel.notScheduled")}
              </Typography>
            )}
          </Box>

          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" rowGap={0.5} mt={1.25}>
            {branchName && (
              <Typography fontSize={13} color="text.secondary">
                {t("singleGroup.header.branch")}: <b>{branchName}</b>
              </Typography>
            )}
            {branchName && id && (
              <Typography fontSize={12} color="text.secondary" sx={{ opacity: 0.4 }}>·</Typography>
            )}
            {id && (
              <Typography fontSize={12} color="text.secondary" sx={{ opacity: 0.55 }}>
                {t("singleGroup.header.groupId")}: #{id}
              </Typography>
            )}
          </Stack>

          <Divider sx={{ my: 1.5 }} />

          <Select
            size="small" fullWidth value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            sx={{
              mb: 1.5, fontSize: 14, borderRadius: "8px",
              "& .MuiOutlinedInput-notchedOutline": { borderColor: sortBy !== "az" ? "primary.main" : undefined },
            }}
          >
            <MenuItem value="az" sx={{ fontWeight: sortBy === "az" ? 700 : 400 }}>{t("singleGroup.leftPanel.sortAZ")}</MenuItem>
            <MenuItem value="za" sx={{ fontWeight: sortBy === "za" ? 700 : 400 }}>{t("singleGroup.leftPanel.sortZA")}</MenuItem>
            <MenuItem value="newest" sx={{ fontWeight: sortBy === "newest" ? 700 : 400 }}>{t("singleGroup.leftPanel.sortNewest")}</MenuItem>
            <MenuItem value="oldest" sx={{ fontWeight: sortBy === "oldest" ? 700 : 400 }}>{t("singleGroup.leftPanel.sortOldest")}</MenuItem>
          </Select>

          {/* Student list */}
          <List dense disablePadding>
            {sortedStudents.map((s, i) => {
              const isFrozen = !s.active && !s.archived;
              const isArchived = Boolean(s.archived);
              return (
                <ListItem
                  key={`${s.id}-${isArchived ? "arch" : "active"}`}
                  disablePadding
                  sx={{
                    py: 0.6,
                    borderRadius: 1.5,
                    cursor: "pointer",
                    transition: "background 0.15s",
                    opacity: isArchived ? 0.75 : 1,
                    "&:hover": { backgroundColor: isFrozen ? "#e8f7fa" : "#f5f7fb" },
                  }}
                  onMouseEnter={(e) => handleStudentMouseEnter(e, s)}
                  onMouseLeave={handleStudentMouseLeave}
                  onClick={() => handleGoToProfile(s.realId)}
                  secondaryAction={
                    <IconButton
                      size="small"
                      onClick={(e) => { e.stopPropagation(); handleOpenMenu(e, s); }}
                    >
                      <BsThreeDotsVertical />
                    </IconButton>
                  }
                >
                  <Typography fontSize={12} color="text.secondary" sx={{ minWidth: 22, flexShrink: 0 }}>
                    {i + 1}
                  </Typography>
                  {s.active && !isArchived && (
                    <Box sx={{
                      width: 8, height: 8, borderRadius: "50%",
                      bgcolor: (s.balance ?? 0) >= 0 ? "#43a047" : "#e53935",
                      mx: 1, flexShrink: 0,
                    }} />
                  )}
                  {!s.active && !isArchived && (
                    <Box sx={{ width: 8, mx: 1, flexShrink: 0 }} />
                  )}
                  {isArchived && (
                    <Box sx={{ width: 8, mx: 1, flexShrink: 0 }} />
                  )}
                  <ListItemText
                    primary={
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                        <Typography
                          component="span"
                          fontSize={13}
                          fontWeight={500}
                          sx={{
                            display: "inline-block",
                            px: isFrozen ? 1 : 0,
                            py: isFrozen ? 0.35 : 0,
                            borderRadius: isFrozen ? "6px" : 0,
                            backgroundColor: isFrozen ? "#b8e8ef" : "transparent",
                            color: isArchived ? "dimgray" : "#1a1a1a",
                            textDecoration: isArchived ? "line-through" : "none",
                          }}
                        >
                          {s.name}
                        </Typography>
                        {isArchived && (
                          <Chip label={t("singleGroup.leftPanel.archivedChip")} size="small" sx={{ height: 20, fontSize: 10 }} />
                        )}
                      </Box>
                    }
                    secondary={
                      <Typography
                        fontSize={12}
                        color="text.secondary"
                        component="span"
                        display="block"
                        sx={{ textDecoration: isArchived ? "line-through" : "none" }}
                      >
                        {s.phone}
                      </Typography>
                    }
                    sx={{ my: 0 }}
                  />
                </ListItem>
              );
            })}
          </List>

          {/* Always shown — even with zero archived students right now, so
              staff always have a way to check, rather than a button that
              silently disappears until something happens to be archived. */}
          <Button
            fullWidth
            variant="contained"
            size="small"
            onClick={() => setShowArchived((p) => !p)}
            endIcon={<MdKeyboardArrowDown style={{ transform: showArchived ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }} />}
            sx={{
              mt: 2,
              borderRadius: 999,
              textTransform: "none",
              fontSize: 13,
              fontWeight: 600,
              bgcolor: "#1976d2",
              py: 0.9,
              boxShadow: "none",
              "&:hover": { bgcolor: "#1565c0", boxShadow: "none" },
            }}
          >
            {showArchived
              ? t("singleGroup.leftPanel.hideArchivedStudents")
              : t("singleGroup.leftPanel.showArchivedStudents")}
          </Button>

          <Box sx={{ mt: 1.5, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1.5 }}>
            <IconButton
              onClick={handleExportExcel}
              disabled={isExportingExcel}
              title={t("singleGroup.leftPanel.exportToExcel")}
              sx={{
                border: "2px solid #43a047",
                color: "#43a047",
                width: 44,
                height: 44,
                "&:hover": { bgcolor: "#e8f5e9", borderColor: "#2e7d32", color: "#2e7d32" },
              }}
            >
              {isExportingExcel ? <CircularProgress size={20} sx={{ color: "#43a047" }} /> : <MdDownload size={22} />}
            </IconButton>
          </Box>
        </Paper>

        {/* ── RIGHT PANEL ── */}
        <Box sx={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
          <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={1} mb={1}>
            <Typography fontSize={13} color={showCoins ? "primary" : "text.secondary"}>{t("singleGroup.rightPanel.showCoins")}</Typography>
            <Box
              onClick={() => setShowCoins((p) => !p)}
              sx={{
                width: 40, height: 22, borderRadius: 11,
                bgcolor: showCoins ? "primary.main" : "#ccc",
                cursor: "pointer", position: "relative", transition: "0.2s",
              }}
            >
              <Box sx={{
                position: "absolute", top: 3,
                left: showCoins ? 20 : 3,
                width: 16, height: 16,
                borderRadius: "50%", bgcolor: "#fff", transition: "0.2s",
              }} />
            </Box>
            <Typography fontSize={13} color={!showCoins ? "primary" : "text.secondary"}>{t("singleGroup.rightPanel.hideCoins")}</Typography>
          </Stack>

          <Paper sx={{ borderRadius: 3, overflow: "visible" }}>
            <Tabs
              value={tabIndex}
              onChange={(_, v) => setTabIndex(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                borderBottom: "1px solid #eee",
                "& .MuiTab-root": { fontSize: 13, textTransform: "none", minWidth: "auto", px: 2 },
              }}
            >
              {TAB_KEYS.map((key) => (
                <Tab key={key} label={t(`singleGroup.tabs.${key}.tabLabel`)} />
              ))}
            </Tabs>
            <Box sx={{ p: 3, maxHeight: "calc(100vh - 220px)", overflowY: "auto", overflowX: "visible" }}>
              {/* visibleStudents (not combinedStudents) — a student removed
                  from the group (archived) shouldn't still be markable for
                  attendance/grades/discounts; this is the same filter the
                  roster panel itself already applies (plus its "show
                  archived" toggle) so both stay consistent. */}
              {tabIndex === 0 && <Attendance groupId={id ?? ""} students={visibleStudents} />}
              {tabIndex === 1 && <Grade students={visibleStudents} />}
              {tabIndex === 2 && <OnlineLessons />}
              {tabIndex === 3 && <DiscountPrices students={visibleStudents} />}
              {tabIndex === 4 && <Exams />}
              {tabIndex === 5 && (
                <History
                  groupId={id ?? ""}
                  groupName={group.name}
                />
              )}
              {tabIndex === 6 && <Comments groupId={id ?? ""} />}
            </Box>
          </Paper>
        </Box>
      </Stack>

      {/* ══ STUDENT HOVER CARD ══ */}
      <div onMouseEnter={handleHoverCardMouseEnter} onMouseLeave={handleHoverCardMouseLeave}>
        <StudentHoverCard
          student={hoverStudent}
          anchorEl={hoverAnchorEl}
          onClose={() => { setHoverStudent(null); setHoverAnchorEl(null); }}
          onGoToProfile={() => {
            if (hoverStudent) handleGoToProfile(hoverStudent.uid);
          }}
        />
      </div>

      {/* ══ STUDENT ACTIONS MENU (matches reference design) ══ */}
      <StudentActionsMenu
        anchorEl={menuAnchor}
        onClose={handleCloseMenu}
        isArchived={isSelectedArchived}
        isFrozen={isSelectedFrozen}
        isTrial={isSelectedTrial}
        onActivateArchived={handleActivateArchived}
        onBackToTrialLesson={handleBackToTrialLesson}
        onGraduateTrial={() => { handleCloseMenu(); setGraduateTrialOpen(true); }}
        onActivate={() => { handleCloseMenu(); setActivateOpen(true); }}
        onMakeFrozen={() => { handleCloseMenu(); setFreezeOpen(true); }}
        onAddPayment={() => { handleCloseMenu(); setPaymentOpen(true); }}
        onAddNote={() => { handleCloseMenu(); setNoteOpen(true); }}
        onMoveGroup={() => { handleCloseMenu(); setMoveOpen(true); }}
        branches={branchOptions}
        isMovingBranch={isMovingBranch}
        onMoveToBranch={handleMoveToBranch}
        onRemove={() => { handleCloseMenu(); setRemoveOpen(true); }}
        onReminders={() => { handleCloseMenu(); setReminderOpen(true); }}
      />

      {/* ══ FREEZE MODAL (matches reference design) ══ */}
      <FreezeModal
        open={freezeOpen}
        onClose={() => setFreezeOpen(false)}
        student={selectedStudent}
        onConfirm={handleFreezeConfirm}
        isSaving={isFreezing}
      />

      <ActivateModal
        open={activateOpen}
        onClose={() => setActivateOpen(false)}
        onConfirm={handleActivateConfirm}
        isSaving={isUnfreezing || isSavingMembershipDates}
      />

      <GraduateTrialModal
        open={graduateTrialOpen}
        onClose={() => setGraduateTrialOpen(false)}
        onConfirm={handleGraduateTrialConfirm}
        isSaving={isChangingMembershipStatus || isSavingMembershipDates}
      />

      {/* ══ EDIT GROUP DRAWER ══ */}
      <EditGroupDrawer
        group={groupForEditData?.data ?? groupDetailData.data}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        courses={courseOptions}
        rooms={roomOptions}
        teachers={activeTeachers}
        onSave={handleSaveGroup}
        isSaving={isSavingGroup}
      />

      {/* ══ SMS DRAWER ══ */}
      <SmsDrawer open={smsOpen} onClose={() => setSmsOpen(false)} studentIds={visibleStudents.map((s) => s.realId)} />

      {/* ══ ADD STUDENT DRAWER ══ */}
      <AddStudentDrawer
        open={addStudentOpen}
        onClose={() => setAddStudentOpen(false)}
        memberStatusById={memberStatusById}
        onSubmit={handleAddStudentSubmit}
        isSubmitting={isAssigning || isFreezing}
      />

      {/* ══ ADD NOTE MODAL (top) ══ */}
      <AddNoteModal open={noteOpen} onClose={() => setNoteOpen(false)} student={selectedStudent} />

      {/* ══ REMINDER DRAWER ══ */}
      <ReminderDrawer open={reminderOpen} onClose={() => setReminderOpen(false)} student={selectedStudent} />

      {/* ══ ADD PAYMENT (shared with the Header's quick-add — same design, same logic) ══ */}
      <AddPayment
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        lockedStudent={selectedStudent ? {
          id: selectedStudent.realId,
          name: selectedStudent.name,
          phone: selectedStudent.phone,
          balance: selectedStudent.balance,
        } : undefined}
        groupId={id}
        groupName={group.name}
        branchId={groupCourse?.branchId ?? groupCourse?.branch?.id}
      />

      {/* ══ MOVE DIALOG ══ */}
      <MoveStudentDialog
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        student={selectedStudent}
        groups={otherGroups}
        onMove={handleMoveStudent}
        isSubmitting={isTransferring}
      />

      {/* ══ REMOVE CONFIRM ══ */}
      <RemoveStudentDialog
        open={removeOpen}
        onClose={handleCloseRemove}
        onConfirm={handleRemoveStudent}
        reasonId={removeReasonId}
        onReasonIdChange={setRemoveReasonId}
        reasons={reasonOptions ?? []}
        reasonsLoading={reasonsLoading}
        reasonsError={reasonsError}
        showDeleteToggle
        deleteMode={removeDeleteMode}
        onDeleteModeChange={setRemoveDeleteMode}
        comment={removeComment}
        onCommentChange={setRemoveComment}
        recalculate={removeRecalculate}
        onRecalculateChange={setRemoveRecalculate}
        scope={removeScope}
        onScopeChange={setRemoveScope}
        loading={isChangingMembershipStatus || isArchivingStudent}
      />

      {/* ══ DELETE GROUP CONFIRM ══ */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} PaperProps={{ sx: { borderRadius: 2, minWidth: 360 } }}>
        <DialogTitle sx={{ fontWeight: 600 }}>{t("singleGroup.leftPanel.deleteDialog.title")}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">{t("singleGroup.leftPanel.deleteDialog.message")}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="outlined" onClick={() => setDeleteConfirmOpen(false)} sx={{ textTransform: "none", borderRadius: 1.5 }}>
            {t("singleGroup.leftPanel.deleteDialog.cancel")}
          </Button>
          <Button variant="contained" color="error" onClick={handleDeleteConfirm} sx={{ textTransform: "none", borderRadius: 1.5 }}>
            {t("singleGroup.leftPanel.deleteDialog.confirm")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SingleGroup;