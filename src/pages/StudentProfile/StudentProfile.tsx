// src/pages/StudentProfile.tsx
import { useState, useEffect, useMemo } from "react";
import {
  FiEdit2, FiMail, FiTrash2, FiFlag, FiPrinter,
  FiChevronDown, FiUsers, FiDollarSign, FiPhone,
  FiCalendar, FiGitBranch, FiPause, FiUser, FiX,
  FiMessageSquare, FiArchive,
} from "react-icons/fi";
import { IoArrowBack } from "react-icons/io5";
import {
  Avatar, Chip, Tab, Tabs, Button, IconButton, Tooltip, Box,
  Drawer, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Radio, RadioGroup, FormControlLabel, Switch, Checkbox,
  InputAdornment, Menu, MenuItem,
} from "@mui/material";

import { FlatStudent, mapApiStudentToFlat, formatDate, formatLongDate } from "../../constants/FlatStudents";
import { TEACHERS_DATA } from "../../constants/Teachers";
import { useNavigate, useParams } from "react-router-dom";
import {
  useStudentByIdQuery,
  useUpdateStudentMutation,
  useDeleteStudentMutation,
  useTransferStudentBranchMutation,
} from "../../app/api/studentsApi";
import type { StudentGender } from "../../app/api/studentsApi/types";
import { useAllGroupsQuery, useAddStudentToGroupMutation } from "../../app/api/groupsApi";
import { useAllBranchesQuery } from "../../app/api/branchesApi";
import { usePaymentsListQuery } from "../../app/api/financeApi";
import type { PaymentRow } from "../../app/api/financeApi/types";
import { useToast } from "../../Context/ToastContext";
import { extractApiError } from "../../utils/extractApiError";
import { AddPayment } from "../../components/AddPayment";
import { PaymentReceiptModal } from "../../components/PaymentReceiptModal";

/* ─── TYPES ─────────────────────────────────────────── */
const TABS = ["Groups", "Comments", "Call history", "SMS", "History", "Lead history"];

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
  onSave,
  saving,
  error,
}: {
  open: boolean;
  onClose: () => void;
  student: FlatStudent;
  onSave: (data: { name: string; phone: string; gender: StudentGender; birthdate: string }) => Promise<boolean>;
  saving?: boolean;
  error?: string | null;
}) => {
  const [name, setName] = useState(student.name);
  const [phone, setPhone] = useState(student.phone);
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("male");
  const [tags, setTags] = useState("");

  useEffect(() => {
    if (open) { setName(student.name); setPhone(student.phone); }
  }, [open, student]);

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
            value={dob}
            onChange={(e) => setDob(e.target.value)}
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
        {error && (
          <div style={{ fontSize: 13, color: "#ef4444", marginBottom: 10 }}>{error}</div>
        )}
        <Button
          variant="contained"
          disabled={saving}
          onClick={async () => {
            const ok = await onSave({
              name,
              phone,
              gender: gender === "female" ? "FEMALE" : "MALE",
              birthdate: dob,
            });
            if (ok) onClose();
          }}
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
          {saving ? "Saving..." : "Submit"}
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
  groups,
  isSubmitting,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (groupId: string) => Promise<boolean>;
  groups: { id: string; name: string }[];
  isSubmitting?: boolean;
}) => {
  const [groupId, setGroupId] = useState("");

  useEffect(() => {
    if (!open) setGroupId("");
  }, [open]);

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (!groupId || isSubmitting) return;
    const success = await onSubmit(groupId);
    if (success) setGroupId("");
  };

  return (
    <Dialog open={open} onClose={handleClose} PaperProps={{ sx: { width: 620, maxWidth: "95vw", borderRadius: 1 } }}>
      <DialogTitle sx={{ px: 3, py: 2, borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: "#2e2e2e" }}>
            Add student to group
          </span>
          <IconButton size="small" onClick={handleClose} disabled={isSubmitting}>
            <FiX size={20} />
          </IconButton>
        </div>
      </DialogTitle>
      <DialogContent sx={{ p: 4 }}>
        <select
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          disabled={isSubmitting}
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
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!groupId || isSubmitting}
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
          {isSubmitting ? "Adding..." : "Add student to group"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

const MoveToBranchModal = ({
  open,
  onClose,
  onSubmit,
  branches,
  currentBranchIds,
  isSubmitting,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (branchId: string, reason?: string) => Promise<boolean>;
  branches: { id: string; name: string }[];
  currentBranchIds: string[];
  isSubmitting?: boolean;
}) => {
  const [branch, setBranch] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) { setBranch(""); setReason(""); }
  }, [open]);

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (!branch || isSubmitting) return;
    const success = await onSubmit(branch, reason.trim() || undefined);
    if (success) { setBranch(""); setReason(""); }
  };

  return (
    <Dialog open={open} onClose={handleClose} PaperProps={{ sx: { width: 620, maxWidth: "95vw", borderRadius: 1 } }}>
      <DialogTitle sx={{ px: 3, py: 2, borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: "#2e2e2e" }}>
            Move to another branch
          </span>
          <IconButton size="small" onClick={handleClose} disabled={isSubmitting}>
            <FiX size={20} />
          </IconButton>
        </div>
      </DialogTitle>
      <DialogContent sx={{ p: 4 }}>
        <select
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          disabled={isSubmitting}
          style={{
            width: "100%",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            height: 46,
            padding: "0 12px",
            color: branch ? "#1f2937" : "#a8b0bb",
            fontSize: 14,
            marginBottom: 12,
          }}
        >
          <option value="">Select branch</option>
          {branches.map((b) => {
            const isCurrent = currentBranchIds.includes(b.id);
            return (
              <option key={b.id} value={b.id} disabled={isCurrent}>
                {b.name}{isCurrent ? " (current)" : ""}
              </option>
            );
          })}
        </select>
        <TextField
          fullWidth
          size="small"
          placeholder="Reason (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={isSubmitting}
          sx={{ mb: 2.25, "& .MuiOutlinedInput-root": { borderRadius: "8px", fontSize: 14 } }}
        />
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!branch || isSubmitting}
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
          {isSubmitting ? "Moving..." : "Move to another branch"}
        </Button>
      </DialogContent>
    </Dialog>
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
      <Avatar src={student.photo || undefined} sx={{ width: 72, height: 72, bgcolor: "#e5e7eb", color: "#9ca3af" }}>
        <FiUser size={32} />
      </Avatar>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 17, fontWeight: 600, color: "#111827" }}>
          {student.name}
        </div>
        <div style={{ fontSize: 12, color: "#9ca3af" }} title={student.uid}>
          (id: {student.uid.length > 8 ? `${student.uid.slice(0, 8)}…` : student.uid})
        </div>
      </div>
    </div>

    {/* Balance */}
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <BalanceBadge amount={student.balance ?? 0} />
      <span style={{ fontSize: 13, color: "#6b7280" }}>balance</span>
    </div>

    <hr style={{ border: "none", borderTop: "1px solid #f3f4f6", margin: "14px 0" }} />

    {/* Personal info — only fields the backend actually returned are shown */}
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div>
        <div style={{ fontSize: 12, color: "#9ca3af" }}>Phone:</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#5c7fa3" }}>{student.phone || "—"}</div>
      </div>
      {student.parentPhone && (
        <div>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>Additional phone:</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{student.parentPhone}</div>
        </div>
      )}
      {student.birthdate && (
        <div style={{ fontSize: 13, color: "#6b7280" }}>
          Birthday: <strong style={{ color: "#111827" }}>{formatDate(student.birthdate)}</strong>
        </div>
      )}
      {student.gender && (
        <div style={{ fontSize: 13, color: "#6b7280" }}>
          Gender: <strong style={{ color: "#111827" }}>{student.gender === "MALE" ? "Male" : "Female"}</strong>
        </div>
      )}
      {student.address && (
        <div style={{ fontSize: 13, color: "#6b7280" }}>
          Address: <strong style={{ color: "#111827" }}>{student.address}</strong>
        </div>
      )}
    </div>

    <hr style={{ border: "none", borderTop: "1px solid #f3f4f6", margin: "14px 0" }} />

    {/* Info rows */}
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {student.createdAt && formatLongDate(student.createdAt) && (
        <div
          style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#6b7280" }}
        >
          <FiCalendar size={14} />
          <span>
            Added at:{" "}
            <strong style={{ color: "#111827" }}>{formatLongDate(student.createdAt)}</strong>
          </span>
        </div>
      )}
      {student.startDate && (
        <div
          style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#6b7280" }}
        >
          <FiCalendar size={14} />
          <span>
            Group start:{" "}
            <strong style={{ color: "#111827" }}>{formatDate(student.startDate)}</strong>
          </span>
        </div>
      )}
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
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 4 }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<FiUsers size={13} />}
          onClick={onAddToGroup}
          sx={{
            flex: 1,
            textTransform: "none",
            fontWeight: 600,
            fontSize: 12,
            whiteSpace: "nowrap",
            borderColor: "#93c5fd",
            color: "#2563eb",
            borderRadius: 999,
            "&:hover": { borderColor: "#60a5fa", bgcolor: "#eff6ff" },
          }}
        >
          Add to group
        </Button>
        <IconButton
          size="small"
          onClick={onOpenAddToGroupMenu}
          sx={{
            border: "1px solid #93c5fd", color: "#2563eb", borderRadius: 999, width: 28, height: 28, flexShrink: 0,
            "&:hover": { borderColor: "#60a5fa", bgcolor: "#eff6ff" },
          }}
        >
          <FiChevronDown size={13} />
        </IconButton>
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<FiDollarSign size={13} />}
          onClick={onAddPayment}
          sx={{
            flex: 1,
            textTransform: "none",
            fontWeight: 600,
            fontSize: 12,
            whiteSpace: "nowrap",
            borderColor: "#86efac",
            color: "#16a34a",
            borderRadius: 999,
            "&:hover": { borderColor: "#4ade80", bgcolor: "#f0fdf4" },
          }}
        >
          Add payment
        </Button>
        <IconButton
          size="small"
          onClick={onOpenAddPaymentMenu}
          sx={{
            border: "1px solid #86efac", color: "#16a34a", borderRadius: 999, width: 28, height: 28, flexShrink: 0,
            "&:hover": { borderColor: "#4ade80", bgcolor: "#f0fdf4" },
          }}
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
              <FiArchive size={15} />
            </IconButton>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

/* ─── MONTHLY BALANCE ────────────────────────────────── */
const MonthlyBalance = ({ balance }: { balance: number }) => {
  const now = new Date();
  const label = `${now.getFullYear()} M${String(now.getMonth() + 1).padStart(2, "0")}`;
  return (
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
            {label}
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
};

/* ─── PAYMENTS TABLE ─────────────────────────────────── */
const PaymentsTable = ({
  payments,
  isLoading,
  isError,
}: {
  payments: PaymentRow[];
  isLoading?: boolean;
  isError?: boolean;
}) => {
  const [receiptId, setReceiptId] = useState<string | null>(null);

  return (
  <div>
    <div style={{ fontSize: 15, fontWeight: 600, color: "#111827", margin: "20px 0 12px" }}>
      Payments
    </div>
    <div
      style={{
        background: "white",
        border: "1px solid #eaecf0",
        borderRadius: 12,
        overflowX: "auto",
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
            {["Date", "Method", "Amount", "Comment", "Creator", ""].map((h) => (
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
          {payments.map((p) => (
            <tr key={p.id} style={{ borderBottom: "1px solid #f9fafb" }}>
              <td
                style={{
                  padding: "14px 16px",
                  fontSize: 13,
                  color: "#374151",
                  whiteSpace: "nowrap",
                }}
              >
                {formatDate(p.date ?? "")}
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
                  {p.paymentMethodName || "—"}
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
                {p.amount.toLocaleString("ru-RU")} UZS
              </td>
              <td style={{ padding: "14px 16px", fontSize: 13, color: "#374151" }}>
                <div style={{ fontWeight: 500 }}>{p.notes || "—"}</div>
                {p.groupName && (
                  <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                    {p.groupName}
                  </div>
                )}
              </td>
              <td style={{ padding: "14px 16px", fontSize: 13 }}>
                <div style={{ fontWeight: 500, color: "#111827" }}>{p.createdBy || "—"}</div>
                {p.createdAt && (
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>{formatDate(p.createdAt.slice(0, 10))}</div>
                )}
              </td>
              <td style={{ padding: "14px 16px" }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<FiPrinter size={12} />}
                  onClick={() => setReceiptId(p.id)}
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
          {isLoading && (
            <tr>
              <td colSpan={6} style={{ textAlign: "center", padding: 32, color: "#9ca3af", fontSize: 14 }}>
                Loading...
              </td>
            </tr>
          )}
          {!isLoading && isError && (
            <tr>
              <td colSpan={6} style={{ textAlign: "center", padding: 32, color: "#ef4444", fontSize: 14 }}>
                Failed to load payments
              </td>
            </tr>
          )}
          {!isLoading && !isError && payments.length === 0 && (
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

    <PaymentReceiptModal open={Boolean(receiptId)} onClose={() => setReceiptId(null)} paymentId={receiptId} />
  </div>
  );
};

/* ─── MAIN COMPONENT ─────────────────────────────────── */
export const StudentProfile = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // ✅ uid (string) — real API id orqali topiladi, navigate('/students/:id') bilan mos
  const { data, isLoading } = useStudentByIdQuery(id ?? "", { skip: !id });
  const student = data ? mapApiStudentToFlat(data.data) : undefined;

  const [updateStudent, { isLoading: isSavingStudent }] = useUpdateStudentMutation();
  const [deleteStudent, { isLoading: isDeletingStudent }] = useDeleteStudentMutation();
  const [addStudentToGroup, { isLoading: isAddingToGroup }] = useAddStudentToGroupMutation();
  const [transferStudentBranch, { isLoading: isMovingBranch }] = useTransferStudentBranchMutation();

  const { data: groupsData } = useAllGroupsQuery({ page: 1, limit: 100 });
  const groupOptions = useMemo(
    () => (groupsData?.data ?? []).map((g) => ({ id: g.id, name: g.name })),
    [groupsData]
  );

  const { data: branchesData } = useAllBranchesQuery();
  // GET /branches includes soft-deleted (status: "DELETED") and deactivated
  // (status: "INACTIVE") branches — filter to ACTIVE only, same as Header's
  // own branch dropdown, so this picker can't transfer a student into a
  // branch that no longer exists.
  const branchOptions = useMemo(
    () => (branchesData?.data ?? []).filter((b) => b.status === "ACTIVE").map((b) => ({ id: b.id, name: b.name })),
    [branchesData]
  );
  const currentBranchIds = useMemo(() => (data?.data.branch ?? []).map((b) => b.id), [data]);

  // GET /finance/payments has no studentId filter, so it's narrowed by the
  // student's name server-side (same `search` convention as the rest of the
  // finance module) and filtered exactly by studentId client-side.
  const {
    data: paymentsData, isFetching: isPaymentsLoading, isError: isPaymentsError,
  } = usePaymentsListQuery(
    { page: 1, limit: 50, search: student?.name },
    { skip: !student }
  );
  const payments = (paymentsData?.rows ?? []).filter((p) => p.studentId === student?.uid);

  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const toast = useToast();

  const [activeTab, setActiveTab] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [smsOpen, setSmsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [addToGroupOpen, setAddToGroupOpen] = useState(false);
  const [moveBranchOpen, setMoveBranchOpen] = useState(false);
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);
  const [groupMenuAnchor, setGroupMenuAnchor] = useState<null | HTMLElement>(null);
  const [paymentMenuAnchor, setPaymentMenuAnchor] = useState<null | HTMLElement>(null);

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#f0f2f5", padding: 24, color: "#6b7280" }}>
        Loading...
      </div>
    );
  }

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

  const handleSaveStudent = async (data: { name: string; phone: string; gender: StudentGender; birthdate: string }): Promise<boolean> => {
    setSaveError(null);
    try {
      await updateStudent({
        id: student.uid,
        name: data.name,
        phone: data.phone,
        gender: data.gender,
        birthdate: data.birthdate || undefined,
      }).unwrap();
      toast.success("Student updated successfully");
      return true;
    } catch {
      setSaveError("Failed to save the student");
      toast.error("Failed to save the student");
      return false;
    }
  };

  const handleDelete = async (deleteMode: boolean) => {
    if (!deleteMode) {
      // Guruhdan chiqarish uchun backend endpointi hozircha mavjud emas.
      navigate(-1);
      return;
    }
    setDeleteError(null);
    try {
      await deleteStudent(student.uid).unwrap();
      toast.success("Student deleted successfully");
      navigate(-1);
    } catch {
      setDeleteError("Failed to delete the student");
      toast.error("Failed to delete the student");
    }
  };

  // GET /students/{id} (StudentDetail) doesn't return the student's current
  // group id, unlike the students-list shape used on the Students page, so
  // there's no client-side "already in this group" check here — the backend
  // is relied on to reject/ignore a duplicate membership.
  const handleAddToGroup = async (groupId: string): Promise<boolean> => {
    try {
      await addStudentToGroup({ studentId: student.uid, groupId }).unwrap();
      toast.success("Student added to the group");
      return true;
    } catch (err) {
      const detail = extractApiError(err);
      toast.error(detail ? `Failed to add to the group: ${detail}` : "Failed to add to the group");
      return false;
    }
  };

  const handleMoveToBranch = async (branchId: string, reason?: string): Promise<boolean> => {
    try {
      await transferStudentBranch({ id: student.uid, newBranchId: branchId, reason }).unwrap();
      toast.success("Student moved to the new branch");
      return true;
    } catch (err) {
      const detail = extractApiError(err);
      toast.error(detail ? `Failed to move branch: ${detail}` : "Failed to move branch");
      return false;
    }
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

      {(deleteError || isDeletingStudent) && (
        <div style={{ maxWidth: 1200, marginBottom: 12, fontSize: 13, color: deleteError ? "#ef4444" : "#6b7280" }}>
          {deleteError ?? "Deleting..."}
        </div>
      )}

      <Box sx={{ maxWidth: 1200, display: "flex", flexDirection: { xs: "column", lg: "row" }, gap: 3, alignItems: "flex-start" }}>
        {/* Left sidebar */}
        <Box sx={{ width: { xs: "100%", lg: 320 }, flexShrink: 0 }}>
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
        </Box>

        {/* Right content */}
        <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>
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
                  <PaymentsTable payments={payments} isLoading={isPaymentsLoading} isError={isPaymentsError} />
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
        </Box>
      </Box>

      {/* ── Modals ── */}
      <EditStudentDrawer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        student={student}
        onSave={handleSaveStudent}
        saving={isSavingStudent}
        error={saveError}
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
        onSubmit={async (groupId) => {
          const ok = await handleAddToGroup(groupId);
          if (ok) setAddToGroupOpen(false);
          return ok;
        }}
        groups={groupOptions}
        isSubmitting={isAddingToGroup}
      />

      <MoveToBranchModal
        open={moveBranchOpen}
        onClose={() => setMoveBranchOpen(false)}
        onSubmit={async (branchId, reason) => {
          const ok = await handleMoveToBranch(branchId, reason);
          if (ok) setMoveBranchOpen(false);
          return ok;
        }}
        branches={branchOptions}
        currentBranchIds={currentBranchIds}
        isSubmitting={isMovingBranch}
      />

      <AddPayment
        open={addPaymentOpen}
        onClose={() => setAddPaymentOpen(false)}
        initialStudentId={student.uid}
        initialStudentName={student.name}
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