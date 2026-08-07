/* eslint-disable @typescript-eslint/no-explicit-any */
// src/pages/groups/SingleGroup.tsx

import {
  Box, Chip, Divider, IconButton, List, ListItem,
  ListItemText, MenuItem, Paper, Select,
  Stack, Tab, Tabs, Typography, Button,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { MdEdit, MdDelete, MdEmail, MdDownload } from "react-icons/md";
import * as XLSX from "xlsx";
import { GoPlus } from "react-icons/go";
import { BsThreeDotsVertical } from "react-icons/bs";
import {
  ALL_GROUPS,
  findGroupById,
  findTeacherById,
  formatDate,
} from "../../constants/Teachers";

import { AddStudentDrawer } from "./AddStudentDrawer/AddStudentDrawer";

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
import { EditGroupDrawer } from "./EditGroupDrawer";
import { DeleteDropdown } from "./DeleteDropdown";
import { SmsDrawer } from "../../components/SmsDrawer";
import { AddNoteModal } from "./AddNoteModal";
import { ReminderDrawer } from "./ReminderDrawer";
import { AddPaymentDrawer } from "./AddPaymentDrawer";
import { MoveStudentDialog } from "./MoveStudentDialog";
import { RemoveStudentDialog } from "./RemoveStudentDialog";

const TAB_KEYS = [
  "attendance", "grade", "onlineLessons",
  "discountPrices", "exams", "history", "comments",
];

const mockBalance = (id: number) => {
  const n = id % 5;
  if (n === 0) return -23077;
  if (n === 1) return 150000;
  if (n === 2) return 0;
  return -45000;
};

const enrichStudents = (list: GroupStudent[]): GroupStudent[] =>
  list.map((s, i, arr) => ({
    ...s,
    balance: s.balance ?? mockBalance(s.id),
    archived: s.archived ?? (arr.length > 2 && i >= arr.length - 2),
    addedAt: s.addedAt,
    activatedAt: s.activatedAt,
  }));

export const SingleGroup = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [tabIndex, setTabIndex] = useState(0);
  const [sortBy, setSortBy] = useState("az");
  const [showCoins, setShowCoins] = useState(false);

  const group = findGroupById(Number(id));
  const teacher = group ? findTeacherById(group.teacherId) : undefined;
  const [students, setStudents] = useState<GroupStudent[]>(() =>
    enrichStudents(group?.students ?? [])
  );
  const [showArchived, setShowArchived] = useState(false);

  // Student dot menu
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedStudent, setSelectedStudent] = useState<GroupStudent | null>(null);

  // Student hover card
  const [hoverStudent, setHoverStudent] = useState<ReturnType<typeof buildHoverData> | null>(null);
  const [hoverAnchorEl, setHoverAnchorEl] = useState<HTMLElement | null>(null);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Drawers
  const [editOpen, setEditOpen] = useState(false);
  const [smsOpen, setSmsOpen] = useState(false);
  const [addStudentOpen, setAddStudentOpen] = useState(false);

  // Delete dropdown
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteAnchorRef = useRef<HTMLButtonElement>(null);

  // Student action states
  const [freezeOpen, setFreezeOpen] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [removeDeleteMode, setRemoveDeleteMode] = useState(false);
  const [removeReason, setRemoveReason] = useState<RemoveReason>("");
  const [removeComment, setRemoveComment] = useState("");
  const [removeRecalculate, setRemoveRecalculate] = useState(false);
  const [, setMoveToBranchOpen] = useState(false);
  const [removeScope, setRemoveScope] = useState<"current" | "all">("current");

  if (!group) {
    return (
      <Box p={4}><Typography>{t("singleGroup.notFound")}</Typography></Box>
    );
  }

  const visibleStudents = students.filter((s) => showArchived || !s.archived);

  const sortedStudents = [...visibleStudents].sort((a, b) =>
    sortBy === "az" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
  );

  const archivedCount = students.filter((s) => s.archived).length;

  const handleOpenMenu = (e: React.MouseEvent<HTMLElement>, student: GroupStudent) => {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
    setSelectedStudent(student);
  };
  const handleCloseMenu = () => setMenuAnchor(null);

  const handleGoToProfile = (studentId: number) => {
    setHoverStudent(null);
    setHoverAnchorEl(null);
    navigate(`/students/${group.id}-${studentId}`);
  };

  function buildHoverData(student: GroupStudent) {
    return {
      id: student.id,
      uid: `${group!.id}-${student.id}`,
      name: student.name,
      phone: student.phone,
      active: student.active,
      balance: student.balance,
      addedAt: student.addedAt,
      activatedAt: student.activatedAt,
      frozenAt: student.frozenAt,
    };
  }

  const handleStudentMouseEnter = (e: React.MouseEvent<HTMLElement>, student: GroupStudent) => {
    if (leaveTimeout.current) clearTimeout(leaveTimeout.current);
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    const target = e.currentTarget;
    hoverTimeout.current = setTimeout(() => {
      setHoverStudent(buildHoverData(student));
      setHoverAnchorEl(target);
    }, student.active ? 200 : 80);
  };

  const handleStudentMouseLeave = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    leaveTimeout.current = setTimeout(() => {
      setHoverStudent(null);
      setHoverAnchorEl(null);
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

  const handleFreezeConfirm = (data: { comment: string; fromDate: string; recalculate: boolean }) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === selectedStudent?.id
          ? { ...s, active: false, frozenAt: data.fromDate ? formatDisplayDate(data.fromDate) : undefined }
          : s
      )
    );
  };

  const handleActivateConfirm = (activateDate: string) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === selectedStudent?.id
          ? {
              ...s,
              active: true,
              frozenAt: undefined,
              activatedAt: formatDisplayDate(activateDate),
            }
          : s
      )
    );
  };

  const handleExportExcel = () => {
    const data = sortedStudents.map((s, i) => ({
      "#": i + 1,
      [t("singleGroup.leftPanel.export.name")]: s.name,
      [t("singleGroup.leftPanel.export.phone")]: s.phone,
      [t("singleGroup.leftPanel.export.status")]: s.archived
        ? t("singleGroup.leftPanel.export.archived")
        : s.active
        ? t("singleGroup.leftPanel.export.active")
        : t("singleGroup.leftPanel.export.frozen"),
      [t("singleGroup.leftPanel.export.balance")]: s.balance ?? 0,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t("singleGroup.leftPanel.export.sheetName"));
    const safeName = group.name.replace(/[^\w\s-]/g, "").trim() || "group";
    XLSX.writeFile(wb, `${safeName}-students.xlsx`);
  };

  const isSelectedArchived = Boolean(selectedStudent?.archived);
  const isSelectedFrozen = selectedStudent ? !selectedStudent.active && !selectedStudent.archived : false;

  const handleActivateArchived = () => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === selectedStudent?.id
          ? { ...s, archived: false, active: true, activatedAt: formatDisplayDate(new Date().toISOString().slice(0, 10)) }
          : s
      )
    );
    handleCloseMenu();
  };

  const handleBackToTrialLesson = () => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === selectedStudent?.id
          ? { ...s, archived: false, active: false }
          : s
      )
    );
    handleCloseMenu();
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

  const handleRemoveStudent = () => {
    if (removeDeleteMode) {
      setStudents((prev) => prev.filter((s) => s.id !== selectedStudent?.id));
    } else {
      setStudents((prev) =>
        prev.map((s) =>
          s.id === selectedStudent?.id
            ? { ...s, archived: true, active: false }
            : s
        )
      );
    }
    setRemoveOpen(false);
    resetRemoveState();
  };

  const handleMoveStudent = () => {
    setStudents((prev) => prev.filter((s) => s.id !== selectedStudent?.id));
    setMoveOpen(false);
  };

  const otherGroups = ALL_GROUPS.filter((g) => g.id !== group.id);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f7f8fa" }}>
      {/* PAGE TITLE */}
      <Stack direction="row" alignItems="center" spacing={1.5} px={3} pt={3} pb={2}>
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

      <Stack direction="row" gap={2} px={3} pb={3} alignItems="flex-start">
        {/* ── LEFT PANEL ── */}
        <Paper sx={{ width: 300, flexShrink: 0, borderRadius: 3, p: 2.5 }}>
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
              <ActionIconBtn label={t("singleGroup.leftPanel.editGroup")} onClick={() => setEditOpen(true)}>
                <MdEdit size={16} color="#1976d2" />
              </ActionIconBtn>
              <ActionIconBtn label={t("singleGroup.leftPanel.deleteGroup")} btnRef={deleteAnchorRef as any} onClick={() => setDeleteOpen((p) => !p)}>
                <MdDelete size={16} color="#e53935" />
              </ActionIconBtn>
              <ActionIconBtn label={t("singleGroup.leftPanel.sendSms")} onClick={() => setSmsOpen(true)}>
                <MdEmail size={16} color="#f57c00" />
              </ActionIconBtn>
              <ActionIconBtn label={t("singleGroup.leftPanel.addStudent")} onClick={() => setAddStudentOpen(true)}>
                <GoPlus size={16} />
              </ActionIconBtn>
            </Stack>
          </Stack>

          <Divider sx={{ my: 1.5 }} />

          <Typography fontSize={14}><b>{t("singleGroup.leftPanel.rooms")}:</b> {group.room}</Typography>
          <Typography fontSize={14}><b>{t("singleGroup.leftPanel.roomCapacity")}:</b> {group.roomCapacity ?? 30}</Typography>
          <Typography fontSize={14} mt={0.5}><b>{t("singleGroup.leftPanel.trainingDates")}:</b></Typography>
          <Typography fontSize={14}>{formatDate(group.startDate)} — {formatDate(group.endDate)}</Typography>
          <Typography fontSize={12} color="text.secondary">({t("singleGroup.leftPanel.idLabel")}: {group.id})</Typography>

          {group.branch && (
            <Box mt={1}>
              <Typography fontSize={13} color="text.secondary">{t("singleGroup.leftPanel.branches")}:</Typography>
              <Chip label={group.branch} size="small" sx={{ mt: 0.5 }} />
            </Box>
          )}

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
                  onClick={() => handleGoToProfile(s.id)}
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
                      <Typography fontSize={12} color="text.secondary" component="span" display="block">
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
            {archivedCount > 0 && (
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
              title={t("singleGroup.leftPanel.exportToExcel")}
              sx={{
                border: "2px solid #43a047",
                color: "#43a047",
                width: 44,
                height: 44,
                "&:hover": { bgcolor: "#e8f5e9", borderColor: "#2e7d32", color: "#2e7d32" },
              }}
            >
              <MdDownload size={22} />
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
              {tabIndex === 0 && <Attendance students={students} />}
              {tabIndex === 1 && <Grade students={students} />}
              {tabIndex === 2 && <OnlineLessons />}
              {tabIndex === 3 && <DiscountPrices students={students} />}
              {tabIndex === 4 && <Exams />}
              {tabIndex === 5 && (
                <History
                  groupId={group.id}
                  groupName={group.name}
                  students={students}
                />
              )}
              {tabIndex === 6 && <Comments />}
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
            if (hoverStudent) handleGoToProfile(hoverStudent.id);
          }}
        />
      </div>

      {/* ══ STUDENT ACTIONS MENU (matches reference design) ══ */}
      <StudentActionsMenu
        anchorEl={menuAnchor}
        onClose={handleCloseMenu}
        isArchived={isSelectedArchived}
        isFrozen={isSelectedFrozen}
        onActivateArchived={handleActivateArchived}
        onBackToTrialLesson={handleBackToTrialLesson}
        onActivate={() => { handleCloseMenu(); setActivateOpen(true); }}
        onMakeFrozen={() => { handleCloseMenu(); setFreezeOpen(true); }}
        onAddPayment={() => { handleCloseMenu(); setPaymentOpen(true); }}
        onAddNote={() => { handleCloseMenu(); setNoteOpen(true); }}
        onMoveGroup={() => { handleCloseMenu(); setMoveOpen(true); }}
        onMoveToBranch={() => { handleCloseMenu(); setMoveToBranchOpen(true); }}
        onRemove={() => { handleCloseMenu(); setRemoveOpen(true); }}
        onReminders={() => { handleCloseMenu(); setReminderOpen(true); }}
      />

      {/* ══ FREEZE MODAL (matches reference design) ══ */}
      <FreezeModal
        open={freezeOpen}
        onClose={() => setFreezeOpen(false)}
        student={selectedStudent}
        onConfirm={handleFreezeConfirm}
      />

      <ActivateModal
        open={activateOpen}
        onClose={() => setActivateOpen(false)}
        onConfirm={handleActivateConfirm}
      />

      {/* ══ EDIT GROUP DRAWER ══ */}
      <EditGroupDrawer group={group} open={editOpen} onClose={() => setEditOpen(false)} />

      {/* ══ DELETE DROPDOWN ══ */}
      <DeleteDropdown
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        anchorRef={deleteAnchorRef as any}
        groupName={group.name}
        onConfirm={() => { setDeleteOpen(false); navigate(-1); }}
      />

      {/* ══ SMS DRAWER ══ */}
      <SmsDrawer open={smsOpen} onClose={() => setSmsOpen(false)} studentCount={students.length} />

      {/* ══ ADD STUDENT DRAWER ══ */}
      <AddStudentDrawer
        open={addStudentOpen}
        onClose={() => setAddStudentOpen(false)}
        onAdd={(s) => setStudents((prev) => [...prev, s])}
      />

      {/* ══ ADD NOTE MODAL (top) ══ */}
      <AddNoteModal open={noteOpen} onClose={() => setNoteOpen(false)} student={selectedStudent} />

      {/* ══ REMINDER DRAWER ══ */}
      <ReminderDrawer open={reminderOpen} onClose={() => setReminderOpen(false)} student={selectedStudent} />

      {/* ══ ADD PAYMENT DRAWER (right) ══ */}
      <AddPaymentDrawer
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        student={selectedStudent}
      />

      {/* ══ MOVE DIALOG ══ */}
      <MoveStudentDialog
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        student={selectedStudent}
        groups={otherGroups}
        onMove={handleMoveStudent}
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
      />
    </Box>
  );
};

export default SingleGroup;