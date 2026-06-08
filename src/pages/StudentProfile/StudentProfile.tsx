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
  TextField, Radio, RadioGroup, FormControlLabel, Switch, Checkbox,
  InputAdornment, Menu, MenuItem,
} from "@mui/material";

import { FlatStudent, buildFlatStudents, formatDate } from "../../constants/FlatStudents";
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

interface SmsHistory {
  text: string;
  creator: string;
  createdAt: string;
}

interface GroupHistoryItem {
  title: string;
  createdAt: string;
  creator: string;
  details?: string[];
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

const makeMockSms = (student: FlatStudent): SmsHistory[] => [
  {
    text: "Hurmatli (STUDENT). O'qishni davom ettirish uchun guruh (GROUP): (SUM) sum. O'qishni to'xtovsiz davom ettirish uchun pul to'lang. Rahmat!",
    creator: student.teacher,
    createdAt: "02.06.2026 09:02:22",
  },
  {
    text: `Hurmatli, ${student.name}! Siz o'quv guruhiga qo'shildingiz.\nO'qituvchi: ${student.teacher}\nO'quv kunlari: Du, Cho, Ju\nVaqt: ${student.groupSchedule.split("·")[1]?.trim() ?? "10:30"}\nKabinet: ${student.room}\n\nSizni Young Adultsda kutamiz!`,
    creator: student.teacher,
    createdAt: "01.06.2026 10:36:36",
  },
];

const makeMockGroupHistory = (student: FlatStudent): GroupHistoryItem[] => [
  {
    title: "Status changed",
    createdAt: "01.06.2026 10:36:47",
    creator: "Maksuda Abraykulova",
    details: [
      `Group Name: ${student.groupName}`,
      `Group: #${student.groupId}`,
      `Activated from: ${student.startDate}`,
    ],
  },
  {
    title: "Added new student",
    createdAt: "01.06.2026 10:36:34",
    creator: "Maksuda Abraykulova",
  },
  {
    title: "Added to group",
    createdAt: "01.06.2026 10:36:34",
    creator: "Maksuda Abraykulova",
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
    {amount > 0 ? "+" : ""}
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
      <div
        style={{
          padding: "24px",
          overflowY: "auto",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {/* Phone */}
        <div>
          <label
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "#374151",
              display: "block",
              marginBottom: 6,
            }}
          >
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
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", fontSize: 14 } }}
          />
        </div>

        {/* Name */}
        <div>
          <label
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "#374151",
              display: "block",
              marginBottom: 6,
            }}
          >
            Name
          </label>
          <TextField
            fullWidth
            size="small"
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", fontSize: 14 } }}
          />
        </div>

        {/* Date of birth */}
        <div>
          <label
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "#374151",
              display: "block",
              marginBottom: 6,
            }}
          >
            Date of birth
          </label>
          <TextField
            fullWidth
            size="small"
            type="date"
            InputLabelProps={{ shrink: true }}
            sx={{
              "& .MuiOutlinedInput-root": { borderRadius: "8px", fontSize: 14 },
              "& input": { color: "#9ca3af" },
            }}
          />
        </div>

        {/* Gender */}
        <div>
          <label
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "#374151",
              display: "block",
              marginBottom: 6,
            }}
          >
            Gender
          </label>
          <RadioGroup row value={gender} onChange={(e) => setGender(e.target.value)}>
            <FormControlLabel
              value="male"
              control={
                <Radio
                  size="small"
                  sx={{ color: "#d1d5db", "&.Mui-checked": { color: "#1e40af" } }}
                />
              }
              label={<span style={{ fontSize: 14, color: "#374151" }}>Male</span>}
            />
            <FormControlLabel
              value="female"
              control={
                <Radio
                  size="small"
                  sx={{ color: "#d1d5db", "&.Mui-checked": { color: "#1e40af" } }}
                />
              }
              label={<span style={{ fontSize: 14, color: "#374151" }}>Female</span>}
            />
          </RadioGroup>
        </div>

        {/* Photo */}
        <div>
          <label
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "#374151",
              display: "block",
              marginBottom: 6,
            }}
          >
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
          <label
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "#374151",
              display: "block",
              marginBottom: 8,
            }}
          >
            Additional contacts
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
          <label
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "#374151",
              display: "block",
              marginBottom: 6,
            }}
          >
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
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", fontSize: 14 } }}
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
      <div style={{ padding: "16px 24px", borderTop: "1px solid #f3f4f6" }}>
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
  onConfirm: (deleteMode: boolean) => void;
  studentName: string;
}) => {
  const [deleteMode, setDeleteMode] = useState(false);
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [recalculate, setRecalculate] = useState(false);
  const [scope, setScope] = useState<"current" | "all">("current");

  const handleClose = () => {
    setDeleteMode(false);
    setReason("");
    setComment("");
    setRecalculate(false);
    setScope("current");
    onClose();
  };

  const handleYes = () => {
    onConfirm(deleteMode);
    handleClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      PaperProps={{
        sx: {
          borderRadius: "12px",
          width: 620,
          maxWidth: "95vw",
          overflow: "hidden",
        },
      }}
    >
      <DialogTitle sx={{ px: 3, py: 2, borderBottom: "1px solid #ececec" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 32, transform: "scale(0.42)", transformOrigin: "left center", whiteSpace: "nowrap", color: "#2e2e2e" }}>
            Do you realy want to delete it?
          </span>
          <IconButton size="small" onClick={handleClose} sx={{ color: "#9ca3af" }}>
            <FiX size={20} />
          </IconButton>
        </div>
      </DialogTitle>

      <DialogContent sx={{ px: 4, py: 3 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 18 }}>
          <span style={{ fontSize: 14, color: deleteMode ? "#7d7d7d" : "#5f9bb8" }}>Remove from group</span>
          <Switch checked={deleteMode} onChange={(e) => setDeleteMode(e.target.checked)} />
          <span style={{ fontSize: 14, color: deleteMode ? "#2f2f2f" : "#7d7d7d" }}>Delete student</span>
        </div>

        <select
          style={{ width: "100%", border: "1px solid #e0e0e0", borderRadius: 8, height: 46, padding: "0 12px", fontSize: 14, color: reason ? "#1a1a1a" : "#9ca3af", marginBottom: 12 }}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        >
          <option value="">Reasons for removal</option>
          <option value="No attendance">No attendance</option>
          <option value="Parent request">Parent request</option>
          <option value="Low results">Low results</option>
          <option value="Other">Other</option>
        </select>

        <textarea
          style={{ width: "100%", border: "1px solid #e0e0e0", borderRadius: 8, minHeight: 84, padding: "10px 12px", fontSize: 14, color: "#555", resize: "vertical", boxSizing: "border-box", marginBottom: 10 }}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Comment"
        />

        <FormControlLabel
          control={<Checkbox size="small" checked={recalculate} onChange={(e) => setRecalculate(e.target.checked)} />}
          label={<span style={{ fontSize: 14, color: "#3f3f3f" }}>Recalculate the balance</span>}
          sx={{ m: 0, mb: 1 }}
        />

        <RadioGroup row value={scope} onChange={(e) => setScope(e.target.value as "current" | "all")} sx={{ gap: 1.5 }}>
          <FormControlLabel value="current" control={<Radio size="small" />} label={<span style={{ fontSize: 14 }}>Current group</span>} />
          <FormControlLabel value="all" control={<Radio size="small" />} label={<span style={{ fontSize: 14 }}>All groups</span>} />
        </RadioGroup>
        <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
          Student: {studentName}
        </div>
      </DialogContent>

      <DialogActions sx={{ justifyContent: "center", pb: 3, gap: 2 }}>
        <Button
          variant="contained"
          onClick={handleYes}
          sx={{
            textTransform: "none",
            borderRadius: 999,
            bgcolor: "#d93f4f",
            px: 4,
            "&:hover": { bgcolor: "#c53343" },
          }}
        >
          Yes
        </Button>
        <Button onClick={handleClose} sx={{ textTransform: "none", color: "#8a8a8a" }}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const AddToGroupModal = ({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (groupId: string) => void;
}) => {
  const [groupId, setGroupId] = useState("");
  const allGroups = TEACHERS_DATA.flatMap((t) => t.groups);

  const handleClose = () => {
    setGroupId("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} PaperProps={{ sx: { width: 620, maxWidth: "95vw", borderRadius: 1 } }}>
      <DialogTitle sx={{ px: 3, py: 2, borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 34, transform: "scale(0.42)", transformOrigin: "left center", color: "#2e2e2e", whiteSpace: "nowrap" }}>
            Add student to group
          </span>
          <IconButton size="small" onClick={handleClose}>
            <FiX size={20} />
          </IconButton>
        </div>
      </DialogTitle>
      <DialogContent sx={{ p: 4 }}>
        <select
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          style={{
            width: "100%",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            height: 46,
            padding: "0 12px",
            color: groupId ? "#1f2937" : "#a8b0bb",
            fontSize: 14,
            marginBottom: 18,
          }}
        >
          <option value="">Select group</option>
          {allGroups.map((g) => (
            <option key={g.id} value={String(g.id)}>
              {g.name}: {g.course} {g.teacher} ({g.schedule})
            </option>
          ))}
        </select>
        <Button
          variant="contained"
          onClick={() => onSubmit(groupId)}
          disabled={!groupId}
          sx={{
            textTransform: "none",
            borderRadius: 999,
            bgcolor: "#66c4d8",
            px: 3.5,
            py: 1.2,
            fontWeight: 600,
            "&:hover": { bgcolor: "#55b3c7" },
          }}
        >
          Add student to group
        </Button>
      </DialogContent>
    </Dialog>
  );
};

const MoveToBranchModal = ({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (branch: string) => void;
}) => {
  const [branch, setBranch] = useState("");
  const branches = Array.from(new Set(TEACHERS_DATA.map((t) => t.branch))).filter(Boolean);

  const handleClose = () => {
    setBranch("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} PaperProps={{ sx: { width: 620, maxWidth: "95vw", borderRadius: 1 } }}>
      <DialogTitle sx={{ px: 3, py: 2, borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 34, transform: "scale(0.42)", transformOrigin: "left center", color: "#2e2e2e", whiteSpace: "nowrap" }}>
            Move to other branch
          </span>
          <IconButton size="small" onClick={handleClose}>
            <FiX size={20} />
          </IconButton>
        </div>
      </DialogTitle>
      <DialogContent sx={{ p: 4 }}>
        <select
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          style={{
            width: "100%",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            height: 46,
            padding: "0 12px",
            color: branch ? "#1f2937" : "#a8b0bb",
            fontSize: 14,
            marginBottom: 18,
          }}
        >
          <option value="">Select branch</option>
          {branches.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <Button
          variant="contained"
          onClick={() => onSubmit(branch)}
          disabled={!branch}
          sx={{
            textTransform: "none",
            borderRadius: 999,
            bgcolor: "#66c4d8",
            px: 3.5,
            py: 1.2,
            fontWeight: 600,
            "&:hover": { bgcolor: "#55b3c7" },
          }}
        >
          Move to other branch
        </Button>
      </DialogContent>
    </Dialog>
  );
};

const AddPaymentModal = ({
  open,
  onClose,
  student,
}: {
  open: boolean;
  onClose: () => void;
  student: FlatStudent;
}) => {
  const [method, setMethod] = useState("Cash");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("2026-06-02");
  const [comment, setComment] = useState("");
  const groupOptions = TEACHERS_DATA.flatMap((t) => t.groups);
  const [groupId, setGroupId] = useState(String(student.groupId));

  const methodsLeft = ["Cash", "Card", "Bank account", "Payme"];
  const methodsRight = ["Click", "Uzum", "Humo"];

  const handleClose = () => {
    setMethod("Cash");
    setAmount("");
    setDate("2026-06-02");
    setComment("");
    setGroupId(String(student.groupId));
    onClose();
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={handleClose}
      PaperProps={{
        sx: {
          width: 380,
          borderRadius: "12px 0 0 12px",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.12)",
        },
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 18px", borderBottom: "1px solid #ececec" }}>
        <span style={{ fontSize: 34, transform: "scale(0.42)", transformOrigin: "left center", whiteSpace: "nowrap", color: "#2d2d2d" }}>Add payment</span>
        <IconButton size="small" onClick={handleClose}><FiX size={20} /></IconButton>
      </div>
      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <div style={{ fontSize: 13, color: "#374151", marginBottom: 6 }}>Student</div>
          <div style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 4, padding: "10px 12px", color: "#6b7280", fontSize: 14 }}>
            {student.name}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 13, color: "#374151", marginBottom: 6 }}>Balance</div>
          <span style={{ background: "#1d5f98", color: "#fff", borderRadius: 999, fontSize: 26, transform: "scale(0.42)", transformOrigin: "left center", display: "inline-block", padding: "4px 16px", fontWeight: 700 }}>
            {(student.balance ?? 0).toLocaleString("ru-RU")} UZS
          </span>
        </div>
        <div>
          <div style={{ fontSize: 13, color: "#374151", marginBottom: 6 }}>Group</div>
          <select value={groupId} onChange={(e) => setGroupId(e.target.value)} style={{ width: "100%", border: "1px solid #d9dee5", borderRadius: 6, padding: "10px 12px", fontSize: 14, color: "#334155" }}>
            {groupOptions.map((g) => (
              <option key={g.id} value={String(g.id)}>
                {g.name}: {g.course} {g.teacher} ({g.schedule})
              </option>
            ))}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 13, color: "#374151", marginBottom: 6 }}>Method pay</div>
          <div style={{ display: "flex", gap: 26 }}>
            <RadioGroup value={method} onChange={(e) => setMethod(e.target.value)}>
              {methodsLeft.map((m) => <FormControlLabel key={m} value={m} control={<Radio size="small" />} label={<span style={{ fontSize: 14 }}>{m}</span>} />)}
            </RadioGroup>
            <RadioGroup value={method} onChange={(e) => setMethod(e.target.value)}>
              {methodsRight.map((m) => <FormControlLabel key={m} value={m} control={<Radio size="small" />} label={<span style={{ fontSize: 14 }}>{m}</span>} />)}
            </RadioGroup>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 13, color: "#374151", marginBottom: 6 }}>Amount</div>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} style={{ width: "100%", border: "1px solid #d9dee5", borderRadius: 4, padding: "10px 12px", boxSizing: "border-box" }} />
        </div>
        <div>
          <div style={{ fontSize: 13, color: "#374151", marginBottom: 6 }}>Date</div>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: "100%", border: "1px solid #d9dee5", borderRadius: 4, padding: "10px 12px", boxSizing: "border-box", color: "#6b7280" }} />
        </div>
        <div>
          <div style={{ fontSize: 13, color: "#374151", marginBottom: 6 }}>Comment</div>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} style={{ width: "100%", minHeight: 62, border: "1px solid #d9dee5", borderRadius: 4, padding: "10px 12px", boxSizing: "border-box" }} />
        </div>
        <Button variant="contained" onClick={handleClose} sx={{ textTransform: "none", borderRadius: 999, bgcolor: "#66c4d8", alignSelf: "flex-start", px: 3, py: 1, "&:hover": { bgcolor: "#55b3c7" } }}>
          Submit
        </Button>
      </div>
    </Drawer>
  );
};

/* ─── SIDE CARD ──────────────────────────────────────── */
const SideCard = ({
  student,
  onEdit,
  onDelete,
  onSms,
  onAddToGroup,
  onOpenAddToGroupMenu,
  onAddPayment,
  onOpenAddPaymentMenu,
}: {
  student: FlatStudent;
  onEdit: () => void;
  onDelete: () => void;
  onSms: () => void;
  onAddToGroup: () => void;
  onOpenAddToGroupMenu: (event: React.MouseEvent<HTMLElement>) => void;
  onAddPayment: () => void;
  onOpenAddPaymentMenu: (event: React.MouseEvent<HTMLElement>) => void;
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
        <div style={{ fontSize: 17, fontWeight: 600, color: "#111827" }}>
          {student.name}
        </div>
        <div style={{ fontSize: 12, color: "#9ca3af" }}>(id: {student.uid})</div>
      </div>
    </div>

    {/* Balance */}
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <BalanceBadge amount={student.balance ?? 0} />
      <span style={{ fontSize: 13, color: "#6b7280" }}>balance</span>
    </div>

    <hr style={{ border: "none", borderTop: "1px solid #f3f4f6", margin: "14px 0" }} />

    {/* Info rows */}
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#6b7280" }}
      >
        <FiPhone size={14} />
        <span style={{ color: "#5c7fa3", fontWeight: 500 }}>{student.phone}</span>
      </div>
      <div
        style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#6b7280" }}
      >
        <FiCalendar size={14} />
        <span>
          Group start:{" "}
          <strong style={{ color: "#111827" }}>{formatDate(student.startDate)}</strong>
        </span>
      </div>
      <div
        style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#6b7280" }}
      >
        <FiGitBranch size={14} />
        <span>Branch:</span>
        <Chip
          label={student.branch || "—"}
          size="small"
          sx={{ fontSize: 11, height: 20, bgcolor: "#f3f4f6" }}
        />
      </div>
      <div
        style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#6b7280" }}
      >
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

    {/* Action buttons */}
    <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 4, flex: 1 }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<FiUsers size={13} />}
          onClick={onAddToGroup}
          sx={{
            flex: 1,
            textTransform: "none",
            fontSize: 12,
            borderColor: "#8fc8d6",
            color: "#2b7689",
            borderRadius: 999,
          }}
        >
          Add to group
        </Button>
        <IconButton
          size="small"
          onClick={onOpenAddToGroupMenu}
          sx={{ border: "1px solid #8fc8d6", color: "#2b7689", borderRadius: 999, width: 28, height: 28 }}
        >
          <FiChevronDown size={13} />
        </IconButton>
      </div>
      <div style={{ display: "flex", gap: 4, flex: 1 }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<FiDollarSign size={13} />}
          onClick={onAddPayment}
          sx={{
            flex: 1,
            textTransform: "none",
            fontSize: 12,
            borderColor: "#8fc8d6",
            color: "#2b7689",
            borderRadius: 999,
          }}
        >
          Add payment
        </Button>
        <IconButton
          size="small"
          onClick={onOpenAddPaymentMenu}
          sx={{ border: "1px solid #8fc8d6", color: "#2b7689", borderRadius: 999, width: 28, height: 28 }}
        >
          <FiChevronDown size={13} />
        </IconButton>
      </div>
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
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
            {student.teacher}
          </div>
        </div>
        <div style={{ fontSize: 12, color: "#6b7280", textAlign: "right" }}>
          <div>{formatDate(student.startDate)} —</div>
          <div>{formatDate(student.endDate)}</div>
          <div style={{ marginTop: 4 }}>{student.groupSchedule}</div>
        </div>
      </div>

      <hr style={{ border: "none", borderTop: "1px solid #f3f4f6", margin: "12px 0" }} />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
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
        <div
          style={{ display: "flex", flexDirection: "column", gap: 8, marginLeft: 16 }}
        >
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
                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                  {p.period}
                </div>
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

const SmsTabContent = ({ sms }: { sms: SmsHistory[] }) => (
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
        <tr style={{ borderBottom: "1px solid #f1f3f5" }}>
          {["SMS", "Creator", "Create at"].map((h) => (
            <th
              key={h}
              style={{
                padding: "14px 18px",
                fontSize: 12,
                color: "#9aa1aa",
                textAlign: "left",
                fontWeight: 600,
              }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sms.map((row, idx) => (
          <tr key={idx} style={{ borderBottom: idx === sms.length - 1 ? "none" : "1px solid #f1f3f5" }}>
            <td style={{ padding: "14px 18px", color: "#444", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-line" }}>{row.text}</td>
            <td style={{ padding: "14px 18px", color: "#6b7280", fontSize: 13, verticalAlign: "top" }}>{row.creator}</td>
            <td style={{ padding: "14px 18px", color: "#8b95a1", fontSize: 13, whiteSpace: "nowrap", verticalAlign: "top" }}>{row.createdAt}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const HistoryTabContent = ({
  student,
  items,
}: {
  student: FlatStudent;
  items: GroupHistoryItem[];
}) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {items.map((item, idx) => (
        <div
          key={`${item.title}-${idx}`}
          style={{
            background: "white",
            border: "1px solid #eaecf0",
            borderRadius: 8,
            padding: 18,
            minHeight: 98,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 10 }}>
            <div>
              <div style={{ fontSize: 33, transform: "scale(0.42)", transformOrigin: "left top", color: "#2c2c2c", marginBottom: -8 }}>{item.title}</div>
              {item.details?.map((line) => (
                <div key={line} style={{ fontSize: 13, color: "#4b5563", marginTop: 2 }}>{line}</div>
              ))}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, color: "#8b95a1" }}>{item.createdAt}</div>
              <div style={{ fontSize: 12, color: "#8b95a1", marginTop: 2 }}>{item.creator}</div>
            </div>
          </div>
        </div>
      ))}
    </div>

    <div>
      <div style={{ fontSize: 40, transform: "scale(0.42)", transformOrigin: "left top", color: "#2c2c2c", marginBottom: -6 }}>Group History</div>
      <div
        style={{
          position: "relative",
          background: "white",
          border: "1px solid #eaecf0",
          borderRadius: 8,
          padding: 16,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 10,
            right: -40,
            transform: "rotate(40deg)",
            background: "#38a169",
            color: "white",
            fontSize: 11,
            fontWeight: 700,
            width: 140,
            textAlign: "center",
            padding: "4px 0",
          }}
        >
          ACTIVE
        </div>
        <div style={{ fontSize: 12, color: "#111827", fontWeight: 700 }}>{student.groupBadge}</div>
        <div style={{ fontSize: 13, color: "#4b5563", marginTop: 4 }}>{student.course}</div>
        <div style={{ fontSize: 13, color: "#4b5563", marginTop: 2 }}>{student.teacher}</div>
        <div style={{ fontSize: 13, color: "#4b5563", marginTop: 2 }}>Status: Active (Learns)</div>
        <div style={{ position: "absolute", top: 16, right: 16, textAlign: "right", fontSize: 13, color: "#6b7280" }}>
          <div>{formatDate(student.startDate)} —</div>
          <div>{formatDate(student.endDate)}</div>
          <div style={{ marginTop: 2 }}>{student.groupSchedule}</div>
        </div>
      </div>
    </div>
  </div>
);

/* ─── MAIN COMPONENT ─────────────────────────────────── */
export const StudentProfile = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // ✅ uid (string) orqali topiladi — navigate('/students/101-1') bilan mos
  const allStudents = buildFlatStudents();
  const student = allStudents.find((s) => s.uid === id);

  const [activeTab, setActiveTab] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [smsOpen, setSmsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [addToGroupOpen, setAddToGroupOpen] = useState(false);
  const [moveBranchOpen, setMoveBranchOpen] = useState(false);
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);
  const [groupMenuAnchor, setGroupMenuAnchor] = useState<null | HTMLElement>(null);
  const [paymentMenuAnchor, setPaymentMenuAnchor] = useState<null | HTMLElement>(null);

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
          Student not found. (id: {id})
        </div>
      </div>
    );
  }

  const payments = makeMockPayments(student);
  const smsHistory = makeMockSms(student);
  const groupHistory = makeMockGroupHistory(student);

  const handleDelete = (deleteMode: boolean) => {
    if (deleteMode) {
      console.log("delete permanently", student.uid);
    } else {
      console.log("archive/remove from group", student.uid);
    }
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
            onAddToGroup={() => setAddToGroupOpen(true)}
            onOpenAddToGroupMenu={(e) => setGroupMenuAnchor(e.currentTarget)}
            onAddPayment={() => setAddPaymentOpen(true)}
            onOpenAddPaymentMenu={(e) => setPaymentMenuAnchor(e.currentTarget)}
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
              ) : activeTab === 3 ? (
                <SmsTabContent sms={smsHistory} />
              ) : activeTab === 4 ? (
                <HistoryTabContent student={student} items={groupHistory} />
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

      <AddToGroupModal
        open={addToGroupOpen}
        onClose={() => setAddToGroupOpen(false)}
        onSubmit={() => setAddToGroupOpen(false)}
      />

      <MoveToBranchModal
        open={moveBranchOpen}
        onClose={() => setMoveBranchOpen(false)}
        onSubmit={() => setMoveBranchOpen(false)}
      />

      <AddPaymentModal
        open={addPaymentOpen}
        onClose={() => setAddPaymentOpen(false)}
        student={student}
      />

      <Menu
        anchorEl={groupMenuAnchor}
        open={Boolean(groupMenuAnchor)}
        onClose={() => setGroupMenuAnchor(null)}
      >
        <MenuItem
          onClick={() => {
            setGroupMenuAnchor(null);
            setMoveBranchOpen(true);
          }}
        >
          Move to another branch
        </MenuItem>
      </Menu>

      <Menu
        anchorEl={paymentMenuAnchor}
        open={Boolean(paymentMenuAnchor)}
        onClose={() => setPaymentMenuAnchor(null)}
      >
        <MenuItem onClick={() => setPaymentMenuAnchor(null)}>Return money</MenuItem>
        <MenuItem onClick={() => setPaymentMenuAnchor(null)}>Write off</MenuItem>
      </Menu>
    </div>
  );
};