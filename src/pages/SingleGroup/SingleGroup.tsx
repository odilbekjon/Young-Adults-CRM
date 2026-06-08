/* eslint-disable @typescript-eslint/no-explicit-any */
// src/pages/groups/SingleGroup.tsx

import {
  Box, Chip, Divider, IconButton, List, ListItem,
  ListItemText, MenuItem, Paper, Select,
  Stack, Tab, Tabs, Typography,
  Menu, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Checkbox, FormControlLabel, Switch,
  Radio, RadioGroup, FormControl,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import {
  MdEdit, MdDelete, MdEmail, MdClose, 
  MdAcUnit, MdPayment, MdFlag, MdGroup, MdRemoveCircleOutline, MdAlarm,
  MdCalendarToday, MdDownload, MdPlayCircleOutline,
} from "react-icons/md";
import * as XLSX from "xlsx";
import { GoPlus } from "react-icons/go";
import { BsThreeDotsVertical } from "react-icons/bs";
import {
  ALL_GROUPS,
  Student,
  findGroupById,
  findTeacherById,
  formatDate,
} from "../../constants/Teachers";

import { AddStudentDrawer } from "./AddStudentDrawer/AddStudentDrawer"

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

type GroupStudent = Student & {
  balance?: number;
  archived?: boolean;
  addedAt?: string;
  activatedAt?: string;
  frozenAt?: string;
};

type RemoveReason =
  | ""
  | "No attendance"
  | "Discipline problem"
  | "Moved to another center"
  | "Parent request"
  | "Other";

const mockBalance = (id: number) => {
  const n = id % 5;
  if (n === 0) return -23077;
  if (n === 1) return 150000;
  if (n === 2) return 0;
  return -45000;
};

const enrichStudents = (list: Student[]): GroupStudent[] =>
  list.map((s, i, arr) => ({
    ...s,
    balance: (s as GroupStudent).balance ?? mockBalance(s.id),
    archived: (s as GroupStudent).archived ?? (arr.length > 2 && i >= arr.length - 2),
    addedAt: (s as GroupStudent).addedAt,
    activatedAt: (s as GroupStudent).activatedAt,
  }));

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
   Action Icon Button with hover label
══════════════════════════════════════════ */
const ActionIconBtn = ({
  label,
  onClick,
  children,
  btnRef,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
  btnRef?: React.Ref<HTMLButtonElement>;
}) => {
  const [hovered, setHovered] = useState(false);
  return (
    <Box sx={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <IconButton
        ref={btnRef}
        size="small"
        sx={{ border: "1px solid #e0e0e0", borderRadius: 2 }}
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {children}
      </IconButton>
      {hovered && (
        <Box
          sx={{
            position: "absolute",
            left: "calc(100% + 8px)",
            top: "50%",
            transform: "translateY(-50%)",
            backgroundColor: "#1a1a1a",
            color: "#fff",
            fontSize: 11,
            fontWeight: 500,
            px: 1,
            py: 0.4,
            borderRadius: 1,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 9999,
            boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
            "&::before": {
              content: '""',
              position: "absolute",
              right: "100%",
              top: "50%",
              transform: "translateY(-50%)",
              border: "5px solid transparent",
              borderRightColor: "#1a1a1a",
            },
          }}
        >
          {label}
        </Box>
      )}
    </Box>
  );
};

/* ══════════════════════════════════════════
   Student Hover Card
══════════════════════════════════════════ */
interface StudentCardData {
  id: number;
  uid: string;
  name: string;
  phone: string;
  active: boolean;
  balance?: number;
  addedAt?: string;
  activatedAt?: string;
  frozenAt?: string;
}

const StudentHoverCard = ({
  student,
  anchorEl,
  onClose,
  onGoToProfile,
}: {
  student: StudentCardData | null;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onGoToProfile: () => void;
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!anchorEl || !student) return;
    const rect = anchorEl.getBoundingClientRect();
    const cardWidth = 300;
    let left = rect.right + 10;
    if (left + cardWidth > window.innerWidth - 12) left = rect.left - cardWidth - 10;
    setPos({ top: rect.top, left });
  }, [anchorEl, student]);

  useEffect(() => {
    if (!student) return;
    const handler = (e: MouseEvent) => {
      if (
        cardRef.current && !cardRef.current.contains(e.target as Node) &&
        anchorEl && !anchorEl.contains(e.target as Node)
      ) onClose();
    };
    document.addEventListener("mousemove", handler);
    return () => document.removeEventListener("mousemove", handler);
  }, [student, anchorEl, onClose]);

  if (!student || !anchorEl) return null;

  const isDebtor = student.balance !== undefined && student.balance < 0;
  const isFrozen = !student.active;
  const today = new Date();
  const dateStr = `${today.getDate().toString().padStart(2, "0")}.${(today.getMonth() + 1).toString().padStart(2, "0")}.${today.getFullYear()}`;
  const mockPayments = isFrozen
    ? [
        { date: "15.05.2026", amount: 500000, label: "Cash" },
        { date: "01.04.2026", amount: 500000, label: "Payme" },
      ]
    : [];

  return (
    <div
      ref={cardRef}
      style={{
        position: "fixed",
        top: pos.top, left: pos.left,
        zIndex: 9999,
        width: 300,
        background: "#fff",
        border: "1px solid #e8e8e8",
        borderRadius: 12,
        boxShadow: "0 8px 32px rgba(0,0,0,0.13)",
        padding: "16px 20px 12px",
        animation: "fadeInCard 0.15s ease",
        pointerEvents: "auto",
      }}
    >
      <style>{`
        @keyframes fadeInCard {
          from { opacity: 0; transform: translateX(6px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a" }}>{student.name}</span>
          <span style={{ fontSize: 12, color: "#aaa" }}>(id:{student.id})</span>
        </div>
        <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
          {student.active ? "Active (Learns)" : "Frozen (paused)"}
        </div>
        {isDebtor && (
          <span style={{
            display: "inline-block", marginTop: 6,
            background: "#e53935", color: "#fff",
            fontSize: 11, fontWeight: 600, borderRadius: 20, padding: "3px 10px",
          }}>
            Debtor
          </span>
        )}
      </div>

      {isFrozen && (
        <>
          <div style={{
            background: isDebtor ? "#fff5f5" : "#f1faf4",
            border: `1px solid ${isDebtor ? "#ffcdd2" : "#c8e6c9"}`,
            borderRadius: 10,
            padding: "12px 14px",
            marginBottom: 12,
          }}>
            <div style={{ fontSize: 11, color: "#888", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>
              {isDebtor ? "Qarzdorlik" : "Balans"}
            </div>
            <div style={{
              fontSize: 18, fontWeight: 700,
              color: isDebtor ? "#c62828" : "#2e7d32",
            }}>
              {student.balance !== undefined
                ? `${student.balance > 0 ? "+" : ""}${student.balance.toLocaleString()} UZS`
                : "—"}
            </div>
            {student.frozenAt && (
              <div style={{ fontSize: 11, color: "#888", marginTop: 6 }}>
                Muzlatilgan: {student.frozenAt}
              </div>
            )}
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "#aaa", marginBottom: 8, fontWeight: 600 }}>So'nggi to'lovlar</div>
            {mockPayments.length > 0 ? (
              mockPayments.map((p, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    fontSize: 12, padding: "6px 0",
                    borderBottom: idx < mockPayments.length - 1 ? "1px solid #f0f0f0" : "none",
                  }}
                >
                  <span style={{ color: "#555" }}>{p.date} · {p.label}</span>
                  <span style={{ fontWeight: 600, color: "#2e7d32" }}>+{p.amount.toLocaleString()} UZS</span>
                </div>
              ))
            ) : (
              <span style={{ fontSize: 12, color: "#bbb" }}>To'lovlar yo'q</span>
            )}
          </div>
        </>
      )}

      <hr style={{ border: "none", borderTop: "1px solid #f0f0f0", margin: "0 0 10px" }} />

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: "#aaa", marginBottom: 2 }}>Phone</div>
        <div style={{ fontSize: 13, color: "#1a1a1a", fontWeight: 500 }}>{student.phone}</div>
      </div>

      <hr style={{ border: "none", borderTop: "1px solid #f0f0f0", margin: "0 0 10px" }} />

      {!isFrozen && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: "#aaa", marginBottom: 4 }}>Balance</div>
          {student.balance !== undefined && student.balance !== 0 ? (
            <span style={{
              display: "inline-block",
              background: isDebtor ? "#e53935" : "#43a047",
              color: "#fff", fontSize: 12, fontWeight: 600,
              borderRadius: 20, padding: "3px 10px",
            }}>
              {student.balance > 0 ? "+" : ""}
              {student.balance.toLocaleString()} UZS
            </span>
          ) : (
            <span style={{ fontSize: 12, color: "#bbb" }}>—</span>
          )}
        </div>
      )}

      <hr style={{ border: "none", borderTop: "1px solid #f0f0f0", margin: "0 0 10px" }} />

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: "#aaa", marginBottom: 2 }}>Added at</div>
        <div style={{ fontSize: 13, color: "#1a1a1a" }}>{student.addedAt || dateStr}</div>
      </div>

      <hr style={{ border: "none", borderTop: "1px solid #f0f0f0", margin: "0 0 10px" }} />

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: "#aaa", marginBottom: 2 }}>Activated at</div>
        <div style={{ fontSize: 13, color: "#1a1a1a" }}>{student.activatedAt || dateStr}</div>
      </div>

      {/* ✅ Go to profile — StudentProfile ga o'tadi */}
      <div style={{ textAlign: "right" }}>
        <span
          style={{ fontSize: 13, color: "#185FA5", cursor: "pointer", fontWeight: 600 }}
          onClick={onGoToProfile}
          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
        >
          Go to profile →
        </span>
      </div>
    </div>
  );
};


/* ══════════════════════════════════════════
   Top Modal (slides from top)
══════════════════════════════════════════ */
const TopModal = ({
  open, onClose, title, maxWidth = 520, children,
}: {
  open: boolean; onClose: () => void; title: string; maxWidth?: number; children: React.ReactNode;
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
        position: "fixed",
        top: 0,
        left: "50%",
        width: "100%",
        maxWidth,
        maxHeight: "85vh",
        background: "#fff",
        zIndex: 1300,
        borderRadius: "0 0 12px 12px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.14)",
        transform: open ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(-110%)",
        transition: "transform 0.28s cubic-bezier(.4,0,.2,1)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "18px 24px 14px", borderBottom: "1px solid #f0f0f0", flexShrink: 0,
      }}>
        <span style={{ fontSize: 17, fontWeight: 600, color: "#1a1a1a" }}>{title}</span>
        <div onClick={onClose} style={{ cursor: "pointer", color: "#888", fontSize: 20, display: "flex" }}>
          <MdClose />
        </div>
      </div>
      <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>{children}</div>
    </div>
  </>
);

/* ══════════════════════════════════════════
   Top Dropdown (reusable)
══════════════════════════════════════════ */
const TopDropdown = ({
  open, onClose, anchorRef, children, width = 320,
}: {
  open: boolean; onClose: () => void;
  anchorRef: React.RefObject<HTMLElement>;
  children: React.ReactNode; width?: number;
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
   Make Frozen Modal
══════════════════════════════════════════ */
const FreezeModal = ({
  open, onClose, student, onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  student: Student | null;
  onConfirm: (data: { comment: string; fromDate: string; recalculate: boolean }) => void;
}) => {
  const [comment, setComment] = useState("");
  const [fromDate, setFromDate] = useState(new Date().toISOString().slice(0, 10));
  const [recalculate, setRecalculate] = useState(false);

  const handleSubmit = () => {
    onConfirm({ comment, fromDate, recalculate });
    setComment("");
    setFromDate(new Date().toISOString().slice(0, 10));
    setRecalculate(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { borderRadius: 3, width: 420, p: 1 } }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <MdAcUnit size={20} color="#1976d2" />
          <Typography fontWeight={600} fontSize={16}>
            Make Frozen — {student?.name}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: "#9ca3af" }}>
          <MdClose size={18} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 1.5 }}>
        {/* Comment */}
        <Box>
          <Typography fontSize={13} fontWeight={500} color="#374151" mb={0.8}>
            Comment
          </Typography>
          <TextField
            fullWidth
            size="small"
            multiline
            rows={3}
            placeholder="Freeze sababini kiriting..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", fontSize: 13 } }}
          />
        </Box>

        {/* From date */}
        <Box>
          <Typography fontSize={13} fontWeight={500} color="#374151" mb={0.8}>
            Qachondan muzlatish
          </Typography>
          <TextField
            fullWidth
            size="small"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", fontSize: 13 } }}
          />
        </Box>

        {/* Recalculate checkbox */}
        <FormControlLabel
          control={
            <Checkbox
              checked={recalculate}
              onChange={(e) => setRecalculate(e.target.checked)}
              size="small"
              sx={{ color: "#d0d5dd", "&.Mui-checked": { color: "#1976d2" } }}
            />
          }
          label={
            <Typography fontSize={13} color="#374151">
              Recalculate the balance
            </Typography>
          }
          sx={{ m: 0 }}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button
          variant="outlined"
          onClick={onClose}
          sx={{
            borderRadius: "8px", textTransform: "none",
            borderColor: "#e0e0e0", color: "#666", fontSize: 13,
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          sx={{
            borderRadius: "8px", textTransform: "none",
            bgcolor: "#1976d2", fontSize: 13, fontWeight: 600,
            "&:hover": { bgcolor: "#1565c0" },
          }}
        >
          Muzlatish
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/* ══════════════════════════════════════════
   Activate Modal
══════════════════════════════════════════ */
const ActivateModal = ({
  open, onClose, onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (activateDate: string) => void;
}) => {
  const [activateDate, setActivateDate] = useState("");

  const handleSubmit = () => {
    if (!activateDate) return;
    onConfirm(activateDate);
    setActivateDate("");
    onClose();
  };

  const handleClose = () => {
    setActivateDate("");
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      PaperProps={{ sx: { borderRadius: 3, width: 400, maxWidth: "95vw" } }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1, pt: 2.5, px: 2.5 }}>
        <Typography fontWeight={600} fontSize={16} color="#1a1a1a">
          Select activate date
        </Typography>
        <IconButton size="small" onClick={handleClose} sx={{ color: "#9ca3af" }}>
          <MdClose size={18} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 2.5, pt: 1, pb: 2 }}>
        <Box sx={{ position: "relative" }}>
          <MdCalendarToday
            size={18}
            color="#9e9e9e"
            style={{
              position: "absolute",
              left: 14,
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
              zIndex: 1,
            }}
          />
          <TextField
            fullWidth
            type="date"
            value={activateDate}
            onChange={(e) => setActivateDate(e.target.value)}
            placeholder="No date selected"
            InputLabelProps={{ shrink: true }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "10px",
                pl: 4.5,
                fontSize: 14,
                "& fieldset": { borderColor: "#e0e0e0" },
              },
              "& .MuiOutlinedInput-input": {
                color: activateDate ? "#1a1a1a" : "#bbb",
              },
            }}
            inputProps={{
              style: { paddingLeft: 36 },
            }}
          />
          {!activateDate && (
            <Typography
              sx={{
                position: "absolute",
                left: 44,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 14,
                color: "#bbb",
                pointerEvents: "none",
              }}
            >
              No date selected
            </Typography>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ justifyContent: "center", pb: 3, px: 2.5 }}>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!activateDate}
          sx={{
            borderRadius: 999,
            textTransform: "none",
            bgcolor: activateDate ? "#7a8fa6" : "#c5cdd8",
            fontSize: 14,
            fontWeight: 600,
            px: 5,
            py: 1.2,
            minWidth: 140,
            boxShadow: "none",
            "&:hover": { bgcolor: activateDate ? "#6b7f96" : "#c5cdd8", boxShadow: "none" },
          }}
        >
          Submit
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/* ══════════════════════════════════════════
   Edit Group Drawer
══════════════════════════════════════════ */
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
      <b>{groupName}</b> guruhini o'chirishni tasdiqlaysizmi?
    </p>
    <div style={{ display: "flex", gap: 8 }}>
      <button style={cancelBtn} onClick={onClose}>Cancel</button>
      <button style={{ ...submitBtn, background: "#c0392b" }} onClick={onConfirm}>Delete</button>
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
            style={{ ...inputStyle, minHeight: 140, resize: "vertical" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 12, color: "#888" }}>
            <span>{message.length} symbols ( ~ {smsCount} SMS )</span>
            <span>{studentCount} selected stud.</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={submitBtn} onClick={() => { setMessage(""); onClose(); }}>Send SMS</button>
          <button style={cancelBtn} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </RightDrawer>
  );
};

/* ══════════════════════════════════════════
   Add Note Modal (from top)
══════════════════════════════════════════ */
const AddNoteModal = ({
  open, onClose, student,
}: {
  open: boolean; onClose: () => void; student: Student | null;
}) => {
  const [note, setNote] = useState("");

  const handleClose = () => {
    setNote("");
    onClose();
  };

  return (
    <TopModal open={open} onClose={handleClose} title="Add new note">
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {student && (
          <div>
            <label style={labelStyle}>Student</label>
            <input style={{ ...inputStyle, background: "#f5f5f5", color: "#666" }} value={student.name} readOnly />
          </div>
        )}
        <div>
          <label style={labelStyle}>Note</label>
          <textarea
            style={{ ...inputStyle, minHeight: 120, resize: "vertical" }}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Enter note..."
          />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={paymentSubmitBtn} onClick={handleClose}>Save</button>
          <button style={cancelBtn} onClick={handleClose}>Cancel</button>
        </div>
      </div>
    </TopModal>
  );
};

const PAYMENT_METHODS_LEFT = ["Cash", "Card", "Bank account", "Payme"] as const;
const PAYMENT_METHODS_RIGHT = ["Click", "Uzum", "Humo"] as const;

const paymentSubmitBtn: React.CSSProperties = {
  background: "#72c3d1",
  color: "#fff",
  border: "none",
  borderRadius: 999,
  padding: "12px 32px",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

const RightDrawer = ({
  open, onClose, title, width = 480, children,
}: {
  open: boolean; onClose: () => void; title: string; width?: number; children: React.ReactNode;
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
    <div style={{
      position: "fixed", top: 0, right: 0,
      width, height: "100vh",
      background: "#fff",
      zIndex: 1300,
      boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
      transform: open ? "translateX(0)" : "translateX(100%)",
      transition: "transform 0.28s cubic-bezier(.4,0,.2,1)",
      display: "flex", flexDirection: "column",
      overflowY: "auto",
    }}>
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
   Add Payment Drawer (from right)
══════════════════════════════════════════ */
const AddPaymentDrawer = ({
  open, onClose, student,
}: {
  open: boolean; onClose: () => void; student: Student | null;
}) => {
  const [method, setMethod] = useState("Cash");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [comment, setComment] = useState("");

  const balance = (student as Student & { balance?: number })?.balance ?? -23077;

  const handleClose = () => {
    setMethod("Cash");
    setAmount("");
    setDate(new Date().toISOString().slice(0, 10));
    setComment("");
    onClose();
  };

  const formatBalance = (n: number) =>
    `${n < 0 ? "-" : ""}${Math.abs(n).toLocaleString("ru-RU")} UZS`;

  return (
    <RightDrawer open={open} onClose={handleClose} title="Add payment" width={420}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <label style={labelStyle}>Student</label>
          <input
            style={{ ...inputStyle, background: "#f5f5f5", color: "#555", cursor: "default" }}
            value={student?.name ?? ""}
            readOnly
          />
        </div>

        <div>
          <label style={labelStyle}>Balance</label>
          <span
            style={{
              display: "inline-block",
              background: "#1a3a5c",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              padding: "6px 14px",
              borderRadius: 999,
            }}
          >
            {formatBalance(balance)}
          </span>
        </div>

        <div>
          <label style={labelStyle}>Method pay</label>
          <div style={{ display: "flex", gap: 24, marginTop: 4 }}>
            <FormControl component="fieldset" sx={{ flex: 1 }}>
              <RadioGroup value={method} onChange={(e) => setMethod(e.target.value)}>
                {PAYMENT_METHODS_LEFT.map((m) => (
                  <FormControlLabel
                    key={m}
                    value={m}
                    control={<Radio size="small" sx={{ color: "#bdbdbd", "&.Mui-checked": { color: "#1a3a5c" } }} />}
                    label={<span style={{ fontSize: 13, color: "#374151" }}>{m}</span>}
                    sx={{ m: 0, mb: 0.5 }}
                  />
                ))}
              </RadioGroup>
            </FormControl>
            <FormControl component="fieldset" sx={{ flex: 1 }}>
              <RadioGroup value={method} onChange={(e) => setMethod(e.target.value)}>
                {PAYMENT_METHODS_RIGHT.map((m) => (
                  <FormControlLabel
                    key={m}
                    value={m}
                    control={<Radio size="small" sx={{ color: "#bdbdbd", "&.Mui-checked": { color: "#1a3a5c" } }} />}
                    label={<span style={{ fontSize: 13, color: "#374151" }}>{m}</span>}
                    sx={{ m: 0, mb: 0.5 }}
                  />
                ))}
              </RadioGroup>
            </FormControl>
          </div>
        </div>

        <div>
          <label style={labelStyle}>Amount</label>
          <input
            style={inputStyle}
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder=""
          />
        </div>

        <div>
          <label style={labelStyle}>Date</label>
          <div style={{ position: "relative" }}>
            <MdCalendarToday
              size={16}
              color="#9e9e9e"
              style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
            />
            <input
              type="date"
              style={{ ...inputStyle, paddingLeft: 36 }}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Comment</label>
          <textarea
            style={{ ...inputStyle, minHeight: 100, resize: "vertical" }}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        <button type="button" style={paymentSubmitBtn} onClick={handleClose}>
          Submit
        </button>
      </div>
    </RightDrawer>
  );
};

/* ══════════════════════════════════════════
   Reminder Drawer
══════════════════════════════════════════ */
const ReminderDrawer = ({
  open, onClose, student,
}: {
  open: boolean; onClose: () => void; student: Student | null;
}) => {
  const [name, setName] = useState(student?.name ?? "");
  const [comment, setComment] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [employee, setEmployee] = useState("");

  useEffect(() => {
    if (open) setName(student?.name ?? "");
  }, [open, student]);

  const handleClose = () => {
    setName(student?.name ?? "");
    setComment("");
    setReminderDate("");
    setEmployee("");
    onClose();
  };

  return (
    <TopModal open={open} onClose={handleClose} title="Add new note" maxWidth={640}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={labelStyle}>Name</label>
          <input
            style={inputStyle}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder=""
          />
        </div>
        <div>
          <label style={labelStyle}>Comment</label>
          <textarea
            style={{ ...inputStyle, minHeight: 110, resize: "vertical" }}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder=""
          />
        </div>
        <div style={{ position: "relative" }}>
          <MdCalendarToday
            size={16}
            color="#b0b8c1"
            style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
          />
          <input
            type="date"
            style={{ ...inputStyle, paddingLeft: 36, color: reminderDate ? "#1a1a1a" : "#b0b8c1" }}
            value={reminderDate}
            onChange={(e) => setReminderDate(e.target.value)}
          />
        </div>
        <div>
          <select
            style={{ ...inputStyle, color: employee ? "#1a1a1a" : "#b0b8c1" }}
            value={employee}
            onChange={(e) => setEmployee(e.target.value)}
          >
            <option value="">Select employee</option>
            <option value="Ugilbeka Abdullaeva">Ugilbeka Abdullaeva</option>
            <option value="Maksuda Abraykulova">Maksuda Abraykulova</option>
            <option value="Iskandar Tojiyev">Iskandar Tojiyev</option>
          </select>
        </div>
        <div style={{ marginTop: 8 }}>
          <button style={{ ...submitBtn, borderRadius: 999, padding: "12px 30px", background: "#0f5c9a" }} onClick={handleClose}>
            Save
          </button>
        </div>
      </div>
    </TopModal>
  );
};

/* ══════════════════════════════════════════
   Add Student Drawer
══════════════════════════════════════════ */





export const SingleGroup = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tabIndex, setTabIndex] = useState(0);
  const [sortBy, setSortBy] = useState("By A-Z");
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
  const [hoverStudent, setHoverStudent] = useState<StudentCardData | null>(null);
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

  // ✅ Yangi action state lar
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
  const [removeScope, setRemoveScope] = useState<"current" | "all">("current");

  if (!group) {
    return (
      <Box p={4}><Typography>Group not found.</Typography></Box>
    );
  }

  const visibleStudents = students.filter((s) => showArchived || !s.archived);

  const sortedStudents = [...visibleStudents].sort((a, b) =>
    sortBy === "By A-Z" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
  );

  const archivedCount = students.filter((s) => s.archived).length;

  const handleOpenMenu = (e: React.MouseEvent<HTMLElement>, student: GroupStudent) => {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
    setSelectedStudent(student);
  };
  const handleCloseMenu = () => setMenuAnchor(null);

  // ✅ Go to profile — uid format: groupId-studentId
  const handleGoToProfile = (studentId: number) => {
    setHoverStudent(null);
    setHoverAnchorEl(null);
    // Students page da uid = `${group.id}-${student.id}` formatida
    navigate(`/students/${group.id}-${studentId}`);
  };

  // Hover handlers
  const handleStudentMouseEnter = (e: React.MouseEvent<HTMLElement>, student: GroupStudent) => {
    if (leaveTimeout.current) clearTimeout(leaveTimeout.current);
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    const target = e.currentTarget;
    hoverTimeout.current = setTimeout(() => {
      setHoverStudent({
        id: student.id,
        uid: `${group.id}-${student.id}`,
        name: student.name,
        phone: student.phone,
        active: student.active,
        balance: student.balance,
        addedAt: student.addedAt,
        activatedAt: student.activatedAt,
        frozenAt: student.frozenAt,
      });
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
          ? { ...s, active: false, frozenAt: formatDisplayDate(data.fromDate) }
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
      Name: s.name,
      Phone: s.phone,
      Status: s.archived ? "Archived" : s.active ? "Active" : "Frozen",
      Balance: s.balance ?? 0,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
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
      // Full delete
      setStudents((prev) => prev.filter((s) => s.id !== selectedStudent?.id));
    } else {
      // Remove from current group -> archived list
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
              <Typography fontSize={14}><b>Course:</b> {group.course}</Typography>
              <Typography fontSize={14}><b>Teacher:</b> {group.teacher}</Typography>
              <Typography fontSize={14}>
                <b>Price:</b> {group.price ? `${group.price.toLocaleString()} UZS` : "—"}
              </Typography>
              <Typography fontSize={14}><b>Time:</b> {group.days} · {group.lessonStartTime}</Typography>
            </Box>

            <Stack spacing={1}>
              <ActionIconBtn label="Edit group" onClick={() => setEditOpen(true)}>
                <MdEdit size={16} color="#1976d2" />
              </ActionIconBtn>
              <ActionIconBtn label="Delete group" btnRef={deleteAnchorRef as any} onClick={() => setDeleteOpen((p) => !p)}>
                <MdDelete size={16} color="#e53935" />
              </ActionIconBtn>
              <ActionIconBtn label="Send SMS" onClick={() => setSmsOpen(true)}>
                <MdEmail size={16} color="#f57c00" />
              </ActionIconBtn>
              <ActionIconBtn label="Add student" onClick={() => setAddStudentOpen(true)}>
                <GoPlus size={16} />
              </ActionIconBtn>
            </Stack>
          </Stack>

          <Divider sx={{ my: 1.5 }} />

          <Typography fontSize={14}><b>Rooms:</b> {group.room}</Typography>
          <Typography fontSize={14}><b>Room capacity:</b> {group.roomCapacity ?? 30}</Typography>
          <Typography fontSize={14} mt={0.5}><b>Training dates:</b></Typography>
          <Typography fontSize={14}>{formatDate(group.startDate)} — {formatDate(group.endDate)}</Typography>
          <Typography fontSize={12} color="text.secondary">(id: {group.id})</Typography>

          {group.branch && (
            <Box mt={1}>
              <Typography fontSize={13} color="text.secondary">Branches:</Typography>
              <Chip label={group.branch} size="small" sx={{ mt: 0.5 }} />
            </Box>
          )}

          <Divider sx={{ my: 1.5 }} />

          <Select
            size="small" fullWidth value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            sx={{ mb: 1.5, fontSize: 14 }}
          >
            <MenuItem value="By A-Z">By A-Z</MenuItem>
            <MenuItem value="By Z-A">By Z-A</MenuItem>
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
                      bgcolor: "#e53935",
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
                          <Chip label="Archived" size="small" sx={{ height: 20, fontSize: 10 }} />
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
                {showArchived ? "Hide archived students" : "Show archived students"}
              </Button>
            )}
            <IconButton
              onClick={handleExportExcel}
              title="Export to excel"
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
            <Typography fontSize={13} color={showCoins ? "primary" : "text.secondary"}>Show coins</Typography>
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
            <Typography fontSize={13} color={!showCoins ? "primary" : "text.secondary"}>Hide coins</Typography>
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
              {TABS.map((tab) => <Tab key={tab} label={tab} />)}
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

      {/* ══ STUDENT DOT MENU ══ (rasmdagicha) */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleCloseMenu}
        PaperProps={{
          sx: {
            borderRadius: 2,
            minWidth: 220,
            boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
            border: "1px solid #f0f0f0",
          },
        }}
      >
        {isSelectedArchived ? (
          <>
            <MenuItem
              onClick={handleActivateArchived}
              sx={{ fontSize: 13, gap: 1.5, py: 1.2, color: "#1f2937" }}
            >
              <MdPlayCircleOutline size={17} color="#1f2937" />
              Activate
            </MenuItem>
            <MenuItem
              onClick={handleBackToTrialLesson}
              sx={{ fontSize: 13, gap: 1.5, py: 1.2, color: "#1f2937" }}
            >
              <MdAlarm size={16} color="#4b5563" />
              Back to trial lesson
            </MenuItem>
          </>
        ) : isSelectedFrozen ? (
          <MenuItem
            onClick={() => { handleCloseMenu(); setActivateOpen(true); }}
            sx={{ fontSize: 13, gap: 1.5, py: 1.2, color: "#1976d2" }}
          >
            <MdPlayCircleOutline size={17} color="#1976d2" />
            Activate
          </MenuItem>
        ) : (
          <MenuItem
            onClick={() => { handleCloseMenu(); setFreezeOpen(true); }}
            sx={{ fontSize: 13, gap: 1.5, py: 1.2, color: "#1976d2" }}
          >
            <MdAcUnit size={17} color="#1976d2" />
            Make Frozen
          </MenuItem>
        )}

        {!isSelectedArchived && <Divider sx={{ my: 0.5 }} />}

        {!isSelectedArchived && (
          <MenuItem
            onClick={() => { handleCloseMenu(); setPaymentOpen(true); }}
            sx={{ fontSize: 13, gap: 1.5, py: 1.2, color: "#374151" }}
          >
            <MdPayment size={17} color="#6b7280" />
            Add payment
          </MenuItem>
        )}

        {!isSelectedArchived && <Divider sx={{ my: 0.5 }} />}

        {!isSelectedArchived && (
          <MenuItem
            onClick={() => { handleCloseMenu(); setNoteOpen(true); }}
            sx={{ fontSize: 13, gap: 1.5, py: 1.2, color: "#374151" }}
          >
            <MdFlag size={17} color="#6b7280" />
            Add new note
          </MenuItem>
        )}

        {!isSelectedArchived && <Divider sx={{ my: 0.5 }} />}

        {!isSelectedArchived && (
          <MenuItem
            onClick={() => { handleCloseMenu(); setMoveOpen(true); }}
            sx={{ fontSize: 13, gap: 1.5, py: 1.2, color: "#374151" }}
          >
            <MdGroup size={17} color="#6b7280" />
            Move student to group
          </MenuItem>
        )}

        {!isSelectedArchived && <Divider sx={{ my: 0.5 }} />}

        {!isSelectedArchived && (
          <MenuItem
            onClick={() => { handleCloseMenu(); setRemoveOpen(true); }}
            sx={{ fontSize: 13, gap: 1.5, py: 1.2, color: "#ef4444" }}
          >
            <MdRemoveCircleOutline size={17} color="#ef4444" />
            Remove from group
          </MenuItem>
        )}

        {!isSelectedArchived && <Divider sx={{ my: 0.5 }} />}

        {!isSelectedArchived && (
          <MenuItem
            onClick={() => { handleCloseMenu(); setReminderOpen(true); }}
            sx={{ fontSize: 13, gap: 1.5, py: 1.2, color: "#374151" }}
          >
            <MdAlarm size={17} color="#6b7280" />
            Reminders
          </MenuItem>
        )}
      </Menu>

      {/* ══ FREEZE MODAL ══ */}
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
      {moveOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 1300, background: "rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setMoveOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 12, padding: 24, width: 360, display: "flex", flexDirection: "column", gap: 14 }}
          >
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
              <button
                style={submitBtn}
                onClick={() => {
                  setStudents((prev) => prev.filter((s) => s.id !== selectedStudent?.id));
                  setMoveOpen(false);
                }}
              >
                Move
              </button>
              <button style={cancelBtn} onClick={() => setMoveOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ REMOVE CONFIRM ══ */}
      {removeOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 1300, background: "rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={handleCloseRemove}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 12, width: 600, maxWidth: "95vw", overflow: "hidden" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #ececec" }}>
              <span style={{ fontSize: 16, fontWeight: 500, color: "#2e2e2e" }}>Do you realy want to delete it?</span>
              <MdClose size={22} style={{ cursor: "pointer", color: "#888" }} onClick={handleCloseRemove} />
            </div>
            <div style={{ padding: "22px 34px 30px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 22 }}>
                <span style={{ fontSize: 14, color: removeDeleteMode ? "#7d7d7d" : "#5f9bb8" }}>Remove from group</span>
                <Switch
                  checked={removeDeleteMode}
                  onChange={(e) => setRemoveDeleteMode(e.target.checked)}
                  sx={{
                    "& .MuiSwitch-switchBase.Mui-checked": { color: "#3d87ad" },
                    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#3d87ad" },
                  }}
                />
                <span style={{ fontSize: 14, color: removeDeleteMode ? "#2f2f2f" : "#7d7d7d" }}>Delete student</span>
              </div>

              <div style={{ marginBottom: 14 }}>
                <select
                  style={{ ...inputStyle, height: 48, color: removeReason ? "#1a1a1a" : "#b0b0b0", fontSize: 14 }}
                  value={removeReason}
                  onChange={(e) => setRemoveReason(e.target.value as RemoveReason)}
                >
                  <option value="">Reasons for removal</option>
                  <option value="No attendance">No attendance</option>
                  <option value="Discipline problem">Discipline problem</option>
                  <option value="Moved to another center">Moved to another center</option>
                  <option value="Parent request">Parent request</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <textarea
                  style={{ ...inputStyle, minHeight: 70, resize: "vertical", fontSize: 14, color: "#555" }}
                  value={removeComment}
                  onChange={(e) => setRemoveComment(e.target.value)}
                  placeholder="Comment"
                />
              </div>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={removeRecalculate}
                    onChange={(e) => setRemoveRecalculate(e.target.checked)}
                    size="small"
                  />
                }
                label={<span style={{ fontSize: 14, color: "#3f3f3f" }}>Recalculate the balance</span>}
                sx={{ m: 0, mb: 1.2 }}
              />

              <FormControl component="fieldset" sx={{ mb: 3 }}>
                <RadioGroup
                  row
                  value={removeScope}
                  onChange={(e) => setRemoveScope(e.target.value as "current" | "all")}
                  sx={{ gap: 2 }}
                >
                  <FormControlLabel value="current" control={<Radio size="small" />} label={<span style={{ fontSize: 14 }}>Current group</span>} />
                  <FormControlLabel value="all" control={<Radio size="small" />} label={<span style={{ fontSize: 14 }}>All groups</span>} />
                </RadioGroup>
              </FormControl>

              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 26 }}>
                <button
                  style={{
                    ...submitBtn,
                    background: "#d93f4f",
                    borderRadius: 999,
                    padding: "12px 34px",
                    fontSize: 15,
                    boxShadow: "0 3px 8px rgba(217,63,79,0.35)",
                  }}
                  onClick={handleRemoveStudent}
                >
                  Yes
                </button>
                <button
                  style={{ ...cancelBtn, border: "none", color: "#8a8a8a", fontSize: 15, padding: "0 8px" }}
                  onClick={handleCloseRemove}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Box>
  );
};