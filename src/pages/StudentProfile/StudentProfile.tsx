// src/pages/StudentProfile.tsx
import { useState, useEffect, useMemo } from "react";
import {
  FiEdit2, FiMail, FiFlag, FiPrinter,
  FiChevronDown, FiUsers, FiDollarSign, FiPhone,
  FiCalendar, FiGitBranch, FiPause, FiPlay, FiUser, FiX,
  FiMessageSquare, FiArchive,
} from "react-icons/fi";
import { IoArrowBack } from "react-icons/io5";
import {
  Avatar, Chip, Tab, Tabs, Button, IconButton, Tooltip, Box,
  Drawer, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Radio, RadioGroup, FormControlLabel,
  InputAdornment, Menu, MenuItem,
} from "@mui/material";
import { useTranslation } from "react-i18next";

import { FlatStudent, mapApiStudentToFlat, formatDate, formatLongDate } from "../../constants/FlatStudents";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import {
  useStudentByIdQuery,
  useStudentGroupMembershipsQuery,
  useUpdateStudentMutation,
  useToggleStudentStatusMutation,
  useTransferStudentBranchMutation,
  useStudentCommentsQuery,
  useStudentHistoryQuery,
  useStudentSmsHistoryQuery,
  useStudentPaymentsQuery,
  useStudentFinanceHistoryQuery,
  normalizeFinanceTransactions,
} from "../../app/api/studentsApi";
import type {
  StudentGender, StudentGroupMembership, StudentFinanceHistoryEntry, StudentFinanceTransaction,
  StudentPaymentsSummary,
} from "../../app/api/studentsApi/types";
import {
  useAllGroupsQuery, useAddStudentToGroupMutation, useStudentGroupsQuery,
  useFreezeStudentGroupMutation, useUnfreezeStudentGroupMutation, useUpdateStudentGroupStatusMutation,
} from "../../app/api/groupsApi";
import type { Group } from "../../app/api/groupsApi/types";
import { useAllBranchesQuery } from "../../app/api/branchesApi";
import { useDeletePaymentMutation, isCompletedPaymentStatus } from "../../app/api/financeApi";
import { useAttendanceReportQuery } from "../../app/api/attendancesApi";
import { useSendSmsToStudentsMutation } from "../../app/api/smsApi";
import { useToast } from "../../Context/ToastContext";
import { DatePickerField } from "../SingleGroup/DatePickerField";
import { extractApiError } from "../../utils/extractApiError";
import { AddPayment } from "../../components/AddPayment";
import { PaymentReceiptModal } from "../../components/PaymentReceiptModal";
import { DebtorReceiptModal } from "../../components/DebtorReceiptModal";
import { FreezeModal } from "../SingleGroup/FreezeModal";
import { ActivateModal } from "../SingleGroup/ActivateModal";

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
          <DatePickerField value={dob} onChange={setDob} />
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
  const toast = useToast();
  const [sendSms, { isLoading: isSendingSms }] = useSendSmsToStudentsMutation();
  const [message, setMessage] = useState("");
  const SMS_LIMIT = 160;
  const smsCount = Math.ceil(message.length / SMS_LIMIT) || 1;

  const handleClose = () => {
    setMessage("");
    onClose();
  };

  const handleSend = async () => {
    if (!message.trim() || isSendingSms) return;
    try {
      await sendSms({ studentIds: [student.uid], text: message.trim() }).unwrap();
      toast.success("SMS sent");
      handleClose();
    } catch (err) {
      const detail = extractApiError(err);
      toast.error(detail ? `Failed to send SMS: ${detail}` : "Failed to send SMS");
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={handleClose}
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
        <IconButton size="small" onClick={handleClose} sx={{ color: "#9ca3af" }}>
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
          disabled={isSendingSms}
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
          onClick={handleSend}
          disabled={!message.trim() || isSendingSms}
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
          {isSendingSms ? "Sending…" : "Send SMS"}
        </Button>
      </div>
    </Drawer>
  );
};

/* ─── DELETE CONFIRM DIALOG ──────────────────────────── */
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
  onArchive,
  onSms,
  onAddToGroup,
  onOpenAddToGroupMenu,
  onAddPayment,
  onOpenAddPaymentMenu,
  canAddPayment,
}: {
  student: FlatStudent;
  onEdit: () => void;
  onArchive: () => void;
  onSms: () => void;
  onAddToGroup: () => void;
  onOpenAddToGroupMenu: (event: React.MouseEvent<HTMLElement>) => void;
  onAddPayment: () => void;
  onOpenAddPaymentMenu: (event: React.MouseEvent<HTMLElement>) => void;
  canAddPayment: boolean;
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
      <Tooltip title="Archive">
        <IconButton
          size="small"
          onClick={onArchive}
          sx={{ border: "1.5px solid #ef4444", color: "#ef4444" }}
        >
          <FiArchive size={14} />
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
      {canAddPayment && (
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
      )}
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
// `membership` comes from GET /students/{id}/groups — real per-membership
// data (status, dates, teachers, course), not the mock TEACHERS_DATA lookup
// this card used to fall back to (which meant Course/Room/Price/Teacher
// always showed placeholder values regardless of the student's real groups).
// Layout follows the reference design: chip = the group's own name (this
// backend names groups things like "IT Friends"/"Deep Science" — confirmed
// by those exact strings showing up as group badges elsewhere, e.g. the
// payments table's group tag), heading = the course name, status is shown
// as colored text next to the date range rather than as the chip.
const GROUP_STATUS_TEXT: Record<string, { color: string; fallback: string }> = {
  ACTIVE:    { color: "#1d4ed8", fallback: "Active (Learns)" },
  PROBATION: { color: "#92400e", fallback: "Trial" },
  FROZEN:    { color: "#1d4ed8", fallback: "Frozen (paused)" },
  INACTIVE:  { color: "#6b7280", fallback: "Inactive" },
  DELETED:   { color: "#6b7280", fallback: "Removed" },
};

const formatMembershipDate = (iso: string | null) => (iso ? formatDate(iso.slice(0, 10)) : "—");

// Same EVEN/ODD -> "Even days"/"Odd days" convention Groups.tsx already uses
// for this field, so the wording matches the rest of the app.
const formatDaysType = (daysType: string | undefined | null) =>
  daysType === "EVEN" ? "Even days" : daysType === "ODD" ? "Odd days" : (daysType || "—");

const moneyOrDash = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : `${n.toLocaleString("ru-RU")} UZS`;

// Course price on Group/GroupCourse is serialized as a decimal.js-style
// object ({s,e,d}) on read (same as financeApi/studentsApi's own asMoney) —
// membership.customPrice (StudentGroupMembership) is already a plain number.
const asCoursePrice = (raw: unknown): number | null => {
  if (raw && typeof raw === "object" && Array.isArray((raw as Record<string, unknown>).d)) {
    return Number((raw as { d: unknown[] }).d[0]) || 0;
  }
  return typeof raw === "number" ? raw : null;
};

// Total lessons / present / absent for this ONE student in this ONE group.
// No endpoint returns a per-student-per-group attendance summary directly —
// this is the closest available data (GET /attendances/report, filtered to
// the group, matched by studentId client-side from its per-date rows), so
// it's best-effort and capped by the query's own limit rather than a
// guaranteed-complete count for a very long-running group.
const useGroupAttendanceSummary = (groupId: string | undefined, studentId: string) => {
  const { data, isFetching } = useAttendanceReportQuery(
    { groupId: groupId ?? "", limit: 500 },
    { skip: !groupId }
  );
  return useMemo(() => {
    const rows = (data?.rows ?? []).filter((r) => r.studentId === studentId);
    const total = rows.length;
    const present = rows.filter((r) => r.attendanceStatus === "PRESENT").length;
    const absent = rows.filter((r) => r.attendanceStatus === "ABSENT").length;
    return { total, present, absent, other: total - present - absent, isFetching };
  }, [data, studentId, isFetching]);
};

const AttendanceLegendRow = ({ color, label, value }: { color: string; label: string; value: number }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6b7280" }}>
    <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
    {label}: <strong style={{ color: "#111827" }}>{value}</strong>
  </div>
);

const AttendanceSummary = ({ groupId, studentId }: { groupId: string | undefined; studentId: string }) => {
  const { total, present, absent, other, isFetching } = useGroupAttendanceSummary(groupId, studentId);
  if (isFetching || total === 0) return null;

  const presentDeg = (present / total) * 360;
  const absentDeg = (absent / total) * 360;
  const pct = Math.round((present / total) * 100);
  const gradient = `conic-gradient(#22c55e 0deg ${presentDeg}deg, #ef4444 ${presentDeg}deg ${presentDeg + absentDeg}deg, #d1d5db ${presentDeg + absentDeg}deg 360deg)`;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 60, height: 60, borderRadius: "50%", background: gradient, flexShrink: 0 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            Total lessons: <strong style={{ color: "#111827" }}>{total}</strong>
          </div>
          <AttendanceLegendRow color="#22c55e" label="Was" value={present} />
          <AttendanceLegendRow color="#ef4444" label="Not" value={absent} />
          <AttendanceLegendRow color="#d1d5db" label="Not attended" value={other} />
        </div>
      </div>
      <div style={{ fontSize: 13, color: "#6b7280", marginTop: 8 }}>
        Attendance: <strong style={{ color: "#111827" }}>{pct}%</strong>
      </div>
    </div>
  );
};

const GroupCard = ({
  membership, group, studentId, branchName, onOpenGroup, onPauseOrPlay, onArchive,
}: {
  membership: StudentGroupMembership;
  // The group's schedule/room/course price aren't returned by GET
  // /students/{id}/groups (only status/dates/teachers/customPrice are) —
  // this comes from GET /groups (already fetched for the "Add to group"
  // picker), matched by real group id via GET /student-groups?studentId=.
  // It's undefined only if that cross-reference fails to find the group
  // (e.g. it was deleted), in which case schedule/branch/open-group link
  // and the course base price (for the discount note) are simply omitted.
  group?: Group;
  // Real backend student id (student.uid), for the attendance lookup.
  studentId: string;
  branchName?: string | null;
  onOpenGroup?: () => void;
  // Freeze (ACTIVE/PROBATION -> FROZEN) or unfreeze (FROZEN -> ACTIVE) this
  // one membership — undefined (button hidden) once it's already
  // INACTIVE/DELETED, since there's nothing left to pause.
  onPauseOrPlay?: () => void;
  // Ends this one membership (PATCH /student-groups/{id}/status -> INACTIVE),
  // same action SingleGroup's "Remove from group" performs at the
  // per-membership level.
  onArchive?: () => void;
}) => {
  const { t } = useTranslation();
  const statusMeta = GROUP_STATUS_TEXT[membership.status] ?? { color: "#6b7280", fallback: membership.status };
  const statusLabel =
    membership.status === "ACTIVE" ? t("singleGroup.studentHoverCard.activeLearns", { defaultValue: statusMeta.fallback }) :
    membership.status === "FROZEN" ? t("singleGroup.studentHoverCard.frozenPaused", { defaultValue: statusMeta.fallback }) :
    statusMeta.fallback;
  const isFrozen = membership.status === "FROZEN";
  const isEnded = membership.status === "INACTIVE" || membership.status === "DELETED";
  const teacherNames = membership.teachers.map((teacher) => teacher.name).join(", ") || "—";
  const schedule = group ? `${formatDaysType(group.daysType)}${group.time ? ` • ${group.time}` : ""}` : null;

  const basePrice = group?.course?.price ? asCoursePrice(group.course.price) : null;
  const customPrice = membership.customPrice;
  const priceValue = customPrice ?? basePrice;
  const priceNote =
    customPrice != null && basePrice != null && customPrice !== basePrice
      ? (customPrice < basePrice ? "(Individual discount)" : "(Individual price)")
      : null;

  return (
    <div
      onClick={onOpenGroup}
      style={{
        background: "white",
        border: "1px solid #eaecf0",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        cursor: onOpenGroup ? "pointer" : "default",
      }}
      onMouseEnter={(e) => { if (onOpenGroup) e.currentTarget.style.borderColor = "#93c5fd"; }}
      onMouseLeave={(e) => { if (onOpenGroup) e.currentTarget.style.borderColor = "#eaecf0"; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <Chip
          label={membership.name}
          size="small"
          sx={{ fontSize: 11, height: 22, bgcolor: "#eff6ff", color: "#1d4ed8", fontWeight: 600 }}
        />
        <div style={{ fontSize: 12, color: "#6b7280", textAlign: "right" }}>
          <div>{formatMembershipDate(membership.trainingStart)} — {formatMembershipDate(membership.trainingEnd)}</div>
          {schedule && <div style={{ marginTop: 2 }}>{schedule}{group?.room?.name ? ` • ${group.room.name}` : ""}</div>}
          <div style={{ marginTop: 2, fontWeight: 600, color: statusMeta.color }}>{statusLabel}</div>
        </div>
      </div>

      <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>{membership.courseName ?? "—"}</div>
      <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>{teacherNames}</div>
      {branchName && <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{branchName}</div>}

      <hr style={{ border: "none", borderTop: "1px solid #f3f4f6", margin: "12px 0" }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          {t("singleGroup.studentHoverCard.addedAt")}: <strong style={{ color: "#111827" }}>{formatMembershipDate(membership.joinedAt)}</strong>
        </div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          {t("singleGroup.studentHoverCard.activatedAt")}: <strong style={{ color: "#111827" }}>{formatMembershipDate(membership.paymentStartDate)}</strong>
        </div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          Price for student: <strong style={{ color: "#111827" }}>{moneyOrDash(priceValue)}</strong>
          {priceNote && <span style={{ color: "#9ca3af" }}> {priceNote}</span>}
        </div>
      </div>

      <hr style={{ border: "none", borderTop: "1px solid #f3f4f6", margin: "12px 0" }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <AttendanceSummary groupId={group?.id} studentId={studentId} />
        </div>
        {!isEnded && (
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
            <Tooltip title={isFrozen ? "Activate" : "Freeze"}>
              <IconButton
                size="small"
                onClick={onPauseOrPlay}
                sx={{
                  border: "1.5px solid #06b6d4",
                  color: "#06b6d4",
                  width: 36,
                  height: 36,
                }}
              >
                {isFrozen ? <FiPlay size={15} /> : <FiPause size={15} />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Remove from group">
              <IconButton
                size="small"
                onClick={onArchive}
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
        )}
      </div>
    </div>
  );
};

/* ─── OUTSTANDING BALANCE ────────────────────────────── */
// student.balance (StudentDetail — the same authoritative figure the
// sidebar's BalanceBadge already shows) is the single source of truth for
// whether the student owes money, kept consistent with the sidebar rather
// than re-deriving a second balance from totalCharged/totalPaid that could
// disagree with it. totalCharged/totalPaid (GET /students/{id}/payments'
// own `summary` block) are shown purely as a breakdown alongside it, never
// as an independent balance calculation — avoids the duplicate-counting/
// conflicting-numbers trap the task explicitly warns about.
const OutstandingBalanceCard = ({
  balance, summary, isLoading, onPrintNotice,
}: {
  balance: number;
  summary?: StudentPaymentsSummary;
  isLoading?: boolean;
  onPrintNotice: () => void;
}) => {
  if (isLoading) return null;

  const isDebt = balance < 0;
  const isCredit = balance > 0;
  const hasBreakdown = summary && (summary.totalCharged > 0 || summary.totalPaid > 0);

  return (
    <div style={{ margin: "20px 0 12px" }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: "#111827", marginBottom: 12 }}>
        Balance
      </div>
      <div
        style={{
          background: isDebt ? "#fef2f2" : "#f0fdf4",
          border: `1px solid ${isDebt ? "#fecaca" : "#bbf7d0"}`,
          borderRadius: 12,
          padding: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: isDebt ? "#b91c1c" : "#15803d", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>
            {isDebt ? "Outstanding balance" : isCredit ? "Credit balance" : "Fully paid"}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: isDebt ? "#dc2626" : "#16a34a", marginTop: 4 }}>
            {moneyOrDash(Math.abs(balance))}
          </div>
          {hasBreakdown && (
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
              Total due: <strong style={{ color: "#111827" }}>{moneyOrDash(summary!.totalCharged)}</strong>
              {"   ·   "}Already paid: <strong style={{ color: "#111827" }}>{moneyOrDash(summary!.totalPaid)}</strong>
            </div>
          )}
        </div>
        {isDebt && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<FiPrinter size={13} />}
            onClick={onPrintNotice}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              fontSize: 12,
              borderRadius: 999,
              borderColor: "#ef4444",
              color: "#dc2626",
              "&:hover": { borderColor: "#dc2626", bgcolor: "#fef2f2" },
            }}
          >
            Print Payment Notice
          </Button>
        )}
      </div>
    </div>
  );
};

/* ─── MONTHLY BALANCE ────────────────────────────────── */
// Backed by GET /students/{id}/finance-history — confirmed live to be a
// per-month ledger of `debts`/`payments` arrays plus running totals (see
// StudentFinanceHistoryEntry's doc comment in studentsApi/types.d.ts) —
// this strip summarizes each month's net (monthBalance); the combined
// system/payment transaction list below it is built from the same data.
type MonthlyBalanceEntry = { key: string; label: string; amount: number; color: "green" | "red" | "yellow" };

const MONTH_BALANCE_COLORS: Record<MonthlyBalanceEntry["color"], { border: string; text: string }> = {
  green:  { border: "#34d399", text: "#16a34a" },
  red:    { border: "#f87171", text: "#ef4444" },
  yellow: { border: "#fbbf24", text: "#b45309" },
};

const MonthlyBalance = ({
  rows, isLoading,
}: {
  rows: StudentFinanceHistoryEntry[];
  isLoading?: boolean;
}) => {
  const entries: MonthlyBalanceEntry[] = useMemo(
    () => rows.map((r, i) => ({
      key: `${r.month}-${i}`,
      label: r.month,
      amount: r.monthBalance,
      color: r.totalDebt === 0 ? "yellow" : r.monthBalance >= 0 ? "green" : "red",
    })),
    [rows]
  );

  if (isLoading) return null;
  if (entries.length === 0) return null;

  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 600, color: "#111827", margin: "20px 0 12px" }}>
        Monthly balance status
      </div>
      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6 }}>
        {entries.map((entry) => {
          const c = MONTH_BALANCE_COLORS[entry.color];
          return (
            <div
              key={entry.key}
              style={{
                border: `2px solid ${c.border}`,
                borderRadius: 12,
                padding: "12px 20px",
                minWidth: 120,
                flexShrink: 0,
              }}
            >
              <div style={{ fontSize: 11, color: c.border, fontWeight: 500, marginBottom: 4 }}>
                {entry.label}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: c.text }}>
                {entry.amount.toLocaleString("ru-RU")}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─── TRANSACTIONS TABLE (system charges + real payments, combined) ──── */
// Built from GET /students/{id}/finance-history's debts+payments (system
// monthly charges vs. real payments — see normalizeFinanceTransactions in
// studentsApi.tsx), matching the reference design's "system"/"payment" type
// badges. Only PAYMENT rows (which carry a real paymentId) get Print/Edit/
// Remove actions — a DEBT row is a computed monthly charge with no backing
// record to act on.
const TX_TYPE_BADGE: Record<"DEBT" | "PAYMENT", { label: string; bg: string; color: string }> = {
  PAYMENT: { label: "payment", bg: "#dcfce7", color: "#15803d" },
  DEBT:    { label: "system",  bg: "#374151", color: "#ffffff" },
};

const TransactionsTable = ({
  transactions,
  studentId,
  studentName,
  isLoading,
  isError,
}: {
  transactions: StudentFinanceTransaction[];
  // GET /students/{id}/payments doesn't embed the student on each row
  // (redundant — you already know which student you asked about), so the
  // transaction rows' own studentId/studentName are usually empty; this
  // page always renders for one already-known student, so its real
  // identity is passed down directly for the Edit flow instead.
  studentId: string;
  studentName: string;
  isLoading?: boolean;
  isError?: boolean;
}) => {
  const toast = useToast();
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<{ el: HTMLElement; tx: StudentFinanceTransaction } | null>(null);
  const [editTarget, setEditTarget] = useState<StudentFinanceTransaction | null>(null);
  // DELETE /finance/payments/{id} — the backend marks the payment REFUNDED
  // (not a hard delete, per financeApi's own comment on this mutation).
  const [deletePayment, { isLoading: isRemoving }] = useDeletePaymentMutation();
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const confirmRemove = async () => {
    if (!removeTarget) return;
    setRemoveError(null);
    try {
      await deletePayment(removeTarget).unwrap();
      toast.success("Payment removed");
      setRemoveTarget(null);
    } catch (err) {
      const detail = extractApiError(err);
      const message = detail ? `Failed to remove the payment: ${detail}` : "Failed to remove the payment";
      setRemoveError(message);
      toast.error(message);
    }
  };

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
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
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
          {transactions.map((tx) => {
            const isDebt = tx.type === "DEBT";
            // A payment whose own status is REFUNDED/CANCELLED/etc is no
            // longer real money received — shown as its own status instead
            // of the green "payment" badge, muted like a DEBT row, and with
            // no Print/Edit/Remove actions, so a voided payment can never
            // produce a "paid" receipt.
            const isVoidedPayment = tx.type === "PAYMENT" && !isCompletedPaymentStatus(tx.paymentStatus);
            const badge = isVoidedPayment
              ? { label: (tx.paymentStatus ?? "").toLowerCase(), bg: "#fee2e2", color: "#b91c1c" }
              : TX_TYPE_BADGE[tx.type];
            return (
              <tr key={tx.key} style={{ borderBottom: "1px solid #f9fafb" }}>
                <td style={{ padding: "14px 16px", fontSize: 13, color: "#374151", whiteSpace: "nowrap" }}>
                  {formatDate((tx.date ?? "").slice(0, 10))}
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <span style={{ background: badge.bg, color: badge.color, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
                    {badge.label}
                  </span>
                </td>
                <td style={{ padding: "14px 16px", fontWeight: 600, color: isDebt || isVoidedPayment ? "#6b7280" : "#16a34a", whiteSpace: "nowrap" }}>
                  {isDebt ? "−" : isVoidedPayment ? "" : "+"}{tx.amount.toLocaleString("ru-RU")} UZS
                </td>
                <td style={{ padding: "14px 16px", fontSize: 13, color: "#374151" }}>
                  {tx.groupName && (
                    <span style={{ display: "inline-block", background: "#f3f4f6", color: "#374151", borderRadius: 4, padding: "1px 8px", fontSize: 11, fontWeight: 600, marginRight: 6 }}>
                      {tx.groupName}
                    </span>
                  )}
                  <span>{tx.methodOrDescription || "—"}</span>
                  {tx.notes && (
                    <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{tx.notes}</div>
                  )}
                </td>
                <td style={{ padding: "14px 16px", fontSize: 13 }}>
                  <div style={{ fontWeight: 500, color: "#111827" }}>{tx.author || "—"}</div>
                  {tx.createdAt && (
                    <div style={{ fontSize: 12, color: "#9ca3af" }}>{formatDate(tx.createdAt.slice(0, 10))}</div>
                  )}
                </td>
                <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                  {!isDebt && !isVoidedPayment && tx.paymentId ? (
                    <>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<FiPrinter size={12} />}
                        onClick={() => setReceiptId(tx.paymentId)}
                        sx={{
                          textTransform: "none",
                          fontSize: 12,
                          borderColor: "#d1d5db",
                          color: "#374151",
                          borderTopRightRadius: 0,
                          borderBottomRightRadius: 0,
                          borderRight: "none",
                        }}
                      >
                        Print out
                      </Button>
                      <IconButton
                        size="small"
                        onClick={(e) => setMenuFor({ el: e.currentTarget, tx })}
                        sx={{
                          border: "1px solid #d1d5db",
                          borderLeft: "none",
                          borderTopLeftRadius: 0,
                          borderBottomLeftRadius: 0,
                          borderTopRightRadius: "4px",
                          borderBottomRightRadius: "4px",
                          width: 30,
                          height: 30,
                        }}
                      >
                        <FiChevronDown size={14} />
                      </IconButton>
                    </>
                  ) : (
                    <span style={{ fontSize: 12, color: "#9ca3af" }}>—</span>
                  )}
                </td>
              </tr>
            );
          })}
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
          {!isLoading && !isError && transactions.length === 0 && (
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

    <Menu
      anchorEl={menuFor?.el ?? null}
      open={Boolean(menuFor)}
      onClose={() => setMenuFor(null)}
      transformOrigin={{ horizontal: "right", vertical: "top" }}
      anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
    >
      <MenuItem
        onClick={() => { if (menuFor) setEditTarget(menuFor.tx); setMenuFor(null); }}
        sx={{ fontSize: 13 }}
      >
        <FiEdit2 size={13} style={{ marginRight: 8 }} /> Edit
      </MenuItem>
      <MenuItem
        onClick={() => { if (menuFor?.tx.paymentId) { setRemoveError(null); setRemoveTarget(menuFor.tx.paymentId); } setMenuFor(null); }}
        sx={{ fontSize: 13, color: "#ef4444" }}
      >
        Remove
      </MenuItem>
    </Menu>

    <Dialog open={Boolean(removeTarget)} onClose={() => setRemoveTarget(null)} PaperProps={{ sx: { borderRadius: 3, width: 380 } }}>
      <DialogTitle sx={{ fontWeight: 600 }}>Remove payment</DialogTitle>
      <DialogContent>
        <div style={{ fontSize: 14, color: "#6b7280" }}>
          Are you sure you want to remove this payment? It will be marked as refunded and removed from the student's balance.
        </div>
        {removeError && <div style={{ marginTop: 12, fontSize: 13, color: "#ef4444" }}>{removeError}</div>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={() => setRemoveTarget(null)} disabled={isRemoving} sx={{ color: "#6b7280", textTransform: "none" }}>
          Cancel
        </Button>
        <Button variant="contained" color="error" disabled={isRemoving} onClick={confirmRemove} sx={{ borderRadius: 2, textTransform: "none" }}>
          {isRemoving ? "…" : "Remove"}
        </Button>
      </DialogActions>
    </Dialog>

    <AddPayment
      open={Boolean(editTarget)}
      onClose={() => setEditTarget(null)}
      editPayment={
        editTarget?.paymentId
          ? {
              id: editTarget.paymentId,
              amount: editTarget.amount,
              paymentMethodId: editTarget.paymentMethodId ?? "",
              date: (editTarget.date ?? "").slice(0, 10) || null,
              notes: editTarget.notes,
              studentId,
              studentName,
            }
          : null
      }
    />
  </div>
  );
};

/* ─── SIMPLE HISTORY / COMMENTS / SMS LIST ───────────── */
// Shared renderer for the Comments/SMS/History tabs — same envelope
// (id/primary text/secondary line/date), just fed by whichever endpoint is
// active. Keeps these three tabs, which previously showed a static "No data
// available" with nothing wired up at all, visually consistent with each
// other.
const SimpleHistoryList = ({
  items, isLoading, isError, emptyLabel,
}: {
  items: { id: string; primary: string; secondary?: string | null; date: string }[];
  isLoading?: boolean;
  isError?: boolean;
  emptyLabel: string;
}) => {
  if (isLoading) {
    return <div style={{ padding: 32, textAlign: "center", color: "#9ca3af", fontSize: 14 }}>Loading...</div>;
  }
  if (isError) {
    return <div style={{ padding: 32, textAlign: "center", color: "#ef4444", fontSize: 14 }}>Failed to load</div>;
  }
  if (items.length === 0) {
    return <div style={{ padding: 32, textAlign: "center", color: "#9ca3af", fontSize: 14 }}>{emptyLabel}</div>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((item) => (
        <div
          key={item.id}
          style={{ background: "white", border: "1px solid #eaecf0", borderRadius: 10, padding: "12px 16px" }}
        >
          <div style={{ fontSize: 13, color: "#111827" }}>{item.primary || "—"}</div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 12, color: "#9ca3af" }}>
            <span>{item.secondary || "—"}</span>
            <span>{item.date ? formatDate(item.date.slice(0, 10)) : ""}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ─── MAIN COMPONENT ─────────────────────────────────── */
export const StudentProfile = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { hasPermission } = useAuth();

  // ✅ uid (string) — real API id orqali topiladi, navigate('/students/:id') bilan mos
  const { data, isLoading } = useStudentByIdQuery(id ?? "", { skip: !id });
  const student = data ? mapApiStudentToFlat(data.data) : undefined;
  const { data: groupMemberships } = useStudentGroupMembershipsQuery(id ?? "", { skip: !id });
  // /students/{id}/groups (above) doesn't return the group's own id, only
  // the membership id — /student-groups?studentId= (groupsApi) is the same
  // underlying membership resource keyed by that same id, but does carry
  // groupId, so it's used here purely to map membership -> real group id
  // (for the "open group" link and to look up schedule/room from groupsData
  // below, neither of which /students/{id}/groups exposes either). limit
  // defaults to 10 — a student with more group-membership history than
  // that (frozen/archived groups included) would silently lose the
  // mapping for the rest, making those group cards not open on click. A
  // high limit here mirrors SingleGroup's own studentGroups fetch.
  const { data: studentGroupRecords } = useStudentGroupsQuery({ studentId: id ?? "", limit: 500 }, { skip: !id });
  const groupIdByMembershipId = useMemo(() => {
    const map = new Map<string, string>();
    (studentGroupRecords?.rows ?? []).forEach((r) => map.set(r.id, r.groupId));
    return map;
  }, [studentGroupRecords]);

  const [updateStudent, { isLoading: isSavingStudent }] = useUpdateStudentMutation();
  const [toggleStudentStatus, { isLoading: isArchivingStudent }] = useToggleStudentStatusMutation();
  const [addStudentToGroup, { isLoading: isAddingToGroup }] = useAddStudentToGroupMutation();
  const [transferStudentBranch, { isLoading: isMovingBranch }] = useTransferStudentBranchMutation();
  const [freezeStudentGroup, { isLoading: isFreezingGroup }] = useFreezeStudentGroupMutation();
  const [unfreezeStudentGroup, { isLoading: isUnfreezingGroup }] = useUnfreezeStudentGroupMutation();
  const [updateStudentGroupStatus, { isLoading: isArchivingGroup }] = useUpdateStudentGroupStatusMutation();

  const { data: groupsData } = useAllGroupsQuery({ page: 1, limit: 100 });
  const groupsById = useMemo(() => {
    const map = new Map<string, Group>();
    (groupsData?.data ?? []).forEach((g) => map.set(g.id, g));
    return map;
  }, [groupsData]);
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
  // Group/GroupDetail carries no branch field of its own — a membership's
  // branch is derived from its course's branchId (every course belongs to
  // one branch), cross-referenced against the same branches list already
  // fetched above for the "Move to another branch" picker.
  const branchNameById = useMemo(() => {
    const map = new Map<string, string>();
    (branchesData?.data ?? []).forEach((b) => map.set(b.id, b.name));
    return map;
  }, [branchesData]);

  // GET /students/{id}/payments — the student's own payment registry,
  // scoped server-side by id (replaces the previous approach of name-
  // searching the whole-branch GET /finance/payments registry client-side,
  // which risked showing another same-named student's payments).
  const {
    data: studentPaymentsData, isFetching: isPaymentsLoading, isError: isPaymentsError,
  } = useStudentPaymentsQuery({ id: student?.uid ?? "", page: 1, limit: 50 }, { skip: !student });
  const payments = useMemo(() => studentPaymentsData?.rows ?? [], [studentPaymentsData]);

  const { data: financeHistoryData, isFetching: isFinanceHistoryLoading } = useStudentFinanceHistoryQuery(
    student?.uid ?? "", { skip: !student }
  );
  // Flattens finance-history's per-month debts (system charges)/payments
  // into one chronological list, matched against the real payments
  // registry so PAYMENT rows carry a real id for Print/Edit/Remove.
  const transactions = useMemo(
    () => normalizeFinanceTransactions(financeHistoryData ?? [], payments),
    [financeHistoryData, payments]
  );

  const [saveError, setSaveError] = useState<string | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const toast = useToast();

  const [activeTab, setActiveTab] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [smsOpen, setSmsOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [addToGroupOpen, setAddToGroupOpen] = useState(false);
  const [moveBranchOpen, setMoveBranchOpen] = useState(false);
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);
  const [debtorReceiptOpen, setDebtorReceiptOpen] = useState(false);
  const [groupMenuAnchor, setGroupMenuAnchor] = useState<null | HTMLElement>(null);
  const [paymentMenuAnchor, setPaymentMenuAnchor] = useState<null | HTMLElement>(null);
  const [freezeTarget, setFreezeTarget] = useState<StudentGroupMembership | null>(null);
  const [activateTarget, setActivateTarget] = useState<StudentGroupMembership | null>(null);
  const [archiveGroupTarget, setArchiveGroupTarget] = useState<StudentGroupMembership | null>(null);

  // Tab content for Comments/SMS/History is only fetched once its tab is
  // actually opened — no point firing three extra requests on every profile
  // load for tabs the staff member may never click.
  const { data: commentsData, isFetching: isCommentsLoading, isError: isCommentsError } = useStudentCommentsQuery(
    student?.uid ?? "", { skip: !student || activeTab !== 1 }
  );
  const { data: smsData, isFetching: isSmsLoading, isError: isSmsError } = useStudentSmsHistoryQuery(
    { id: student?.uid ?? "", page: 1, limit: 50 }, { skip: !student || activeTab !== 3 }
  );
  const { data: historyData, isFetching: isHistoryLoading, isError: isHistoryError } = useStudentHistoryQuery(
    student?.uid ?? "", { skip: !student || activeTab !== 4 }
  );

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

  // The only "remove student" action on this page: PATCH
  // /students/{id}/toggle-status flips the status to INACTIVE without
  // deleting the record. A real DELETE /students/{id} isn't exposed here —
  // it's the Archive page's permanent-delete action, since the backend
  // rejects it outright while the student still has group memberships.
  const handleArchive = async () => {
    setArchiveError(null);
    try {
      await toggleStudentStatus(student.uid).unwrap();
      toast.success("Student moved to archive");
      setArchiveOpen(false);
      navigate(-1);
    } catch (err) {
      const detail = extractApiError(err);
      const message = detail ? `Failed to archive the student: ${detail}` : "Failed to archive the student";
      setArchiveError(message);
      toast.error(message);
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

  // POST /student-groups/{id}/freeze — same call SingleGroup's FreezeModal
  // makes, just targeting a membership reached from the student's own
  // profile instead of that group's roster.
  const handleFreezeGroupConfirm = async (freezeData: { reason: string; startDate: string }) => {
    if (!freezeTarget) return;
    try {
      await freezeStudentGroup({
        id: freezeTarget.id,
        startDate: freezeData.startDate,
        reason: freezeData.reason.trim() || undefined,
      }).unwrap();
      toast.success("Group membership frozen");
      setFreezeTarget(null);
    } catch (err) {
      const detail = extractApiError(err);
      toast.error(detail ? `Failed to freeze: ${detail}` : "Failed to freeze");
    }
  };

  const handleUnfreezeConfirm = async () => {
    if (!activateTarget) return;
    try {
      await unfreezeStudentGroup(activateTarget.id).unwrap();
      toast.success("Group membership activated");
      setActivateTarget(null);
    } catch (err) {
      const detail = extractApiError(err);
      toast.error(detail ? `Failed to activate: ${detail}` : "Failed to activate");
    }
  };

  // PATCH /student-groups/{id}/status -> INACTIVE — ends just this one
  // membership, the per-group equivalent of SingleGroup's "Remove from
  // group" (which additionally archives the whole account; this action is
  // scoped to a single group card here, so it doesn't).
  const handleArchiveGroupConfirm = async () => {
    if (!archiveGroupTarget) return;
    try {
      await updateStudentGroupStatus({ id: archiveGroupTarget.id, status: "INACTIVE" }).unwrap();
      toast.success("Removed from the group");
      setArchiveGroupTarget(null);
    } catch (err) {
      const detail = extractApiError(err);
      toast.error(detail ? `Failed to remove from the group: ${detail}` : "Failed to remove from the group");
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

      <Box sx={{ maxWidth: 1200, display: "flex", flexDirection: { xs: "column", lg: "row" }, gap: 3, alignItems: "flex-start" }}>
        {/* Left sidebar */}
        <Box sx={{ width: { xs: "100%", lg: 320 }, flexShrink: 0 }}>
          <SideCard
            student={student}
            onEdit={() => setEditOpen(true)}
            onArchive={() => { setArchiveError(null); setArchiveOpen(true); }}
            onSms={() => setSmsOpen(true)}
            onAddToGroup={() => setAddToGroupOpen(true)}
            onOpenAddToGroupMenu={(e) => setGroupMenuAnchor(e.currentTarget)}
            onAddPayment={() => setAddPaymentOpen(true)}
            onOpenAddPaymentMenu={(e) => setPaymentMenuAnchor(e.currentTarget)}
            canAddPayment={hasPermission("PAYMENTS", "CREATE")}
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
                  {(groupMemberships ?? []).length > 0 ? (
                    (groupMemberships ?? []).map((m) => {
                      const groupId = groupIdByMembershipId.get(m.id);
                      const g = groupId ? groupsById.get(groupId) : undefined;
                      const branchId = g?.course?.branchId ?? g?.room?.branchId ?? null;
                      return (
                        <GroupCard
                          key={m.id}
                          membership={m}
                          group={g}
                          studentId={student.uid}
                          branchName={branchId ? branchNameById.get(branchId) ?? null : null}
                          onOpenGroup={groupId ? () => navigate(`/groups/${groupId}`) : undefined}
                          onPauseOrPlay={() => (m.status === "FROZEN" ? setActivateTarget(m) : setFreezeTarget(m))}
                          onArchive={() => setArchiveGroupTarget(m)}
                        />
                      );
                    })
                  ) : (
                    <div style={{ fontSize: 13, color: "#9ca3af", padding: "8px 0 16px" }}>
                      No groups yet
                    </div>
                  )}
                  <OutstandingBalanceCard
                    balance={student.balance ?? 0}
                    summary={studentPaymentsData?.summary}
                    isLoading={isPaymentsLoading}
                    onPrintNotice={() => setDebtorReceiptOpen(true)}
                  />
                  <MonthlyBalance rows={financeHistoryData ?? []} isLoading={isFinanceHistoryLoading} />
                  <TransactionsTable
                    transactions={transactions}
                    studentId={student.uid}
                    studentName={student.name}
                    isLoading={isPaymentsLoading || isFinanceHistoryLoading}
                    isError={isPaymentsError}
                  />
                </>
              ) : activeTab === 1 ? (
                <SimpleHistoryList
                  isLoading={isCommentsLoading}
                  isError={isCommentsError}
                  emptyLabel="No comments yet"
                  items={(commentsData ?? []).map((c) => ({ id: c.id, primary: c.text, secondary: c.author, date: c.createdAt }))}
                />
              ) : activeTab === 3 ? (
                <SimpleHistoryList
                  isLoading={isSmsLoading}
                  isError={isSmsError}
                  emptyLabel="No SMS sent yet"
                  items={(smsData ?? []).map((s) => ({ id: s.id, primary: s.text, secondary: s.status, date: s.createdAt }))}
                />
              ) : activeTab === 4 ? (
                <SimpleHistoryList
                  isLoading={isHistoryLoading}
                  isError={isHistoryError}
                  emptyLabel="No history yet"
                  items={(historyData ?? []).map((h) => ({ id: h.id, primary: h.detail || h.type, secondary: h.actor, date: h.createdAt }))}
                />
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


      <Dialog
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Archive student</DialogTitle>
        <DialogContent>
          <div style={{ fontSize: 14, color: "#6b7280" }}>
            Move {student.name} to the archive? They will stay in the database, only their status becomes "Inactive" — they can be reactivated at any time.
          </div>
          {archiveError && (
            <div style={{ marginTop: 12, fontSize: 13, color: "#ef4444" }}>{archiveError}</div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setArchiveOpen(false)} disabled={isArchivingStudent} sx={{ color: "#6b7280" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={isArchivingStudent}
            onClick={handleArchive}
            sx={{ borderRadius: 2, bgcolor: "#5c7fa3", "&:hover": { bgcolor: "#4a6a8a" } }}
          >
            Archive
          </Button>
        </DialogActions>
      </Dialog>

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

      <DebtorReceiptModal
        open={debtorReceiptOpen}
        onClose={() => setDebtorReceiptOpen(false)}
        studentId={student.uid}
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

      <FreezeModal
        open={Boolean(freezeTarget)}
        onClose={() => setFreezeTarget(null)}
        student={null}
        onConfirm={handleFreezeGroupConfirm}
        isSaving={isFreezingGroup}
      />

      <ActivateModal
        open={Boolean(activateTarget)}
        onClose={() => setActivateTarget(null)}
        onConfirm={handleUnfreezeConfirm}
        isSaving={isUnfreezingGroup}
      />

      <Dialog
        open={Boolean(archiveGroupTarget)}
        onClose={() => setArchiveGroupTarget(null)}
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Remove from group</DialogTitle>
        <DialogContent>
          <div style={{ fontSize: 14, color: "#6b7280" }}>
            Remove {student.name} from {archiveGroupTarget?.name}? This only ends this one
            membership — the student account itself stays active.
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setArchiveGroupTarget(null)} disabled={isArchivingGroup} sx={{ color: "#6b7280" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={isArchivingGroup}
            onClick={handleArchiveGroupConfirm}
            sx={{ borderRadius: 2 }}
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};