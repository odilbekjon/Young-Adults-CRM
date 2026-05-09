/* eslint-disable @typescript-eslint/no-explicit-any */
// src/pages/groups/SingleGroup.tsx

import {
  Box, Chip, Divider, IconButton, List, ListItem,
  ListItemText, MenuItem, Paper, Select,
  Stack, Tab, Tabs, Tooltip, Typography,
  Menu,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { MdEdit, MdDelete, MdEmail, MdClose, MdSearch } from "react-icons/md";
import { GoPlus } from "react-icons/go";
import { BsThreeDotsVertical } from "react-icons/bs";
import {
  ALL_GROUPS,
  Student,
  findGroupById,
  findTeacherById,
  formatDate,
} from "../../constants/Teachers";

import { Attendance } from "./tabs/Attendance";
import { Grade } from "./tabs/Grade";
import { OnlineLessons } from "./tabs/OnlineLessons";
import { DiscountPrices } from "./tabs/DiscountPrices";
import { Exams } from "./tabs/Exams";
import { History } from "./tabs/History";
import { Comments } from "./tabs/Comments";

const TABS = [
  "Attendance", "Grade", "Online lessons and materials",
  "Discount prices", "Exams", "History", "Comments",
];

/* ─── shared styles ─── */
const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #e0e0e0",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 13,
  color: "#1a1a1a",
  outline: "none",
  boxSizing: "border-box",
  background: "#fff",
  fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: "#1a1a1a",
  marginBottom: 6,
  display: "block",
};

const submitBtn: React.CSSProperties = {
  background: "#1a3a5c",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "11px 24px",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

const cancelBtn: React.CSSProperties = {
  background: "#fff",
  color: "#666",
  border: "1px solid #e0e0e0",
  borderRadius: 10,
  padding: "11px 24px",
  fontSize: 14,
  cursor: "pointer",
};

/* ══════════════════════════════════════════
   Right-side Drawer (reusable)
══════════════════════════════════════════ */
const RightDrawer = ({
  open,
  onClose,
  title,
  width = 480,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  width?: number;
  children: React.ReactNode;
}) => (
  <>
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.18)",
        zIndex: 1200,
        opacity: open ? 1 : 0,
        pointerEvents: open ? "auto" : "none",
        transition: "opacity 0.25s",
      }}
    />
    <div
      style={{
        position: "fixed", top: 0, right: 0,
        width, height: "100vh",
        background: "#fff",
        zIndex: 1300,
        boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.28s cubic-bezier(.4,0,.2,1)",
        display: "flex", flexDirection: "column",
        overflowY: "auto",
      }}
    >
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 24px 16px",
        borderBottom: "1px solid #f0f0f0",
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 17, fontWeight: 600, color: "#1a1a1a" }}>{title}</span>
        <div onClick={onClose} style={{ cursor: "pointer", color: "#888", fontSize: 20, display: "flex" }}>
          <MdClose />
        </div>
      </div>
      <div style={{ padding: 24, flex: 1, overflowY: "auto" }}>
        {children}
      </div>
    </div>
  </>
);

/* ══════════════════════════════════════════
   Top Dropdown (reusable)
══════════════════════════════════════════ */
const TopDropdown = ({
  open,
  onClose,
  anchorRef,
  children,
  width = 320,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement>;
  children: React.ReactNode;
  width?: number;
}) => {
  const dropRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (open && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 8, left: Math.min(rect.left, window.innerWidth - width - 12) });
    }
  }, [open, anchorRef, width]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        dropRef.current && !dropRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return (
    <div
      ref={dropRef}
      style={{
        position: "fixed",
        top: pos.top, left: pos.left,
        zIndex: 1400,
        background: "#fff",
        border: "1px solid #e8e8e8",
        borderRadius: 12,
        boxShadow: "0 8px 32px rgba(0,0,0,0.13)",
        padding: 20,
        width,
        animation: "dropDown 0.18s ease",
      }}
    >
      <style>{`@keyframes dropDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }`}</style>
      {children}
    </div>
  );
};

/* ══════════════════════════════════════════
   Edit Group Drawer
══════════════════════════════════════════ */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const EditGroupDrawer = ({ group, open, onClose }: { group: any; open: boolean; onClose: () => void }) => (
  <RightDrawer open={open} onClose={onClose} title="Edit Group">
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {[
        { label: "Group name", defaultValue: group.name },
        { label: "Course", defaultValue: group.course },
        { label: "Teacher", defaultValue: group.teacher },
        { label: "Branch", defaultValue: group.branch || "" },
        { label: "Price (UZS)", defaultValue: group.price || "", type: "number" },
        { label: "Room", defaultValue: group.room || "" },
      ].map(({ label, defaultValue, type }) => (
        <div key={label}>
          <label style={labelStyle}>{label}</label>
          <input style={inputStyle} defaultValue={defaultValue} type={type || "text"} />
        </div>
      ))}
      <div>
        <label style={labelStyle}>Start date</label>
        <input style={inputStyle} type="date" defaultValue={group.startDate} />
      </div>
      <div>
        <label style={labelStyle}>End date</label>
        <input style={inputStyle} type="date" defaultValue={group.endDate} />
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button style={submitBtn} onClick={onClose}>Save</button>
        <button style={cancelBtn} onClick={onClose}>Cancel</button>
      </div>
    </div>
  </RightDrawer>
);

/* ══════════════════════════════════════════
   Delete Group Dropdown
══════════════════════════════════════════ */
const DeleteDropdown = ({
  open, onClose, anchorRef, groupName, onConfirm,
}: {
  open: boolean; onClose: () => void;
  anchorRef: React.RefObject<HTMLElement>;
  groupName: string; onConfirm: () => void;
}) => (
  <TopDropdown open={open} onClose={onClose} anchorRef={anchorRef} width={300}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <span style={{ fontSize: 14, fontWeight: 600, color: "#c0392b" }}>🗑 Delete Group</span>
      <MdClose size={16} color="#aaa" style={{ cursor: "pointer" }} onClick={onClose} />
    </div>
    <p style={{ fontSize: 13, color: "#555", margin: "0 0 16px" }}>
      <b>{groupName}</b> guruhini o'chirishni tasdiqlaysizmi? Bu amalni qaytarib bo'lmaydi.
    </p>
    <div style={{ display: "flex", gap: 8 }}>
      <button style={cancelBtn} onClick={onClose}>Cancel</button>
      <button
        style={{ ...submitBtn, background: "#c0392b" }}
        onClick={onConfirm}
      >
        Delete
      </button>
    </div>
  </TopDropdown>
);

/* ══════════════════════════════════════════
   SMS Drawer
══════════════════════════════════════════ */
const SmsDrawer = ({
  open, onClose, studentCount,
}: {
  open: boolean; onClose: () => void; studentCount: number;
}) => {
  const [message, setMessage] = useState("");
  const smsCount = message.length === 0 ? 1 : Math.ceil(message.length / 160);
  return (
    <RightDrawer open={open} onClose={onClose} title="Send SMS to group" width={480}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: "#1a1a1a" }}>
          Sender: <span style={{ color: "#185FA5" }}>3700</span>
        </div>
        <div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter a message"
            style={{
              ...inputStyle,
              minHeight: 140,
              resize: "vertical",
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 12, color: "#888" }}>
            <span>{message.length} symbols ( ~ {smsCount} SMS )</span>
            <span>{studentCount} selected stud.</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            style={submitBtn}
            onClick={() => { setMessage(""); onClose(); }}
          >
            Send SMS
          </button>
          <button style={cancelBtn} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </RightDrawer>
  );
};

/* ══════════════════════════════════════════
   Add Student Drawer
══════════════════════════════════════════ */
// Mock student search data
const MOCK_STUDENTS = [
  { id: 101, name: "Aliyev Bobur", phone: "(90) 123-45-67" },
  { id: 102, name: "Karimova Malika", phone: "(93) 234-56-78" },
  { id: 103, name: "Toshmatov Jasur", phone: "(91) 345-67-89" },
  { id: 104, name: "Yusupova Nilufar", phone: "(94) 456-78-90" },
  { id: 105, name: "Rahimov Sherzod", phone: "(97) 567-89-01" },
  { id: 106, name: "Mirzayeva Zulfiya", phone: "(99) 678-90-12" },
  { id: 107, name: "Hasanov Eldor", phone: "(88) 789-01-23" },
];

const AddStudentDrawer = ({
  open, onClose, onAdd,
}: {
  open: boolean; onClose: () => void; onAdd: (s: Student & { startDate?: string }) => void;
}) => {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<typeof MOCK_STUDENTS[0] | null>(null);
  const [startDate, setStartDate] = useState("");

  const filtered = query.length > 0
    ? MOCK_STUDENTS.filter(
        (s) =>
          s.name.toLowerCase().includes(query.toLowerCase()) ||
          s.phone.includes(query)
      )
    : [];

  const handleAdd = () => {
    if (!selected) return;
    onAdd({ id: selected.id, name: selected.name, phone: selected.phone, active: true });
    setQuery("");
    setSelected(null);
    setStartDate("");
    onClose();
  };

  return (
    <RightDrawer open={open} onClose={onClose} title="Add Student" width={440}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {/* Search */}
        <div>
          <label style={labelStyle}>Search student</label>
          <div style={{ position: "relative" }}>
            <MdSearch
              size={16}
              style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#aaa" }}
            />
            <input
              style={{ ...inputStyle, paddingLeft: 36 }}
              placeholder="Name or phone..."
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
            />
          </div>
          {/* Dropdown results */}
          {filtered.length > 0 && !selected && (
            <div style={{
              border: "1px solid #e0e0e0",
              borderRadius: 8,
              marginTop: 4,
              background: "#fff",
              boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
              overflow: "hidden",
            }}>
              {filtered.map((s) => (
                <div
                  key={s.id}
                  onClick={() => { setSelected(s); setQuery(s.name); }}
                  style={{
                    padding: "10px 14px",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                    borderBottom: "1px solid #f5f5f5",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f7fbff")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                >
                  <span style={{ fontWeight: 500 }}>{s.name}</span>
                  <span style={{ color: "#888" }}>{s.phone}</span>
                </div>
              ))}
            </div>
          )}
          {query.length > 0 && filtered.length === 0 && !selected && (
            <div style={{ fontSize: 12, color: "#aaa", marginTop: 6, padding: "0 4px" }}>
              No students found
            </div>
          )}
        </div>

        {/* Selected student preview */}
        {selected && (
          <div style={{
            background: "#f7fbff",
            border: "1px solid #B5D4F4",
            borderRadius: 8,
            padding: "12px 14px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: "#1a1a1a" }}>{selected.name}</div>
              <div style={{ fontSize: 12, color: "#888" }}>{selected.phone}</div>
            </div>
            <div
              onClick={() => { setSelected(null); setQuery(""); }}
              style={{ cursor: "pointer", color: "#aaa" }}
            >
              <MdClose size={16} />
            </div>
          </div>
        )}

        {/* Start date */}
        <div>
          <label style={labelStyle}>Start date (qachondan keladi)</label>
          <input
            type="date"
            style={inputStyle}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button
            style={{ ...submitBtn, opacity: selected ? 1 : 0.5 }}
            onClick={handleAdd}
            disabled={!selected}
          >
            Add Student
          </button>
          <button style={cancelBtn} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </RightDrawer>
  );
};

/* ══════════════════════════════════════════
   Main — SingleGroup
══════════════════════════════════════════ */
export const SingleGroup = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tabIndex, setTabIndex] = useState(0);
  const [sortBy, setSortBy] = useState("By A-Z");
  const [showCoins, setShowCoins] = useState(false);

  const group = findGroupById(Number(id));
  const teacher = group ? findTeacherById(group.teacherId) : undefined;
  const [students, setStudents] = useState<Student[]>(group?.students ?? []);

  // Student dot menu
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Drawers
  const [editOpen, setEditOpen] = useState(false);
  const [smsOpen, setSmsOpen] = useState(false);
  const [addStudentOpen, setAddStudentOpen] = useState(false);

  // Delete dropdown
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteAnchorRef = useRef<HTMLButtonElement>(null);

  // Payment / Move / Remove (keep as simple MUI dialogs)
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);

  if (!group) {
    return <Box p={4}><Typography>Group not found.</Typography></Box>;
  }

  const sortedStudents = [...students].sort((a, b) =>
    sortBy === "By A-Z" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
  );

  const handleOpenMenu = (e: React.MouseEvent<HTMLElement>, student: Student) => {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
    setSelectedStudent(student);
  };
  const handleCloseMenu = () => setMenuAnchor(null);

  const handleFreeze = () => {
    setStudents((prev) =>
      prev.map((s) => s.id === selectedStudent?.id ? { ...s, active: !s.active } : s)
    );
    handleCloseMenu();
  };

  const handleRemoveStudent = () => {
    setStudents((prev) => prev.filter((s) => s.id !== selectedStudent?.id));
    setRemoveOpen(false);
  };

  const otherGroups = ALL_GROUPS.filter((g) => g.id !== group.id);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f7f8fa" }}>

      {/* PAGE TITLE */}
      <Stack direction="row" alignItems="center" spacing={1.5} px={3} pt={3} pb={2}>
        <Typography variant="h5" fontWeight={700}
          sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
          onClick={() => navigate(-1)}
        >
          {group.name}
        </Typography>
        <Typography variant="h5" color="text.secondary">·</Typography>
        <Typography variant="h5" fontWeight={700}>{group.course}</Typography>
        <Typography variant="h5" color="text.secondary">·</Typography>
        <Typography variant="h5" fontWeight={700}
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
              <Typography fontSize={14}><b>Course:</b> {group.course}</Typography>
              <Typography fontSize={14}><b>Teacher:</b> {group.teacher}</Typography>
              <Typography fontSize={14}>
                <b>Price:</b> {group.price ? `${group.price.toLocaleString()} UZS` : "—"}
              </Typography>
              <Typography fontSize={14}><b>Time:</b> {group.days} · {group.lessonStartTime}</Typography>
            </Box>

            <Stack spacing={1}>
              <Tooltip title="Edit group">
                <IconButton size="small" sx={{ border: "1px solid #e0e0e0", borderRadius: 2 }}
                  onClick={() => setEditOpen(true)}>
                  <MdEdit size={16} color="#1976d2" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete group">
                <IconButton
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  ref={deleteAnchorRef as any}
                  size="small" sx={{ border: "1px solid #e0e0e0", borderRadius: 2 }}
                  onClick={() => setDeleteOpen((p) => !p)}
                >
                  <MdDelete size={16} color="#e53935" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Send SMS">
                <IconButton size="small" sx={{ border: "1px solid #e0e0e0", borderRadius: 2 }}
                  onClick={() => setSmsOpen(true)}>
                  <MdEmail size={16} color="#f57c00" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Add student">
                <IconButton size="small" sx={{ border: "1px solid #e0e0e0", borderRadius: 2 }}
                  onClick={() => setAddStudentOpen(true)}>
                  <GoPlus size={16} />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>

          <Divider sx={{ my: 1.5 }} />

          <Typography fontSize={14}><b>Rooms:</b> {group.room}</Typography>
          <Typography fontSize={14}><b>Room capacity:</b> {group.roomCapacity ?? 30}</Typography>
          <Typography fontSize={14} mt={0.5}><b>Training dates:</b></Typography>
          <Typography fontSize={14}>
            {formatDate(group.startDate)} — {formatDate(group.endDate)}
          </Typography>
          <Typography fontSize={12} color="text.secondary">(id: {group.id})</Typography>

          {group.branch && (
            <Box mt={1}>
              <Typography fontSize={13} color="text.secondary">Branches:</Typography>
              <Chip label={group.branch} size="small" sx={{ mt: 0.5 }} />
            </Box>
          )}

          <Divider sx={{ my: 1.5 }} />

          <Select size="small" fullWidth value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            sx={{ mb: 1.5, fontSize: 14 }}>
            <MenuItem value="By A-Z">By A-Z</MenuItem>
            <MenuItem value="By Z-A">By Z-A</MenuItem>
          </Select>

          <List dense disablePadding>
            {sortedStudents.map((s, i) => (
              <ListItem key={s.id} disablePadding sx={{ py: 0.5 }}
                secondaryAction={
                  <IconButton size="small" onClick={(e) => handleOpenMenu(e, s)}>
                    <BsThreeDotsVertical />
                  </IconButton>
                }
              >
                <Typography fontSize={12} color="text.secondary" sx={{ minWidth: 20 }}>{i + 1}.</Typography>
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: s.active ? "#43a047" : "#bdbdbd", mx: 1, flexShrink: 0 }} />
                <ListItemText
                  primary={
                    <Typography fontSize={13} fontWeight={500}
                      sx={{ textDecoration: s.active ? "none" : "line-through", color: s.active ? "inherit" : "#999" }}>
                      {s.name}
                    </Typography>
                  }
                  secondary={<Typography fontSize={12} color="text.secondary">{s.phone}</Typography>}
                />
              </ListItem>
            ))}
          </List>
        </Paper>

        {/* ── RIGHT PANEL ── */}
        <Box sx={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
          <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={1} mb={1}>
            <Typography fontSize={13} color={showCoins ? "primary" : "text.secondary"}>Show coins</Typography>
            <Box onClick={() => setShowCoins((p) => !p)}
              sx={{ width: 40, height: 22, borderRadius: 11, bgcolor: showCoins ? "primary.main" : "#ccc", cursor: "pointer", position: "relative", transition: "0.2s" }}>
              <Box sx={{ position: "absolute", top: 3, left: showCoins ? 20 : 3, width: 16, height: 16, borderRadius: "50%", bgcolor: "#fff", transition: "0.2s" }} />
            </Box>
            <Typography fontSize={13} color={!showCoins ? "primary" : "text.secondary"}>Hide coins</Typography>
          </Stack>

          <Paper sx={{ borderRadius: 3, overflow: "visible" }}>
            <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} variant="scrollable" scrollButtons="auto"
              sx={{ borderBottom: "1px solid #eee", "& .MuiTab-root": { fontSize: 13, textTransform: "none", minWidth: "auto", px: 2 } }}>
              {TABS.map((tab) => <Tab key={tab} label={tab} />)}
            </Tabs>
            <Box sx={{ p: 3, maxHeight: "calc(100vh - 220px)", overflowY: "auto", overflowX: "visible" }}>
              {tabIndex === 0 && <Attendance students={students} />}
              {tabIndex === 1 && <Grade students={students} />}
              {tabIndex === 2 && <OnlineLessons />}
              {tabIndex === 3 && <DiscountPrices />}
              {tabIndex === 4 && <Exams />}
              {tabIndex === 5 && <History />}
              {tabIndex === 6 && <Comments />}
            </Box>
          </Paper>
        </Box>
      </Stack>

      {/* ══ STUDENT DOT MENU ══ */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleCloseMenu}>
        <MenuItem onClick={handleFreeze}>
          {selectedStudent?.active ? "🔴 Muzlatish (Freeze)" : "🟢 Faollashtirish (Unfreeze)"}
        </MenuItem>
        <MenuItem onClick={() => { handleCloseMenu(); setPaymentOpen(true); }}>
          💳 Payment kiritish
        </MenuItem>
        <MenuItem onClick={() => { handleCloseMenu(); setMoveOpen(true); }}>
          🔀 Move to another group
        </MenuItem>
        <MenuItem onClick={() => { handleCloseMenu(); setRemoveOpen(true); }} sx={{ color: "error.main" }}>
          🗑 Remove from group
        </MenuItem>
      </Menu>

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

      {/* ══ PAYMENT (MUI Dialog) ══ */}
      {paymentOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1300,
          background: "rgba(0,0,0,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
          onClick={() => setPaymentOpen(false)}
        >
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 12, padding: 24, width: 360, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>Payment — {selectedStudent?.name}</span>
              <MdClose size={18} style={{ cursor: "pointer", color: "#888" }} onClick={() => setPaymentOpen(false)} />
            </div>
            <input style={inputStyle} type="number" placeholder="Amount (UZS)" />
            <input style={inputStyle} type="date" />
            <textarea style={{ ...inputStyle, minHeight: 70 }} placeholder="Comment" />
            <div style={{ display: "flex", gap: 10 }}>
              <button style={submitBtn} onClick={() => setPaymentOpen(false)}>Save</button>
              <button style={cancelBtn} onClick={() => setPaymentOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MOVE (MUI Dialog) ══ */}
      {moveOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1300,
          background: "rgba(0,0,0,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
          onClick={() => setMoveOpen(false)}
        >
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 12, padding: 24, width: 360, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>Move — {selectedStudent?.name}</span>
              <MdClose size={18} style={{ cursor: "pointer", color: "#888" }} onClick={() => setMoveOpen(false)} />
            </div>
            <select style={inputStyle}>
              <option value="">Select group</option>
              {otherGroups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={submitBtn} onClick={() => {
                setStudents((prev) => prev.filter((s) => s.id !== selectedStudent?.id));
                setMoveOpen(false);
              }}>Move</button>
              <button style={cancelBtn} onClick={() => setMoveOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ REMOVE CONFIRM ══ */}
      {removeOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1300,
          background: "rgba(0,0,0,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
          onClick={() => setRemoveOpen(false)}
        >
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 12, padding: 24, width: 340, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: "#c0392b" }}>Remove Student</span>
              <MdClose size={18} style={{ cursor: "pointer", color: "#888" }} onClick={() => setRemoveOpen(false)} />
            </div>
            <p style={{ fontSize: 13, color: "#555", margin: 0 }}>
              <b>{selectedStudent?.name}</b> ni guruhdan chiqarishni tasdiqlaysizmi?
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ ...submitBtn, background: "#c0392b" }} onClick={handleRemoveStudent}>Remove</button>
              <button style={cancelBtn} onClick={() => setRemoveOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </Box>
  );
};