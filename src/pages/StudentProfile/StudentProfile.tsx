// src/pages/StudentProfile.tsx
import { useState } from "react";
import {
  FiEdit2, FiMail, FiTrash2, FiFlag, FiPrinter,
  FiChevronDown, FiUsers, FiDollarSign, FiPhone,
  FiCalendar, FiGitBranch, FiPause, FiUser, FiX,
  FiMessageSquare,
} from "react-icons/fi";
import { IoArrowBack } from "react-icons/io5";
import {
  Avatar, Chip, Tab, Tabs, Button, IconButton, Tooltip, Box,
  Drawer, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Radio, RadioGroup, FormControlLabel, 
  InputAdornment, 
} from "@mui/material";

import { FlatStudent, formatDate, buildFlatStudents } from "../../constants/FlatStudents";
import { TEACHERS_DATA } from "../../constants/Teachers";
import { useNavigate, useParams } from "react-router-dom";

/* ─── TYPES ─────────────────────────────────────────── */
interface Payment {
  date: string;
  type: "system" | "manual";
  amount: string;
  comment: string;
  period: string;
  creator: string;
  creatorDate: string;
}

const TABS = ["Groups", "Comments", "Call history", "SMS", "History", "Lead history"];

const makeMockPayments = (student: FlatStudent): Payment[] => [
  {
    date: "01.05.2026",
    type: "system",
    amount: `${(student.balance ?? 0).toLocaleString("ru-RU")} UZS`,
    comment: `${student.course} — 8 les.`,
    period: `${formatDate(student.startDate)} — ${formatDate(student.endDate)}`,
    creator: student.teacher,
    creatorDate: "14.05.2026 16:40:43",
  },
];

/* ─── BALANCE BADGE ──────────────────────────────────── */
const BalanceBadge = ({ amount }: { amount: number }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "4px 14px",
      borderRadius: 8,
      fontSize: 13,
      fontWeight: 600,
      color: "white",
      background: amount < 0 ? "#ef4444" : amount === 0 ? "#6b7280" : "#16a34a",
    }}
  >
    {amount.toLocaleString("ru-RU")} UZS
  </span>
);

/* ─── EDIT STUDENT DRAWER ────────────────────────────── */
const EditStudentDrawer = ({
  open,
  onClose,
  student,
}: {
  open: boolean;
  onClose: () => void;
  student: FlatStudent;
}) => {
  const [name, setName] = useState(student.name);
  const [phone, setPhone] = useState(student.phone);
  const [gender, setGender] = useState("male");
  const [tags, setTags] = useState("");

  const additionalContactIcons = [
    { icon: <FiPhone size={16} />, label: "Phone" },
    { icon: <FiUser size={16} />, label: "Parent" },
    { icon: <FiUser size={16} />, label: "Profile" },
    { icon: <FiMail size={16} />, label: "Email" },
    { icon: <FiMessageSquare size={16} />, label: "Telegram" },
    { icon: <FiUser size={16} />, label: "Education" },
    { icon: <FiGitBranch size={16} />, label: "Location" },
    { icon: <FiFlag size={16} />, label: "Document" },
  ];

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: 420,
          borderRadius: "12px 0 0 12px",
          padding: 0,
          boxShadow: "-8px 0 32px rgba(0,0,0,0.12)",
        },
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 24px",
          borderBottom: "1px solid #f3f4f6",
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 600, color: "#111827" }}>
          Edit Student
        </span>
        <IconButton size="small" onClick={onClose} sx={{ color: "#9ca3af" }}>
          <FiX size={20} />
        </IconButton>
      </div>

      {/* Body */}
      <div style={{ padding: "24px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Phone */}
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, color: "#374151", display: "block", marginBottom: 6 }}>
            Phone
          </label>
          <TextField
            fullWidth
            size="small"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <span
                    style={{
                      fontSize: 13,
                      color: "#374151",
                      fontWeight: 500,
                      borderRight: "1px solid #e5e7eb",
                      paddingRight: 10,
                      marginRight: 4,
                    }}
                  >
                    +998
                  </span>
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "8px",
                fontSize: 14,
              },
            }}
          />
        </div>

        {/* Name */}
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, color: "#374151", display: "block", marginBottom: 6 }}>
            Name
          </label>
          <TextField
            fullWidth
            size="small"
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{
              "& .MuiOutlinedInput-root": { borderRadius: "8px", fontSize: 14 },
            }}
          />
        </div>

        {/* Date of birth */}
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, color: "#374151", display: "block", marginBottom: 6 }}>
            Date of birth
          </label>
          <TextField
            fullWidth
            size="small"
            type="date"
            placeholder="No date selected"
            InputLabelProps={{ shrink: true }}
            sx={{
              "& .MuiOutlinedInput-root": { borderRadius: "8px", fontSize: 14 },
              "& input": { color: "#9ca3af" },
            }}
          />
        </div>

        {/* Gender */}
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, color: "#374151", display: "block", marginBottom: 6 }}>
            Gender
          </label>
          <RadioGroup
            row
            value={gender}
            onChange={(e) => setGender(e.target.value)}
          >
            <FormControlLabel
              value="male"
              control={
                <Radio
                  size="small"
                  sx={{
                    color: "#d1d5db",
                    "&.Mui-checked": { color: "#1e40af" },
                  }}
                />
              }
              label={<span style={{ fontSize: 14, color: "#374151" }}>Male</span>}
            />
            <FormControlLabel
              value="female"
              control={
                <Radio
                  size="small"
                  sx={{
                    color: "#d1d5db",
                    "&.Mui-checked": { color: "#1e40af" },
                  }}
                />
              }
              label={<span style={{ fontSize: 14, color: "#374151" }}>Female</span>}
            />
          </RadioGroup>
        </div>

        {/* Photo */}
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, color: "#374151", display: "block", marginBottom: 6 }}>
            Photo
          </label>
          <div
            style={{
              display: "flex",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                flex: 1,
                padding: "8px 12px",
                fontSize: 13,
                color: "#9ca3af",
                display: "flex",
                alignItems: "center",
              }}
            >
              No file chosen
            </div>
            <button
              style={{
                padding: "8px 16px",
                background: "#f9fafb",
                border: "none",
                borderLeft: "1px solid #e5e7eb",
                fontSize: 13,
                color: "#374151",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              Browse
            </button>
          </div>
        </div>

        {/* Additional contacts */}
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, color: "#374151", display: "block", marginBottom: 8 }}>
            additional contacts
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {additionalContactIcons.map((item, i) => (
              <Tooltip key={i} title={item.label}>
                <IconButton
                  size="small"
                  sx={{
                    width: 36,
                    height: 36,
                    border: "1.5px solid #d1d5db",
                    color: "#6b7280",
                    borderRadius: "50%",
                    "&:hover": { borderColor: "#1e40af", color: "#1e40af" },
                  }}
                >
                  {item.icon}
                </IconButton>
              </Tooltip>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, color: "#374151", display: "block", marginBottom: 6 }}>
            Tags
          </label>
          <TextField
            fullWidth
            size="small"
            placeholder="Add new tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <FiChevronDown size={16} color="#9ca3af" />
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": { borderRadius: "8px", fontSize: 14 },
            }}
          />
        </div>

        {/* Set password */}
        <div style={{ textAlign: "right" }}>
          <button
            style={{
              background: "none",
              border: "none",
              fontSize: 13,
              color: "#6b7280",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            + Set password
          </button>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "16px 24px",
          borderTop: "1px solid #f3f4f6",
        }}
      >
        <Button
          variant="contained"
          onClick={onClose}
          sx={{
            background: "#1e3a5f",
            borderRadius: "8px",
            textTransform: "none",
            fontWeight: 600,
            fontSize: 14,
            px: 4,
            py: 1.2,
            "&:hover": { background: "#1e40af" },
          }}
        >
          Submit
        </Button>
      </div>
    </Drawer>
  );
};

/* ─── SEND SMS DRAWER ────────────────────────────────── */
const SendSmsDrawer = ({
  open,
  onClose,
  student,
}: {
  open: boolean;
  onClose: () => void;
  student: FlatStudent;
}) => {
  const [message, setMessage] = useState("");
  const SMS_LIMIT = 160;
  const smsCount = Math.ceil(message.length / SMS_LIMIT) || 1;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: 420,
          borderRadius: "12px 0 0 12px",
          padding: 0,
          boxShadow: "-8px 0 32px rgba(0,0,0,0.12)",
        },
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 24px",
          borderBottom: "1px solid #f3f4f6",
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 600, color: "#111827" }}>
          Send SMS to student
        </span>
        <IconButton size="small" onClick={onClose} sx={{ color: "#9ca3af" }}>
          <FiX size={20} />
        </IconButton>
      </div>

      {/* Body */}
      <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 14, color: "#374151", fontWeight: 500 }}>
          Sender: <strong>3700</strong>
        </div>

        <TextField
          multiline
          rows={5}
          fullWidth
          placeholder="Enter a message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: "8px",
              fontSize: 14,
              alignItems: "flex-start",
            },
          }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 12,
            color: "#9ca3af",
          }}
        >
          <span>
            {message.length} symbols ( ~ {smsCount} SMS )
          </span>
          <span>{student.name}</span>
        </div>

        <Button
          variant="contained"
          onClick={() => {
            console.log("SMS sent:", message);
            onClose();
          }}
          sx={{
            background: "#5b8ab5",
            borderRadius: "20px",
            textTransform: "none",
            fontWeight: 600,
            fontSize: 14,
            px: 4,
            py: 1.2,
            alignSelf: "flex-start",
            "&:hover": { background: "#4a7aa3" },
          }}
        >
          Send SMS
        </Button>
      </div>
    </Drawer>
  );
};

/* ─── DELETE CONFIRM DIALOG ──────────────────────────── */
const DeleteConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  studentName,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  studentName: string;
}) => (
  <Dialog
    open={open}
    onClose={onClose}
    PaperProps={{
      sx: {
        borderRadius: "16px",
        width: 420,
        padding: "8px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
      },
    }}
  >
    <DialogTitle sx={{ pb: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 18, fontWeight: 600, color: "#111827" }}>
          Delete Student
        </span>
        <IconButton size="small" onClick={onClose} sx={{ color: "#9ca3af" }}>
          <FiX size={20} />
        </IconButton>
      </div>
    </DialogTitle>

    <DialogContent sx={{ pt: 1 }}>
      {/* Warning icon */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          padding: "16px 0",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "#fee2e2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <FiTrash2 size={28} color="#ef4444" />
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#111827", marginBottom: 8 }}>
            Are you sure?
          </div>
          <div style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.5 }}>
            You are about to delete{" "}
            <strong style={{ color: "#111827" }}>{studentName}</strong>. This
            action cannot be undone.
          </div>
        </div>
      </div>
    </DialogContent>

    <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
      <Button
        fullWidth
        variant="outlined"
        onClick={onClose}
        sx={{
          textTransform: "none",
          borderRadius: "8px",
          borderColor: "#e5e7eb",
          color: "#374151",
          fontWeight: 500,
          py: 1.2,
          "&:hover": { borderColor: "#d1d5db", background: "#f9fafb" },
        }}
      >
        Cancel
      </Button>
      <Button
        fullWidth
        variant="contained"
        onClick={onConfirm}
        sx={{
          textTransform: "none",
          borderRadius: "8px",
          background: "#ef4444",
          fontWeight: 600,
          py: 1.2,
          "&:hover": { background: "#dc2626" },
        }}
      >
        Delete
      </Button>
    </DialogActions>
  </Dialog>
);

/* ─── SIDE CARD ──────────────────────────────────────── */
const SideCard = ({
  student,
  onEdit,
  onDelete,
  onSms,
}: {
  student: FlatStudent;
  onEdit: () => void;
  onDelete: () => void;
  onSms: () => void;
}) => (
  <div
    style={{
      background: "white",
      borderRadius: 16,
      border: "1px solid #eaecf0",
      padding: 20,
      width: "100%",
    }}
  >
    {/* Top actions */}
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 16 }}>
      <Tooltip title="Edit">
        <IconButton
          size="small"
          onClick={onEdit}
          sx={{ border: "1.5px solid #3b82f6", color: "#3b82f6" }}
        >
          <FiEdit2 size={14} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Send SMS">
        <IconButton
          size="small"
          onClick={onSms}
          sx={{ border: "1.5px solid #f59e0b", color: "#f59e0b" }}
        >
          <FiMail size={14} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Delete">
        <IconButton
          size="small"
          onClick={onDelete}
          sx={{ border: "1.5px solid #ef4444", color: "#ef4444" }}
        >
          <FiTrash2 size={14} />
        </IconButton>
      </Tooltip>
    </div>

    {/* Avatar */}
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        marginBottom: 16,
      }}
    >
      <Avatar sx={{ width: 72, height: 72, bgcolor: "#e5e7eb", color: "#9ca3af" }}>
        <FiUser size={32} />
      </Avatar>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 17, fontWeight: 600, color: "#111827" }}>{student.name}</div>
        <div style={{ fontSize: 12, color: "#9ca3af" }}>(id: {student.uid})</div>
      </div>
    </div>

    {/* Balance */}
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <BalanceBadge amount={student.balance ?? 0} />
      <span style={{ fontSize: 13, color: "#6b7280" }}>balance</span>
    </div>

    <hr style={{ border: "none", borderTop: "1px solid #f3f4f6", margin: "14px 0" }} />

    {/* Info */}
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#6b7280" }}>
        <FiPhone size={14} />
        <span style={{ color: "#5c7fa3", fontWeight: 500 }}>{student.phone}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#6b7280" }}>
        <FiCalendar size={14} />
        <span>
          Group start:{" "}
          <strong style={{ color: "#111827" }}>{formatDate(student.startDate)}</strong>
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#6b7280" }}>
        <FiGitBranch size={14} />
        <span>Branch:</span>
        <Chip
          label={student.branch || "—"}
          size="small"
          sx={{ fontSize: 11, height: 20, bgcolor: "#f3f4f6" }}
        />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#6b7280" }}>
        <FiUser size={14} />
        <span>
          Status:{" "}
          <strong style={{ color: student.active ? "#16a34a" : "#ef4444" }}>
            {student.active ? "Active" : "Inactive"}
          </strong>
        </span>
      </div>
    </div>

    <hr style={{ border: "none", borderTop: "1px solid #f3f4f6", margin: "14px 0" }} />

    {/* Actions */}
    <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
      <Button
        size="small"
        variant="outlined"
        startIcon={<FiUsers size={13} />}
        endIcon={<FiChevronDown size={13} />}
        sx={{
          flex: 1,
          textTransform: "none",
          fontSize: 12,
          borderColor: "#d1d5db",
          color: "#374151",
        }}
      >
        Add to group
      </Button>
      <Button
        size="small"
        variant="outlined"
        startIcon={<FiDollarSign size={13} />}
        endIcon={<FiChevronDown size={13} />}
        sx={{
          flex: 1,
          textTransform: "none",
          fontSize: 12,
          borderColor: "#d1d5db",
          color: "#374151",
        }}
      >
        Add payment
      </Button>
    </div>

    {/* Note */}
    <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "#6b7280" }}>Note</span>
        <IconButton size="small" sx={{ color: "#9ca3af" }}>
          <FiFlag size={14} />
        </IconButton>
      </div>
      <div
        style={{
          marginTop: 8,
          minHeight: 40,
          borderLeft: "4px solid #60a5fa",
          paddingLeft: 10,
        }}
      />
    </div>
  </div>
);

/* ─── GROUP CARD ─────────────────────────────────────── */
const GroupCard = ({ student }: { student: FlatStudent }) => {
  const teacher = TEACHERS_DATA.find((t) => t.id === student.teacherId);
  const badgeColors: Record<string, { bg: string; color: string }> = {
    blue: { bg: "#dbeafe", color: "#1d4ed8" },
    green: { bg: "#dcfce7", color: "#15803d" },
    amber: { bg: "#fef3c7", color: "#92400e" },
  };
  const bc = badgeColors[student.groupBadgeColor] ?? badgeColors.blue;

  return (
    <div
      style={{
        background: "white",
        border: "1px solid #eaecf0",
        borderRadius: 12,
        padding: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 12,
        }}
      >
        <div style={{ flex: 1 }}>
          <Chip
            label={student.groupBadge}
            size="small"
            sx={{
              fontSize: 11,
              height: 20,
              bgcolor: bc.bg,
              color: bc.color,
              fontWeight: 600,
              mb: 0.5,
            }}
          />
          <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
            {student.groupName}
          </div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{student.teacher}</div>
        </div>
        <div style={{ fontSize: 12, color: "#6b7280", textAlign: "right" }}>
          <div>{formatDate(student.startDate)} —</div>
          <div>{formatDate(student.endDate)}</div>
          <div style={{ marginTop: 4 }}>{student.groupSchedule}</div>
        </div>
      </div>

      <hr style={{ border: "none", borderTop: "1px solid #f3f4f6", margin: "12px 0" }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {[
            ["Status", student.active ? "Active (Learns)" : "Inactive"],
            ["Course", student.course],
            ["Room", student.room],
            ["Price", `${(student.price ?? 0).toLocaleString("ru-RU")} UZS`],
            ["Teacher UID", teacher?.uid ?? "—"],
          ].map(([label, val]) => (
            <div key={label} style={{ fontSize: 12, color: "#6b7280" }}>
              {label}: <strong style={{ color: "#111827" }}>{val}</strong>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginLeft: 16 }}>
          <Tooltip title="Pause">
            <IconButton
              size="small"
              sx={{
                border: "1.5px solid #06b6d4",
                color: "#06b6d4",
                width: 36,
                height: 36,
              }}
            >
              <FiPause size={15} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Archive">
            <IconButton
              size="small"
              sx={{
                border: "1.5px solid #ef4444",
                color: "#ef4444",
                width: 36,
                height: 36,
              }}
            >
              <FiUser size={15} />
            </IconButton>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

/* ─── MONTHLY BALANCE ────────────────────────────────── */
const MonthlyBalance = ({ balance }: { balance: number }) => (
  <div>
    <div style={{ fontSize: 15, fontWeight: 600, color: "#111827", margin: "20px 0 12px" }}>
      Monthly balance status
    </div>
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <div
        style={{
          border: `2px solid ${balance < 0 ? "#f87171" : "#34d399"}`,
          borderRadius: 12,
          padding: "12px 20px",
          minWidth: 120,
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: balance < 0 ? "#f87171" : "#34d399",
            fontWeight: 500,
            marginBottom: 4,
          }}
        >
          2026 M05 1
        </div>
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: balance < 0 ? "#ef4444" : "#16a34a",
          }}
        >
          {balance.toLocaleString("ru-RU")}
        </div>
      </div>
    </div>
  </div>
);

/* ─── PAYMENTS TABLE ─────────────────────────────────── */
const PaymentsTable = ({ payments }: { payments: Payment[] }) => (
  <div>
    <div style={{ fontSize: 15, fontWeight: 600, color: "#111827", margin: "20px 0 12px" }}>
      Payments
    </div>
    <div
      style={{
        background: "white",
        border: "1px solid #eaecf0",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
            {["Date", "Type", "Amount", "Comment", "Creator", ""].map((h) => (
              <th
                key={h}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#6b7280",
                  padding: "12px 16px",
                  textAlign: "left",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {payments.map((p, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #f9fafb" }}>
              <td
                style={{
                  padding: "14px 16px",
                  fontSize: 13,
                  color: "#374151",
                  whiteSpace: "nowrap",
                }}
              >
                {p.date}
              </td>
              <td style={{ padding: "14px 16px" }}>
                <span
                  style={{
                    background: "#374151",
                    color: "white",
                    borderRadius: 4,
                    padding: "2px 8px",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {p.type}
                </span>
              </td>
              <td
                style={{
                  padding: "14px 16px",
                  fontWeight: 600,
                  color: "#111827",
                  whiteSpace: "nowrap",
                }}
              >
                {p.amount}
              </td>
              <td style={{ padding: "14px 16px", fontSize: 13, color: "#374151" }}>
                <div style={{ fontWeight: 500 }}>{p.comment}</div>
                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{p.period}</div>
                <button
                  style={{
                    marginTop: 4,
                    fontSize: 11,
                    border: "1px solid #e5e7eb",
                    borderRadius: 4,
                    padding: "2px 8px",
                    cursor: "pointer",
                    background: "white",
                  }}
                >
                  more
                </button>
              </td>
              <td style={{ padding: "14px 16px", fontSize: 13 }}>
                <div style={{ fontWeight: 500, color: "#111827" }}>{p.creator}</div>
                <div style={{ fontSize: 12, color: "#9ca3af" }}>{p.creatorDate}</div>
              </td>
              <td style={{ padding: "14px 16px" }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<FiPrinter size={12} />}
                  sx={{
                    textTransform: "none",
                    fontSize: 12,
                    borderColor: "#d1d5db",
                    color: "#374151",
                  }}
                >
                  Print out
                </Button>
              </td>
            </tr>
          ))}
          {payments.length === 0 && (
            <tr>
              <td
                colSpan={6}
                style={{ textAlign: "center", padding: 32, color: "#9ca3af", fontSize: 14 }}
              >
                No payments yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

/* ─── MAIN COMPONENT ─────────────────────────────────── */
export const StudentProfile = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const student = buildFlatStudents().find((s) => s.uid === id);

  const [activeTab, setActiveTab] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [smsOpen, setSmsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!student) {
    return (
      <div style={{ minHeight: "100vh", background: "#f0f2f5", padding: 24 }}>
        <Button
          startIcon={<IoArrowBack />}
          onClick={() => navigate(-1)}
          sx={{
            mb: 2,
            textTransform: "none",
            color: "#5c7fa3",
            fontWeight: 600,
            fontSize: 14,
            "&:hover": { background: "#eef4f9" },
          }}
        >
          Back to Students
        </Button>
        <div
          style={{
            maxWidth: 1200,
            marginTop: 24,
            padding: 24,
            background: "white",
            borderRadius: 16,
            border: "1px solid #eaecf0",
            color: "#6b7280",
          }}
        >
          Student not found.
        </div>
      </div>
    );
  }

  const payments = makeMockPayments(student);

  const handleDelete = () => {
    console.log("delete", student.uid);
    setDeleteOpen(false);
    navigate(-1);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f0f2f5", padding: 24 }}>
      {/* Back button */}
      <Button
        startIcon={<IoArrowBack />}
        onClick={() => navigate(-1)}
        sx={{
          mb: 2,
          textTransform: "none",
          color: "#5c7fa3",
          fontWeight: 600,
          fontSize: 14,
          "&:hover": { background: "#eef4f9" },
        }}
      >
        Back to Students
      </Button>

      <div style={{ maxWidth: 1200, display: "flex", gap: 24, alignItems: "flex-start" }}>
        {/* Left sidebar */}
        <div style={{ width: 280, flexShrink: 0 }}>
          <SideCard
            student={student}
            onEdit={() => setEditOpen(true)}
            onDelete={() => setDeleteOpen(true)}
            onSms={() => setSmsOpen(true)}
          />
        </div>

        {/* Right content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              background: "white",
              borderRadius: 16,
              border: "1px solid #eaecf0",
              overflow: "hidden",
            }}
          >
            {/* Tabs */}
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              sx={{
                px: 2,
                borderBottom: "1px solid #f3f4f6",
                "& .MuiTab-root": {
                  textTransform: "none",
                  fontSize: 14,
                  fontWeight: 500,
                  color: "#6b7280",
                  minHeight: 48,
                },
                "& .Mui-selected": { color: "#111827", fontWeight: 600 },
                "& .MuiTabs-indicator": { bgcolor: "#111827", height: 2 },
              }}
            >
              {TABS.map((t) => (
                <Tab key={t} label={t} disableRipple />
              ))}
            </Tabs>

            {/* Tab content */}
            <Box sx={{ p: 2.5 }}>
              {activeTab === 0 ? (
                <>
                  <GroupCard student={student} />
                  <MonthlyBalance balance={student.balance ?? 0} />
                  <PaymentsTable payments={payments} />
                </>
              ) : (
                <div
                  style={{
                    padding: "48px",
                    textAlign: "center",
                    color: "#9ca3af",
                    fontSize: 14,
                  }}
                >
                  No data available
                </div>
              )}
            </Box>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      <EditStudentDrawer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        student={student}
      />

      <SendSmsDrawer
        open={smsOpen}
        onClose={() => setSmsOpen(false)}
        student={student}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        studentName={student.name}
      />
    </div>
  )};