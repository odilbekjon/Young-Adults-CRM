// src/pages/groups/SingleGroup.tsx

import {
  Box, Chip, CircularProgress, Divider, IconButton, List, ListItem,
  ListItemText, MenuItem, Paper, Select,
  Stack, Tab, Tabs, Typography, Button,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import type { RootState } from "../../app/store";
import { MdEdit, MdEmail, MdDownload, MdSwapHoriz, MdCalendarToday } from "react-icons/md";
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
  useAssignStudentsToGroupMutation,
  useTransferStudentMutation,
  useUpdateGroupMutation,
  useRemoveTeacherFromGroupMutation,
  useToggleGroupStatusMutation,
  useLazyGroupExcelQuery,
  useStudentGroupsQuery,
  useFreezeStudentGroupMutation,
  useUnfreezeStudentGroupMutation,
  useUpdateStudentGroupStatusMutation,
  useUpdateStudentGroupMutation,
} from "../../app/api/groupsApi";
import type { GroupDetail, StudentGroupRecord, UpdateGroupRequest } from "../../app/api/groupsApi/types";
import {
  useAllStudentsQuery,
  useTransferStudentBranchMutation,
  useLazyStudentByIdQuery,
} from "../../app/api/studentsApi";
import type { StudentDetail } from "../../app/api/studentsApi/types";
import { useAllCoursesQuery } from "../../app/api/coursesApi";
import { useAllRoomsQuery } from "../../app/api/roomsApi";
import { useAllBranchesQuery } from "../../app/api/branchesApi/branchesApi";
import { useToast } from "../../Context/ToastContext";
import { extractApiError, formatTrainingDate } from "../../utils";
import { formatDate } from "../../constants/FlatStudents";

import { AddStudentDrawer, type AddStudentOption } from "./AddStudentDrawer/AddStudentDrawer";

import { Attendance } from "./tabs/Attendance";
import { Grade } from "./tabs/Grade";
import { OnlineLessons } from "./tabs/OnlineLessons";
import { DiscountPrices } from "./tabs/DiscountPrices";
import { Exams } from "./tabs/Exams";
import { History } from "./tabs/History";
import { Comments } from "./tabs/Comments";

import { GroupStudent, RemoveReason } from "./types";
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
// row (studentGroupsData below — fetched with no status filter, so it
// covers every status: PROBATION/ACTIVE/FROZEN/INACTIVE/DELETED) is
// INACTIVE or DELETED and they're not among GroupDetail's currently-active
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
  // Full membership roster for this group (every status: PROBATION/ACTIVE/
  // FROZEN/INACTIVE/DELETED) — the authoritative source for each student's
  // real status and their /student-groups row id (see combinedStudents).
  const { data: studentGroupsData } = useStudentGroupsQuery({ groupId: id ?? "", limit: 500 }, { skip: !id });
  const [assignStudentsToGroup, { isLoading: isAssigning }] = useAssignStudentsToGroupMutation();
  const [transferStudent, { isLoading: isTransferring }] = useTransferStudentMutation();
  const [updateGroup, { isLoading: isSavingGroup }] = useUpdateGroupMutation();
  const [removeTeacherFromGroup, { isLoading: isRemovingTeacher }] = useRemoveTeacherFromGroupMutation();
  const [toggleGroupStatus] = useToggleGroupStatusMutation();
  const [freezeStudentGroup, { isLoading: isFreezing }] = useFreezeStudentGroupMutation();
  const [unfreezeStudentGroup, { isLoading: isUnfreezing }] = useUnfreezeStudentGroupMutation();
  const [updateStudentGroupStatus, { isLoading: isChangingMembershipStatus }] = useUpdateStudentGroupStatusMutation();
  const [updateStudentGroup, { isLoading: isSavingMembershipDates }] = useUpdateStudentGroupMutation();
  const [transferStudentBranch, { isLoading: isMovingBranch }] = useTransferStudentBranchMutation();
  const [fetchStudentDetail] = useLazyStudentByIdQuery();
  const [fetchGroupExcel, { isFetching: isExportingExcel }] = useLazyGroupExcelQuery();

  const group = groupDetailData ? toLegacyGroup(groupDetailData.data) : undefined;
  const teacher = group ? findTeacherById(group.teacherId) : undefined;
  const [students, setStudents] = useState<RealGroupStudent[]>([]);
  useEffect(() => {
    if (groupDetailData) setStudents(toRealStudents(groupDetailData.data));
  }, [groupDetailData]);
  const [showArchived, setShowArchived] = useState(false);

  const archivedStudents = useMemo(() => {
    const activeIds = new Set(students.map((s) => s.realId));
    return deriveArchivedFromMemberships(studentGroupsData?.rows ?? [], activeIds);
  }, [studentGroupsData, students]);

  const membershipByStudentId = useMemo(() => {
    const map = new Map<string, StudentGroupRecord>();
    (studentGroupsData?.rows ?? []).forEach((m) => { if (m.studentId) map.set(m.studentId, m); });
    return map;
  }, [studentGroupsData]);

  // GroupDetail.students has no balance field (see toRealStudents above,
  // which defaults everyone to 0) — GET /students does carry the real
  // balance, and allStudentsData is already fetched for addStudentCandidates
  // below, so it's reused here rather than firing a second request. Without
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
    const base = [...students, ...archivedStudents];
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
  }, [students, archivedStudents, membershipByStudentId, balanceByStudentId]);

  const addStudentCandidates: AddStudentOption[] = useMemo(() => {
    const existingIds = new Set(combinedStudents.map((s) => s.realId));
    return (allStudentsData?.data ?? [])
      .filter((s) => !existingIds.has(s.id))
      .map((s) => ({ id: s.id, name: s.name, phone: s.phone ?? "" }));
  }, [allStudentsData, combinedStudents]);

  const otherGroups = useMemo(
    () => (groupsSelectData ?? []).filter((g) => g.id !== id),
    [groupsSelectData, id]
  );

  const courseOptions = useMemo(
    () => (allCoursesData?.data ?? []).map((c) => ({ id: c.id, name: c.name })),
    [allCoursesData]
  );
  const roomOptions = useMemo(
    () => (allRoomsData?.data ?? []).map((r) => ({ id: r.id, name: r.name })),
    [allRoomsData]
  );

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

  // Student action states
  const [freezeOpen, setFreezeOpen] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);
  const [graduateTrialOpen, setGraduateTrialOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [removeDeleteMode, setRemoveDeleteMode] = useState(false);
  const [removeReason, setRemoveReason] = useState<RemoveReason>("");
  const [removeComment, setRemoveComment] = useState("");
  const [removeRecalculate, setRemoveRecalculate] = useState(false);
  const [removeScope, setRemoveScope] = useState<"current" | "all">("current");

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

  const sortedStudents = [...visibleStudents].sort((a, b) =>
    sortBy === "az" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
  );

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
    return {
      id: student.id,
      uid: student.realId,
      name: detail?.name ?? student.name,
      phone: detail?.phone ?? student.phone,
      active: detail ? detail.status === "ACTIVE" : student.active,
      balance: detail?.balance ?? student.balance,
      addedAt: detail?.createdAt ? formatDate(detail.createdAt) : student.addedAt,
      activatedAt: detail?.groupsStart ? formatDate(detail.groupsStart) : student.activatedAt,
      frozenAt: student.frozenAt,
    };
  }

  const handleStudentMouseEnter = (e: React.MouseEvent<HTMLElement>, student: RealGroupStudent) => {
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

  const formatDisplayDate = (iso: string) => {
    const [y, m, d] = iso.split("-");
    return `${d}.${m}.${y}`;
  };

  const handleFreezeConfirm = async (data: { reason: string; startDate: string; recalculateBalance: boolean }) => {
    if (!selectedStudent) return;
    const studentGroupId = selectedStudent.studentGroupId;
    if (!studentGroupId) {
      toast.error(t("singleGroup.freezeModal.toast.error"));
      return;
    }
    try {
      // POST /student-groups/{id}/freeze (Swagger): {id} is the membership's
      // own id (StudentGroupRecord.id), not the student id — startDate is
      // required. `recalculateBalance` isn't part of the documented request
      // body, so it isn't sent — the checkbox stays purely local until the
      // backend documents support for it.
      await freezeStudentGroup({
        id: studentGroupId,
        startDate: data.startDate,
        reason: data.reason.trim() || undefined,
      }).unwrap();
      toast.success(t("singleGroup.freezeModal.toast.success"));
      setStudents((prev) =>
        prev.map((s) =>
          s.id === selectedStudent.id
            ? { ...s, active: false, frozenAt: formatDisplayDate(data.startDate) }
            : s
        )
      );
      setFreezeOpen(false);
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t("singleGroup.freezeModal.toast.error");
      toast.error(detail ? `${generic}: ${detail}` : generic);
    }
  };

  const handleActivateConfirm = async (activateDate: string) => {
    if (!selectedStudent) return;
    const studentGroupId = selectedStudent.studentGroupId;
    if (!studentGroupId) {
      toast.error(t("singleGroup.activateModal.toast.notFound"));
      return;
    }
    try {
      // POST /student-groups/{id}/unfreeze — same membership id as freeze,
      // no request body.
      await unfreezeStudentGroup(studentGroupId).unwrap();
      toast.success(t("singleGroup.activateModal.toast.success"));
      setStudents((prev) =>
        prev.map((s) =>
          s.id === selectedStudent.id
            ? {
                ...s,
                active: true,
                frozenAt: undefined,
                activatedAt: formatDisplayDate(activateDate),
              }
            : s
        )
      );
      setActivateOpen(false);
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t("singleGroup.activateModal.toast.error");
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

  // Promotes a currently-active PROBATION (trial-lesson) membership to
  // ACTIVE so payment starts being calculated. Two documented calls in
  // sequence: PATCH /student-groups/{id}/status (status is the only field
  // that endpoint accepts) sets ACTIVE, then PATCH /student-groups/{id}
  // (which does accept paymentStartDate) records when billing should start —
  // same two resources handleActivateArchived/handleFreezeConfirm already
  // use elsewhere in this file, just composed together here.
  const handleGraduateTrialConfirm = async (paymentStartDate: string) => {
    const target = selectedStudent;
    setGraduateTrialOpen(false);
    if (!target?.studentGroupId) {
      toast.error(t("singleGroup.graduateTrialModal.toast.error"));
      return;
    }
    try {
      await updateStudentGroupStatus({ id: target.studentGroupId, status: "ACTIVE" }).unwrap();
      await updateStudentGroup({ id: target.studentGroupId, paymentStartDate }).unwrap();
      toast.success(t("singleGroup.graduateTrialModal.toast.success"));
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t("singleGroup.graduateTrialModal.toast.error");
      toast.error(detail ? `${generic}: ${detail}` : generic);
    }
  };

  const resetRemoveState = () => {
    setRemoveDeleteMode(false);
    setRemoveReason("");
    setRemoveComment("");
    setRemoveRecalculate(false);
    setRemoveScope("current");
  };

  const handleCloseRemove = () => {
    setRemoveOpen(false);
    resetRemoveState();
  };

  const handleRemoveStudent = async () => {
    if (!selectedStudent) return;
    const studentGroupId = selectedStudent.studentGroupId;
    if (!studentGroupId) {
      toast.error(t("singleGroup.removeStudentDialog.toast.error"));
      return;
    }
    try {
      // PATCH /student-groups/{id}/status (Swagger: status required; reason/
      // reasonId/isAllGroup/studentDelete optional) — this is what the
      // dialog's reason/comment/scope/delete-mode fields were collected for
      // but never actually sent before. `studentDelete`'s own Swagger
      // description reads "Talabani o'chirish (INACTIVE qilish)", so
      // deleteMode maps to that flag rather than a separate DELETE
      // /students/{id} call. No reasonId is sent since the dialog's reason
      // dropdown isn't backed by the real Reason model (reasonsApi) — its
      // label is folded into the free-text `reason` field instead.
      const reasonParts = [removeReason, removeComment.trim()].filter(Boolean);
      await updateStudentGroupStatus({
        id: studentGroupId,
        status: removeDeleteMode ? "DELETED" : "INACTIVE",
        reason: reasonParts.length ? reasonParts.join(" — ") : undefined,
        isAllGroup: removeScope === "all",
        studentDelete: removeDeleteMode,
      }).unwrap();
      toast.success(
        removeDeleteMode
          ? t("singleGroup.removeStudentDialog.toast.deleted")
          : t("singleGroup.removeStudentDialog.toast.removed")
      );
      setRemoveOpen(false);
      resetRemoveState();
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t("singleGroup.removeStudentDialog.toast.error");
      toast.error(detail ? `${generic}: ${detail}` : generic);
    }
  };

  const handleAddStudentSubmit = async (studentId: string) => {
    if (!id) return;
    try {
      await assignStudentsToGroup({ id, studentIds: [studentId] }).unwrap();
      toast.success(t("singleGroup.addStudentDrawer.toast.success"));
      setAddStudentOpen(false);
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t("singleGroup.addStudentDrawer.toast.error");
      toast.error(detail ? `${generic}: ${detail}` : generic);
    }
  };

  const handleMoveStudent = async (newGroupId: string, reason: string) => {
    if (!selectedStudent || !id) return;
    try {
      await transferStudent({ id, studentId: selectedStudent.realId, newGroupId, reason }).unwrap();
      toast.success(t("singleGroup.moveStudentDialog.toast.success"));
      setMoveOpen(false);
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t("singleGroup.moveStudentDialog.toast.error");
      toast.error(detail ? `${generic}: ${detail}` : generic);
    }
  };

  const handleMoveToBranch = async (branchId: string): Promise<boolean> => {
    if (!selectedStudent) return false;
    try {
      await transferStudentBranch({ id: selectedStudent.realId, newBranchId: branchId }).unwrap();
      toast.success(t("singleGroup.studentActionsMenu.moveToBranchModal.toast.success"));
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

  const handleRemoveTeacher = async (teacherId: string) => {
    if (!id) return;
    try {
      await removeTeacherFromGroup({ id, teacherId }).unwrap();
      toast.success(t("singleGroup.editGroupDrawer.toast.teacherRemoved"));
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t("singleGroup.editGroupDrawer.toast.error");
      toast.error(detail ? `${generic}: ${detail}` : generic);
    }
  };

  const handleToggleGroupStatus = async () => {
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
              >
                <MdEdit size={16} color="#1976d2" />
              </ActionIconBtn>
              <ActionIconBtn label={t("singleGroup.leftPanel.sendSms")} onClick={() => setSmsOpen(true)}>
                <MdEmail size={16} color="#f57c00" />
              </ActionIconBtn>
              <ActionIconBtn label={t("singleGroup.leftPanel.addStudent")} onClick={() => setAddStudentOpen(true)}>
                <GoPlus size={16} />
              </ActionIconBtn>
              <ActionIconBtn label={t("singleGroup.leftPanel.toggleStatus")} onClick={handleToggleGroupStatus}>
                <MdSwapHoriz size={16} color="#6b7280" />
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
            sx={{ mb: 1.5, fontSize: 14 }}
          >
            <MenuItem value="az">{t("singleGroup.leftPanel.sortAZ")}</MenuItem>
            <MenuItem value="za">{t("singleGroup.leftPanel.sortZA")}</MenuItem>
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
                            color: isArchived ? "#888" : "#1a1a1a",
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

          <Box sx={{ mt: 2, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1.5 }}>
            {/* archivedStudents alone (history-log derived) misses a student
                whose /student-groups membership was set straight to INACTIVE/
                DELETED without a matching "leave" history entry — check
                combinedStudents' own archived flag too, or the toggle never
                renders and that student stays permanently hidden with no way
                to reveal them. */}
            {combinedStudents.some((s) => s.archived) && (
              <Button
                variant="contained"
                size="small"
                onClick={() => setShowArchived((p) => !p)}
                sx={{
                  borderRadius: 999,
                  textTransform: "none",
                  fontSize: 12,
                  fontWeight: 600,
                  bgcolor: "#1976d2",
                  px: 2,
                  py: 0.6,
                  boxShadow: "none",
                  "&:hover": { bgcolor: "#1565c0", boxShadow: "none" },
                }}
              >
                {showArchived
                  ? t("singleGroup.leftPanel.hideArchivedStudents")
                  : t("singleGroup.leftPanel.showArchivedStudents")}
              </Button>
            )}
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
        isSaving={isUnfreezing}
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
        onSave={handleSaveGroup}
        isSaving={isSavingGroup}
        onRemoveTeacher={handleRemoveTeacher}
        isRemovingTeacher={isRemovingTeacher}
      />

      {/* ══ SMS DRAWER ══ */}
      <SmsDrawer open={smsOpen} onClose={() => setSmsOpen(false)} studentCount={students.length} />

      {/* ══ ADD STUDENT DRAWER ══ */}
      <AddStudentDrawer
        open={addStudentOpen}
        onClose={() => setAddStudentOpen(false)}
        students={addStudentCandidates}
        onSubmit={handleAddStudentSubmit}
        isSubmitting={isAssigning}
      />

      {/* ══ ADD NOTE MODAL (top) ══ */}
      <AddNoteModal open={noteOpen} onClose={() => setNoteOpen(false)} student={selectedStudent} />

      {/* ══ REMINDER DRAWER ══ */}
      <ReminderDrawer open={reminderOpen} onClose={() => setReminderOpen(false)} student={selectedStudent} />

      {/* ══ ADD PAYMENT (shared with the Header's quick-add — same design, same logic) ══ */}
      <AddPayment
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        initialStudentId={selectedStudent?.realId}
        initialStudentName={selectedStudent?.name}
        groupId={id}
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
        deleteMode={removeDeleteMode}
        onDeleteModeChange={setRemoveDeleteMode}
        reason={removeReason}
        onReasonChange={setRemoveReason}
        comment={removeComment}
        onCommentChange={setRemoveComment}
        recalculate={removeRecalculate}
        onRecalculateChange={setRemoveRecalculate}
        scope={removeScope}
        onScopeChange={setRemoveScope}
        loading={isChangingMembershipStatus}
      />
    </Box>
  );
};

export default SingleGroup;