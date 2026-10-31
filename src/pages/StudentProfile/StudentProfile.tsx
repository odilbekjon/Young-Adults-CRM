// src/pages/StudentProfile.tsx
import { useState, useEffect, useMemo } from "react";
import {
  FiEdit2, FiMail, FiFlag,
  FiChevronDown, FiUsers, FiDollarSign,
  FiCalendar, FiGitBranch, FiPause, FiPlay, FiUser, FiX,
  FiArchive, FiRefreshCw,
} from "react-icons/fi";
import { IoArrowBack } from "react-icons/io5";
import {
  Avatar, Chip, Tab, Tabs, Button, IconButton, Tooltip, Box,
  Drawer, Dialog, DialogTitle, DialogContent,
  TextField, Radio, RadioGroup, FormControlLabel,
  InputAdornment, Menu, MenuItem,
} from "@mui/material";
import { useTranslation } from "react-i18next";

import { FlatStudent, mapApiStudentToFlat, formatDate, formatLongDate } from "../../constants/FlatStudents";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { decimalToNumber } from "../../utils/decimal";
import { useArchiveStudent } from "../../hooks/useArchiveStudent";
import {
  useStudentByIdQuery,
  useStudentForEditQuery,
  useStudentGroupMembershipsQuery,
  useUpdateStudentMutation,
  useTransferStudentBranchMutation,
  useStudentCommentsQuery,
  useCreateStudentCommentMutation,
  useStudentSmsHistoryQuery,
} from "../../app/api/studentsApi";
import type {
  StudentGender, StudentGroupMembership,
} from "../../app/api/studentsApi/types";
import {
  useAllGroupsQuery, useAssignStudentsToGroupMutation, useStudentGroupsQuery,
  useFreezeStudentGroupMutation, useUnfreezeStudentGroupMutation,
  useUpdateStudentGroupMutation, useGraduateTrialStudentGroupMutation, useLazyStudentGroupsQuery,
} from "../../app/api/groupsApi";
import type { Group, StudentGroupRecord } from "../../app/api/groupsApi/types";
import { useLazyStudentFreezesQuery } from "../../app/api/studentFreezesApi";
import { useAllBranchesQuery } from "../../app/api/branchesApi";
import { useAttendanceReportQuery } from "../../app/api/attendancesApi";
import { useSendSmsToStudentsMutation } from "../../app/api/smsApi";
import { useReasonsSelectQuery } from "../../app/api/reasonsApi";
import { useToast } from "../../Context/ToastContext";
import { DatePickerField } from "../SingleGroup/DatePickerField";
import { RemoveStudentDialog } from "../SingleGroup/RemoveStudentDialog";
import { extractApiError } from "../../utils/extractApiError";
import { AddPayment } from "../../components/AddPayment";
import { TbArrowBackUp, TbCalculator } from "react-icons/tb";
import { StudentBalanceActionDrawer, type BalanceAction } from "./payments/StudentBalanceActionDrawer";
import { StudentTagsSelect } from "../../components/StudentTagsSelect";
import { StudentContactFields, EMPTY_CONTACTS, type ContactValues } from "../../components/StudentContactFields/StudentContactFields";
import { toPhoneInput, fromPhoneInput } from "../../utils/formatPhone";
import { submitOnEnter } from "../../utils/submitOnEnter";
import { isActiveGroup } from "../../hooks/useActiveGroups";
import { StudentPaymentsSection } from "./payments/StudentPaymentsSection";
import { FreezeModal } from "../SingleGroup/FreezeModal";
import { ActivateModal } from "../SingleGroup/ActivateModal";
import { GraduateTrialModal } from "../SingleGroup/GraduateTrialModal";
import { AttendanceTab } from "./attendance";
import { StudentHistoryTab } from "./history/StudentHistoryTab";

const isLiveMembershipStatus = (status: string) => status !== "INACTIVE" && status !== "DELETED";

/* ─── TYPES ─────────────────────────────────────────── */
const TABS = ["Groups", "Comments", "Attendance", "SMS", "History", "Lead history"];

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
  onSave: (data: { name: string; phone: string; gender: StudentGender | undefined; birthdate: string; tagIds: string[]; contacts: ContactValues }) => Promise<boolean>;
  saving?: boolean;
  error?: string | null;
}) => {
  const [name, setName] = useState(student.name);
  const [phone, setPhone] = useState(toPhoneInput(student.phone));
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [contacts, setContacts] = useState<ContactValues>(EMPTY_CONTACTS);

  // `student` already carries GET /students/{id}/for-edit (see the page), so
  // the form opens with everything the backend knows about the student.
  useEffect(() => {
    if (!open) return;
    setName(student.name);
    setPhone(toPhoneInput(student.phone));
    setDob(student.birthdate ? student.birthdate.slice(0, 10) : "");
    setGender(student.gender === "FEMALE" ? "female" : student.gender === "MALE" ? "male" : "");
    setTagIds(student.tagIds ?? []);
    setContacts({
      parentPhone: student.parentPhone ?? "", passport: student.passport ?? "", parentName: student.parentName ?? "", email: student.email ?? "",
      telegram: student.telegram ?? "", schoolName: student.schoolName ?? "", location: student.address ?? "", instagram: student.instagram ?? "",
    });
  }, [open, student]);

  const handleSubmit = async () => {
    const ok = await onSave({
      name,
      phone: fromPhoneInput(phone),
      gender: gender === "female" ? "FEMALE" : gender === "male" ? "MALE" : undefined,
      birthdate: dob,
      tagIds,
      contacts,
    });
    if (ok) onClose();
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      onKeyDown={submitOnEnter(handleSubmit, saving)}
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
          borderBottom: "1px solid var(--color-border-subtle)",
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 600, color: "var(--color-text-primary)" }}>
          Edit Student
        </span>
        <IconButton size="small" onClick={onClose} sx={{ color: "var(--color-text-muted)" }}>
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
              color: "var(--color-text-primary)",
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
                      color: "var(--color-text-primary)",
                      fontWeight: 500,
                      borderRight: "1px solid var(--color-border)",
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
              color: "var(--color-text-primary)",
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
              color: "var(--color-text-primary)",
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
              color: "var(--color-text-primary)",
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
                  sx={{ color: "#d1d5db", "&.Mui-checked": { color: "var(--color-primary)" } }}
                />
              }
              label={<span style={{ fontSize: 14, color: "var(--color-text-primary)" }}>Male</span>}
            />
            <FormControlLabel
              value="female"
              control={
                <Radio
                  size="small"
                  sx={{ color: "#d1d5db", "&.Mui-checked": { color: "var(--color-primary)" } }}
                />
              }
              label={<span style={{ fontSize: 14, color: "var(--color-text-primary)" }}>Female</span>}
            />
          </RadioGroup>
        </div>

        {/* Photo */}
        <div>
          <label
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "var(--color-text-primary)",
              display: "block",
              marginBottom: 6,
            }}
          >
            Photo
          </label>
          <div
            style={{
              display: "flex",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                flex: 1,
                padding: "8px 12px",
                fontSize: 13,
                color: "var(--color-text-muted)",
                display: "flex",
                alignItems: "center",
              }}
            >
              No file chosen
            </div>
            <button
              style={{
                padding: "8px 16px",
                background: "var(--color-surface-alt)",
                border: "none",
                borderLeft: "1px solid var(--color-border)",
                fontSize: 13,
                color: "var(--color-text-primary)",
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
              color: "var(--color-text-primary)",
              display: "block",
              marginBottom: 8,
            }}
          >
            Additional contacts
          </label>
          <StudentContactFields values={contacts} onChange={(id, value) => setContacts((p) => ({ ...p, [id]: value }))} />
        </div>

        {/* Tags */}
        <div>
          <label
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "var(--color-text-primary)",
              display: "block",
              marginBottom: 6,
            }}
          >
            Tags
          </label>
          <StudentTagsSelect value={tagIds} onChange={setTagIds} />
        </div>

        {/* Set password */}
        <div style={{ textAlign: "right" }}>
          <button
            style={{
              background: "none",
              border: "none",
              fontSize: 13,
              color: "var(--color-text-secondary)",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            + Set password
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: "16px 24px", borderTop: "1px solid var(--color-border-subtle)" }}>
        {error && (
          <div style={{ fontSize: 13, color: "#ef4444", marginBottom: 10 }}>{error}</div>
        )}
        <Button
          variant="contained"
          disabled={saving}
          onClick={handleSubmit}
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
          borderBottom: "1px solid var(--color-border-subtle)",
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 600, color: "var(--color-text-primary)" }}>
          Send SMS to student
        </span>
        <IconButton size="small" onClick={handleClose} sx={{ color: "var(--color-text-muted)" }}>
          <FiX size={20} />
        </IconButton>
      </div>

      {/* Body */}
      <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 14, color: "var(--color-text-primary)", fontWeight: 500 }}>
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
            color: "var(--color-text-muted)",
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

// Local calendar date as YYYY-MM-DD (toISOString() is UTC and lands on the
// previous day for the first hours after midnight in UTC+5).
const todayLocalISO = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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
  onSubmit: (groupId: string, joinedAt: string) => Promise<boolean>;
  groups: { id: string; name: string }[];
  isSubmitting?: boolean;
}) => {
  const [groupId, setGroupId] = useState("");
  const [joinedAt, setJoinedAt] = useState(todayLocalISO());

  useEffect(() => {
    if (!open) { setGroupId(""); setJoinedAt(todayLocalISO()); }
  }, [open]);

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (!groupId || isSubmitting) return;
    const success = await onSubmit(groupId, joinedAt || todayLocalISO());
    if (success) { setGroupId(""); setJoinedAt(todayLocalISO()); }
  };

  return (
    <Dialog open={open} onClose={handleClose} onKeyDown={submitOnEnter(handleSubmit)} PaperProps={{ sx: { width: 620, maxWidth: "95vw", borderRadius: 1 } }}>
      <DialogTitle sx={{ px: 3, py: 2, borderBottom: "1px solid var(--color-border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: "var(--color-text-primary)" }}>
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
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            height: 46,
            padding: "0 12px",
            color: groupId ? "var(--color-text-primary)" : "#a8b0bb",
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
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 6 }}>Joined on</div>
          <DatePickerField value={joinedAt} onChange={setJoinedAt} disabled={isSubmitting} />
        </div>
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
  onSubmit: (branchId: string, reason: string | undefined, paymentEndDate: string) => Promise<boolean>;
  branches: { id: string; name: string }[];
  currentBranchIds: string[];
  isSubmitting?: boolean;
}) => {
  const [branch, setBranch] = useState("");
  const [reason, setReason] = useState("");
  const [paymentEndDate, setPaymentEndDate] = useState(todayLocalISO());

  useEffect(() => {
    if (!open) { setBranch(""); setReason(""); setPaymentEndDate(todayLocalISO()); }
  }, [open]);

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (!branch || !paymentEndDate || isSubmitting) return;
    const success = await onSubmit(branch, reason.trim() || undefined, paymentEndDate);
    if (success) { setBranch(""); setReason(""); setPaymentEndDate(todayLocalISO()); }
  };

  return (
    <Dialog open={open} onClose={handleClose} onKeyDown={submitOnEnter(handleSubmit)} PaperProps={{ sx: { width: 620, maxWidth: "95vw", borderRadius: 1 } }}>
      <DialogTitle sx={{ px: 3, py: 2, borderBottom: "1px solid var(--color-border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: "var(--color-text-primary)" }}>
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
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            height: 46,
            padding: "0 12px",
            color: branch ? "var(--color-text-primary)" : "#a8b0bb",
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
          sx={{ mb: 1.5, "& .MuiOutlinedInput-root": { borderRadius: "8px", fontSize: 14 } }}
        />
        {/* paymentEndDate (Swagger body field): last day of payment accounting
            in the old branch. */}
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 6 }}>
          Payment end date in the old branch
        </div>
        <div style={{ marginBottom: 18 }}>
          <DatePickerField value={paymentEndDate} onChange={setPaymentEndDate} disabled={isSubmitting} />
        </div>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!branch || !paymentEndDate || isSubmitting}
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
      background: "var(--color-surface)",
      borderRadius: 16,
      border: "1px solid var(--color-border)",
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
      <Avatar src={student.photo || undefined} sx={{ width: 72, height: 72, bgcolor: "var(--color-surface-hover)", color: "var(--color-text-muted)" }}>
        <FiUser size={32} />
      </Avatar>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 17, fontWeight: 600, color: "var(--color-text-primary)" }}>
          {student.name}
        </div>
        <div style={{ fontSize: 12, color: "var(--color-text-muted)" }} title={student.uid}>
          (id: {student.uid.length > 8 ? `${student.uid.slice(0, 8)}…` : student.uid})
        </div>
      </div>
    </div>

    {/* Balance */}
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <BalanceBadge amount={student.balance ?? 0} />
      <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>balance</span>
    </div>

    <hr style={{ border: "none", borderTop: "1px solid var(--color-border-subtle)", margin: "14px 0" }} />

    {/* Personal info — only fields the backend actually returned are shown */}
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div>
        <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Phone:</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#5c7fa3" }}>{student.phone || "—"}</div>
      </div>
      {student.parentPhone && (
        <div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Additional phone:</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>{student.parentPhone}</div>
        </div>
      )}
      {student.parentName && (
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
          Contact person: <strong style={{ color: "var(--color-text-primary)" }}>{student.parentName}</strong>
        </div>
      )}
      {student.email && (
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
          Email: <strong style={{ color: "var(--color-text-primary)" }}>{student.email}</strong>
        </div>
      )}
      {student.telegram && (
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
          Telegram: <strong style={{ color: "var(--color-text-primary)" }}>{student.telegram}</strong>
        </div>
      )}
      {student.instagram && (
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
          Instagram: <strong style={{ color: "var(--color-text-primary)" }}>{student.instagram}</strong>
        </div>
      )}
      {student.birthdate && (
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
          Birthday: <strong style={{ color: "var(--color-text-primary)" }}>{formatDate(student.birthdate)}</strong>
        </div>
      )}
      {student.gender && (
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
          Gender: <strong style={{ color: "var(--color-text-primary)" }}>{student.gender === "MALE" ? "Male" : "Female"}</strong>
        </div>
      )}
      {student.address && (
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
          Address: <strong style={{ color: "var(--color-text-primary)" }}>{student.address}</strong>
        </div>
      )}
      {student.schoolName && (
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
          School: <strong style={{ color: "var(--color-text-primary)" }}>{student.schoolName}</strong>
        </div>
      )}
      {student.passport && (
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
          Passport: <strong style={{ color: "var(--color-text-primary)" }}>{student.passport}</strong>
        </div>
      )}
    </div>

    <hr style={{ border: "none", borderTop: "1px solid var(--color-border-subtle)", margin: "14px 0" }} />

    {/* Info rows */}
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {student.createdAt && formatLongDate(student.createdAt) && (
        <div
          style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--color-text-secondary)" }}
        >
          <FiCalendar size={14} />
          <span>
            Added at:{" "}
            <strong style={{ color: "var(--color-text-primary)" }}>{formatLongDate(student.createdAt)}</strong>
          </span>
        </div>
      )}
      {student.startDate && (
        <div
          style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--color-text-secondary)" }}
        >
          <FiCalendar size={14} />
          <span>
            Group start:{" "}
            <strong style={{ color: "var(--color-text-primary)" }}>{formatDate(student.startDate)}</strong>
          </span>
        </div>
      )}
      <div
        style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 13, color: "var(--color-text-secondary)" }}
      >
        <FiGitBranch size={14} />
        <span>Branches:</span>
        {(student.branches?.length ? student.branches : [student.branch || "—"]).map((name) => (
          <Chip
            key={name}
            label={name}
            size="small"
            sx={{ fontSize: 11, height: 20, bgcolor: "var(--color-surface-alt)" }}
          />
        ))}
      </div>
      <div
        style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--color-text-secondary)" }}
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

    <hr style={{ border: "none", borderTop: "1px solid var(--color-border-subtle)", margin: "14px 0" }} />

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
            "&:hover": { borderColor: "#60a5fa", bgcolor: "var(--color-primary-surface)" },
          }}
        >
          Add to group
        </Button>
        <IconButton
          size="small"
          onClick={onOpenAddToGroupMenu}
          sx={{
            border: "1px solid #93c5fd", color: "#2563eb", borderRadius: 999, width: 28, height: 28, flexShrink: 0,
            "&:hover": { borderColor: "#60a5fa", bgcolor: "var(--color-primary-surface)" },
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
              "&:hover": { borderColor: "#4ade80", bgcolor: "var(--color-success-surface)" },
            }}
          >
            Add payment
          </Button>
          <IconButton
            size="small"
            onClick={onOpenAddPaymentMenu}
            sx={{
              border: "1px solid #86efac", color: "#16a34a", borderRadius: 999, width: 28, height: 28, flexShrink: 0,
              "&:hover": { borderColor: "#4ade80", bgcolor: "var(--color-success-surface)" },
            }}
          >
            <FiChevronDown size={13} />
          </IconButton>
        </div>
      )}
    </div>

    {/* Note */}
    <div style={{ borderTop: "1px solid var(--color-border-subtle)", paddingTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Note</span>
        <IconButton size="small" sx={{ color: "var(--color-text-muted)" }}>
          <FiFlag size={14} />
        </IconButton>
      </div>
      <div
        style={{
          marginTop: 8,
          minHeight: 40,
          borderLeft: "4px solid #60a5fa",
          paddingLeft: 10,
          fontSize: 13,
          color: "var(--color-text-primary)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {student.comment}
      </div>
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
  ACTIVE:    { color: "var(--color-primary)", fallback: "Active (Learns)" },
  PROBATION: { color: "var(--color-warning)", fallback: "Trial" },
  FROZEN:    { color: "var(--color-primary)", fallback: "Frozen (paused)" },
  INACTIVE:  { color: "var(--color-text-secondary)", fallback: "Inactive" },
  DELETED:   { color: "var(--color-text-secondary)", fallback: "Removed" },
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
const asCoursePrice = (raw: unknown): number | null => decimalToNumber(raw);

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
  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--color-text-secondary)" }}>
    <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
    {label}: <strong style={{ color: "var(--color-text-primary)" }}>{value}</strong>
  </div>
);

const AttendanceSummary = ({ groupId, studentId }: { groupId: string | undefined; studentId: string }) => {
  const { total, present, absent, other, isFetching } = useGroupAttendanceSummary(groupId, studentId);
  if (isFetching || total === 0) return null;

  const presentDeg = (present / total) * 360;
  const absentDeg = (absent / total) * 360;
  const pct = Math.round((present / total) * 100);
  const gradient = `conic-gradient(#22c55e 0deg ${presentDeg}deg, #ef4444 ${presentDeg}deg ${presentDeg + absentDeg}deg, var(--color-border) ${presentDeg + absentDeg}deg 360deg)`;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 60, height: 60, borderRadius: "50%", background: gradient, flexShrink: 0 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
            Total lessons: <strong style={{ color: "var(--color-text-primary)" }}>{total}</strong>
          </div>
          <AttendanceLegendRow color="#22c55e" label="Was" value={present} />
          <AttendanceLegendRow color="#ef4444" label="Not" value={absent} />
          <AttendanceLegendRow color="var(--color-border)" label="Not attended" value={other} />
        </div>
      </div>
      <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 8 }}>
        Attendance: <strong style={{ color: "var(--color-text-primary)" }}>{pct}%</strong>
      </div>
    </div>
  );
};

const GroupCard = ({
  membership, group, studentId, branchName, onOpenGroup, onPauseOrPlay, onGraduate, onRestore, onArchive,
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
  // PROBATION (trial) -> ACTIVE.
  onGraduate?: () => void;
  // Ended (INACTIVE/DELETED) -> ACTIVE again.
  onRestore?: () => void;
  // Ends this one membership (PATCH /student-groups/{id}/status -> INACTIVE),
  // same action SingleGroup's "Remove from group" performs at the
  // per-membership level.
  onArchive?: () => void;
}) => {
  const { t } = useTranslation();
  const statusMeta = GROUP_STATUS_TEXT[membership.status] ?? { color: "var(--color-text-secondary)", fallback: membership.status };
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
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        cursor: onOpenGroup ? "pointer" : "default",
      }}
      onMouseEnter={(e) => { if (onOpenGroup) e.currentTarget.style.borderColor = "#93c5fd"; }}
      onMouseLeave={(e) => { if (onOpenGroup) e.currentTarget.style.borderColor = "var(--color-border)"; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <Chip
          label={membership.name}
          size="small"
          sx={{ fontSize: 11, height: 22, bgcolor: "var(--color-primary-surface)", color: "var(--color-primary)", fontWeight: 600 }}
        />
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", textAlign: "right" }}>
          <div>{formatMembershipDate(membership.trainingStart)} — {formatMembershipDate(membership.trainingEnd)}</div>
          {schedule && <div style={{ marginTop: 2 }}>{schedule}{group?.room?.name ? ` • ${group.room.name}` : ""}</div>}
          <div style={{ marginTop: 2, fontWeight: 600, color: statusMeta.color }}>{statusLabel}</div>
        </div>
      </div>

      <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text-primary)" }}>{membership.courseName ?? "—"}</div>
      <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 2 }}>{teacherNames}</div>
      {branchName && <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>{branchName}</div>}

      <hr style={{ border: "none", borderTop: "1px solid var(--color-border-subtle)", margin: "12px 0" }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
          {t("singleGroup.studentHoverCard.addedAt")}: <strong style={{ color: "var(--color-text-primary)" }}>{formatMembershipDate(membership.joinedAt)}</strong>
        </div>
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
          {t("singleGroup.studentHoverCard.activatedAt")}: <strong style={{ color: "var(--color-text-primary)" }}>{formatMembershipDate(membership.paymentStartDate)}</strong>
        </div>
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
          Price for student: <strong style={{ color: "var(--color-text-primary)" }}>{moneyOrDash(priceValue)}</strong>
          {priceNote && <span style={{ color: "var(--color-text-muted)" }}> {priceNote}</span>}
        </div>
      </div>

      <hr style={{ border: "none", borderTop: "1px solid var(--color-border-subtle)", margin: "12px 0" }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <AttendanceSummary groupId={group?.id} studentId={studentId} />
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
          {isEnded ? (
            onRestore && (
              <Tooltip title="Return to group">
                <IconButton size="small" onClick={onRestore} sx={{ border: "1.5px solid #22c55e", color: "#22c55e", width: 36, height: 36 }}>
                  <FiRefreshCw size={15} />
                </IconButton>
              </Tooltip>
            )
          ) : (
            <>
              {membership.status === "PROBATION" && onGraduate && (
                <Tooltip title="Activate">
                  <IconButton size="small" onClick={onGraduate} sx={{ border: "1.5px solid #22c55e", color: "#22c55e", width: 36, height: 36 }}>
                    <FiPlay size={15} />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title={isFrozen ? "Activate" : "Freeze"}>
                <IconButton
                  size="small"
                  onClick={onPauseOrPlay}
                  sx={{ border: "1.5px solid #06b6d4", color: "#06b6d4", width: 36, height: 36 }}
                >
                  {isFrozen ? <FiPlay size={15} /> : <FiPause size={15} />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Remove from group">
                <IconButton
                  size="small"
                  onClick={onArchive}
                  sx={{ border: "1.5px solid #ef4444", color: "#ef4444", width: 36, height: 36 }}
                >
                  <FiArchive size={15} />
                </IconButton>
              </Tooltip>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// "21.10.2026 14:05" from the ISO stamp (local time); date-only or unparsable
// values fall back to the plain date / the raw text.
const formatItemStamp = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  if (!iso.includes("T")) return formatDate(iso.slice(0, 10));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
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
    return <div style={{ padding: 32, textAlign: "center", color: "var(--color-text-muted)", fontSize: 14 }}>Loading...</div>;
  }
  if (isError) {
    return <div style={{ padding: 32, textAlign: "center", color: "#ef4444", fontSize: 14 }}>Failed to load</div>;
  }
  if (items.length === 0) {
    return <div style={{ padding: 32, textAlign: "center", color: "var(--color-text-muted)", fontSize: 14 }}>{emptyLabel}</div>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((item) => (
        <div
          key={item.id}
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 10, padding: "12px 16px" }}
        >
          <div style={{ fontSize: 13, color: "var(--color-text-primary)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{item.primary || "—"}</div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 12, color: "var(--color-text-muted)" }}>
            <span>{item.secondary || "—"}</span>
            <span>{formatItemStamp(item.date)}</span>
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
  const { t } = useTranslation();

  // ✅ uid (string) — real API id orqali topiladi, navigate('/students/:id') bilan mos
  const { data, isLoading } = useStudentByIdQuery(id ?? "", { skip: !id });
  // GET /students/{id}/for-edit carries every personal/contact field; the
  // plain GET /students/{id} still supplies the balance and group start, so
  // the for-edit values are laid over it (empty ones are skipped).
  const { data: forEditData } = useStudentForEditQuery(id ?? "", { skip: !id });
  const { data: groupMemberships, isLoading: isGroupMembershipsLoading } = useStudentGroupMembershipsQuery(id ?? "", { skip: !id });
  // Confirmed live (2026-09-25): GET /students/{id}/groups' own `id` field
  // IS the group's real id, not a separate membership-row id — a student
  // can only have one membership per group, so the backend keys each entry
  // by the group itself. freeze/unfreeze/PATCH .../status all need the
  // *membership row's* id instead (StudentGroupRecord.id from GET
  // /student-groups?studentId=, the same resource SingleGroup.tsx uses),
  // so that list is cross-referenced here the other way round — groupId ->
  // real membership id — to resolve the id those calls actually need.
  // limit defaults to 10 — a student with more group-membership history
  // than that (frozen/archived groups included) would silently lose the
  // mapping for the rest. A high limit here mirrors SingleGroup's own
  // studentGroups fetch.
  const { data: studentGroupRecords } = useStudentGroupsQuery({ studentId: id ?? "", limit: 500 }, { skip: !id });
  // A student can have several rows for one group (an ended INACTIVE one and a
  // newer live one) - every action must hit the LIVE row, else the newest.
  const membershipRowByGroupId = useMemo(() => {
    const map = new Map<string, StudentGroupRecord>();
    (studentGroupRecords?.rows ?? []).forEach((r) => {
      const cur = map.get(r.groupId);
      const better =
        !cur ||
        (isLiveMembershipStatus(r.status) && !isLiveMembershipStatus(cur.status)) ||
        (isLiveMembershipStatus(r.status) === isLiveMembershipStatus(cur.status) && (r.createdAt ?? "") > (cur.createdAt ?? ""));
      if (better) map.set(r.groupId, r);
    });
    return map;
  }, [studentGroupRecords]);
  const realStudentGroupIdByGroupId = useMemo(
    () => new Map([...membershipRowByGroupId].map(([groupId, row]) => [groupId, row.id])),
    [membershipRowByGroupId]
  );

  const [updateStudent, { isLoading: isSavingStudent }] = useUpdateStudentMutation();
  const { leaveGroup, archiveStudent: archiveStudentFlow, deleteStudent: deleteStudentFlow } = useArchiveStudent();
  const [isArchivingStudent, setIsArchivingStudent] = useState(false);
  const [assignStudentsToGroup, { isLoading: isAddingToGroup }] = useAssignStudentsToGroupMutation();
  const [transferStudentBranch, { isLoading: isMovingBranch }] = useTransferStudentBranchMutation();
  const [freezeStudentGroup, { isLoading: isFreezingGroup }] = useFreezeStudentGroupMutation();
  const [unfreezeStudentGroup, { isLoading: isUnfreezingGroup }] = useUnfreezeStudentGroupMutation();
  const [updateStudentGroup, { isLoading: isSavingMembershipDates }] = useUpdateStudentGroupMutation();
  const [graduateTrialStudentGroup, { isLoading: isGraduatingTrial }] = useGraduateTrialStudentGroupMutation();
  const [fetchMemberships] = useLazyStudentGroupsQuery();
  const [fetchStudentFreezes] = useLazyStudentFreezesQuery();

  const { data: groupsData } = useAllGroupsQuery({ page: 1, limit: 100 });
  const groupsById = useMemo(() => {
    const map = new Map<string, Group>();
    (groupsData?.data ?? []).forEach((g) => map.set(g.id, g));
    return map;
  }, [groupsData]);
  // Only running groups can be joined; groupsById above keeps every group for
  // the memberships the profile lists.
  const groupOptions = useMemo(
    () => (groupsData?.data ?? []).filter(isActiveGroup).map((g) => ({ id: g.id, name: g.name })),
    [groupsData]
  );

  const { data: branchesData } = useAllBranchesQuery();
  const student = useMemo(() => {
    if (!data) return undefined;
    const filled = Object.fromEntries(
      Object.entries(forEditData?.data ?? {}).filter(([, v]) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0)),
    );
    const merged = { ...data.data, ...filled } as typeof data.data;
    // The branch names come from GET /students/{id}; when it sent none, the
    // branch ids of for-edit are resolved against the branches list.
    if (!merged.branch?.length && forEditData?.data.branchIds.length) {
      merged.branch = forEditData.data.branchIds
        .map((bid) => (branchesData?.data ?? []).find((b) => b.id === bid))
        .filter((b): b is NonNullable<typeof b> => Boolean(b))
        .map((b) => ({ id: b.id, name: b.name }));
    }
    return mapApiStudentToFlat(merged);
  }, [data, forEditData, branchesData]);
  // GET /branches includes soft-deleted (status: "DELETED") and deactivated
  // (status: "INACTIVE") branches — filter to ACTIVE only, same as Header's
  // own branch dropdown, so this picker can't transfer a student into a
  // branch that no longer exists.
  const branchOptions = useMemo(
    () => (branchesData?.data ?? []).filter((b) => b.status === "ACTIVE").map((b) => ({ id: b.id, name: b.name })),
    [branchesData]
  );
  const currentBranchIds = useMemo(
    () => ((data?.data.branch?.length ? data.data.branch.map((b) => b.id) : forEditData?.data.branchIds) ?? []),
    [data, forEditData],
  );
  // Group/GroupDetail carries no branch field of its own — a membership's
  // branch is derived from its course's branchId (every course belongs to
  // one branch), cross-referenced against the same branches list already
  // fetched above for the "Move to another branch" picker.
  const branchNameById = useMemo(() => {
    const map = new Map<string, string>();
    (branchesData?.data ?? []).forEach((b) => map.set(b.id, b.name));
    return map;
  }, [branchesData]);

  // Payments/balance/receipts data lives in ./payments/StudentPaymentsSection
  // (it fetches GET /students/{id}/payments + /finance-history itself).

  const [saveError, setSaveError] = useState<string | null>(null);
  const toast = useToast();

  const [activeTab, setActiveTab] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [smsOpen, setSmsOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveReasonId, setArchiveReasonId] = useState("");
  const [archiveComment, setArchiveComment] = useState("");
  // Dialog switch: false = archive the student, true = delete the student.
  const [archiveDeleteMode, setArchiveDeleteMode] = useState(false);
  const [addToGroupOpen, setAddToGroupOpen] = useState(false);
  const [moveBranchOpen, setMoveBranchOpen] = useState(false);
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);
  const [groupMenuAnchor, setGroupMenuAnchor] = useState<null | HTMLElement>(null);
  const [paymentMenuAnchor, setPaymentMenuAnchor] = useState<null | HTMLElement>(null);
  const [balanceAction, setBalanceAction] = useState<BalanceAction | null>(null);
  const [freezeTarget, setFreezeTarget] = useState<StudentGroupMembership | null>(null);
  const [activateTarget, setActivateTarget] = useState<StudentGroupMembership | null>(null);
  const [graduateTarget, setGraduateTarget] = useState<StudentGroupMembership | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<StudentGroupMembership | null>(null);
  // "Remove from group" - same dialog/fields as SingleGroup's roster action.
  const [archiveGroupTarget, setArchiveGroupTarget] = useState<StudentGroupMembership | null>(null);
  const [removeReasonId, setRemoveReasonId] = useState("");
  const [removeComment, setRemoveComment] = useState("");
  const [removeScope, setRemoveScope] = useState<"current" | "all">("current");
  const [removeDeleteMode, setRemoveDeleteMode] = useState(false);
  // Only the archive and remove-from-group dialogs pick a reason, so they are
  // fetched once one of them opens.
  const {
    data: archiveReasonOptions,
    isLoading: reasonsLoading,
    isError: reasonsError,
  } = useReasonsSelectQuery({ status: "ACTIVE", page: 1, limit: 200 }, { skip: !archiveOpen && !archiveGroupTarget });

  // Tab content for Comments/SMS/History is only fetched once its tab is
  // actually opened — no point firing three extra requests on every profile
  // load for tabs the staff member may never click.
  const { data: commentsData, isFetching: isCommentsLoading, isError: isCommentsError } = useStudentCommentsQuery(
    student?.uid ?? "", { skip: !student || activeTab !== 1, refetchOnMountOrArgChange: true }
  );
  const [createStudentComment, { isLoading: isSavingComment }] = useCreateStudentCommentMutation();
  const [commentDraft, setCommentDraft] = useState("");
  const { data: smsData, isFetching: isSmsLoading, isError: isSmsError } = useStudentSmsHistoryQuery(
    { id: student?.uid ?? "", page: 1, limit: 50 }, { skip: !student || activeTab !== 3 }
  );

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--color-surface-alt)", padding: 24, color: "var(--color-text-secondary)" }}>
        Loading...
      </div>
    );
  }

  if (!student) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--color-surface-alt)", padding: 24 }}>
        <Button
          startIcon={<IoArrowBack />}
          onClick={() => navigate(-1)}
          sx={{
            mb: 2,
            textTransform: "none",
            color: "#5c7fa3",
            fontWeight: 600,
            fontSize: 14,
            "&:hover": { background: "var(--color-primary-surface)" },
          }}
        >
          Back to Students
        </Button>
        <div
          style={{
            maxWidth: 1200,
            marginTop: 24,
            padding: 24,
            background: "var(--color-surface)",
            borderRadius: 16,
            border: "1px solid var(--color-border)",
            color: "var(--color-text-secondary)",
          }}
        >
          Student not found. (id: {id})
        </div>
      </div>
    );
  }

  const handleSaveStudent = async (data: { name: string; phone: string; gender: StudentGender | undefined; birthdate: string; tagIds: string[]; contacts: ContactValues }): Promise<boolean> => {
    setSaveError(null);
    try {
      // Empty contact fields are left out (a multipart empty string would be
      // stored as a value), so only filled ones are sent.
      const contacts = Object.fromEntries(Object.entries(data.contacts).map(([k, v]) => [k, v.trim() || undefined]));
      await updateStudent({
        id: student.uid,
        name: data.name,
        phone: data.phone || undefined,
        gender: data.gender,
        birthdate: data.birthdate || undefined,
        tagIds: data.tagIds.length ? data.tagIds : undefined,
        ...contacts,
      }).unwrap();
      toast.success("Student updated successfully");
      return true;
    } catch {
      setSaveError("Failed to save the student");
      toast.error("Failed to save the student");
      return false;
    }
  };

  // POST /students/{id}/comments — the new note shows up in the Comments tab
  // right away (the mutation invalidates the "student" tag the list provides).
  // Comments from GET /students/{id}/comments, plus the note typed when the
  // student was added (POST /students `description`, read back on the student)
  // as the oldest entry - unless a comment with the same text is already listed.
  const commentItems = [
    ...(commentsData ?? []).map((c) => ({ id: c.id, primary: c.text, secondary: c.author, date: c.createdAt })),
    ...(student.comment && !(commentsData ?? []).some((c) => c.text.trim() === student.comment?.trim())
      ? [{ id: "student-note", primary: student.comment, secondary: "Added with the student", date: student.createdAt ?? "" }]
      : []),
  ];

  const handleAddComment = async () => {
    const comment = commentDraft.trim();
    if (!comment || isSavingComment) return;
    try {
      await createStudentComment({ id: student.uid, comment }).unwrap();
      setCommentDraft("");
      toast.success("Comment added");
    } catch (err) {
      const detail = extractApiError(err);
      toast.error(detail ? `Failed to add the comment: ${detail}` : "Failed to add the comment");
    }
  };

  // Archives (or, with the dialog's "Delete student" switch, deletes) the
  // student through the shared flow (see useArchiveStudent): ends every live
  // group membership, then POST /students/{id}/status INACTIVE with the
  // picked reasonId/comment — plus DELETE /students/{id} when deleting.
  const handleArchive = async () => {
    setIsArchivingStudent(true);
    try {
      const args = { studentId: student.uid, reasonId: archiveReasonId || undefined, comment: archiveComment };
      if (archiveDeleteMode) await deleteStudentFlow(args);
      else await archiveStudentFlow(args);
      toast.success(archiveDeleteMode ? "Student deleted" : "Student moved to archive");
      setArchiveOpen(false);
      setArchiveReasonId("");
      setArchiveComment("");
      setArchiveDeleteMode(false);
      navigate(-1);
    } catch (err) {
      const detail = extractApiError(err);
      const action = archiveDeleteMode ? "delete" : "archive";
      const message = detail ? `Failed to ${action} the student: ${detail}` : `Failed to ${action} the student`;
      toast.error(message);
    } finally {
      setIsArchivingStudent(false);
    }
  };

  // GET /students/{id} (StudentDetail) doesn't return the student's current
  // group id, unlike the students-list shape used on the Students page, so
  // there's no client-side "already in this group" check here — the backend
  // is relied on to reject/ignore a duplicate membership.
  const handleAddToGroup = async (groupId: string, joinedAt: string): Promise<boolean> => {
    try {
      // Joins on PROBATION (a trial lesson) like every other add path, so the
      // student isn't billed as active before staff graduate the trial.
      await assignStudentsToGroup({ id: groupId, studentIds: [student.uid], status: "PROBATION", joinedAt }).unwrap();
      toast.success("Student added to the group");
      return true;
    } catch (err) {
      const detail = extractApiError(err);
      toast.error(detail ? `Failed to add to the group: ${detail}` : "Failed to add to the group");
      return false;
    }
  };

  const handleMoveToBranch = async (branchId: string, reason: string | undefined, paymentEndDate: string): Promise<boolean> => {
    try {
      await transferStudentBranch({ id: student.uid, newBranchId: branchId, reason, paymentEndDate }).unwrap();
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
    // freezeTarget.id is the group's id (see realStudentGroupIdByGroupId's
    // comment above), not the membership row id this call needs.
    const realId = realStudentGroupIdByGroupId.get(freezeTarget.id);
    if (!realId) {
      toast.error("Failed to freeze: membership not found");
      return;
    }
    try {
      await freezeStudentGroup({
        id: realId,
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

  // The membership actions below mirror SingleGroup's roster actions exactly
  // (same endpoints, same order), so a student ends up in the same state
  // whichever page the staff member used.
  //
  // Live membership row id for a group: from the cached rows, else straight
  // from GET /student-groups (e.g. a row created a moment ago).
  const resolveLiveMembershipId = async (groupId: string): Promise<string | undefined> => {
    const cached = membershipRowByGroupId.get(groupId);
    if (cached && isLiveMembershipStatus(cached.status)) return cached.id;
    try {
      const found = await fetchMemberships({ groupId, studentId: student.uid, limit: 20 }).unwrap();
      const live = found.rows
        .filter((r) => isLiveMembershipStatus(r.status) && (!r.groupId || r.groupId === groupId) && (!r.studentId || r.studentId === student.uid))
        .sort((x, y) => (y.createdAt ?? "").localeCompare(x.createdAt ?? ""));
      if (live[0]?.id) return live[0].id;
    } catch {
      /* fall through to the cached row */
    }
    return cached?.id;
  };

  const dateOnly = (iso?: string | null) => (iso ? iso.slice(0, 10) : undefined);

  // Start date of the membership's running freeze (GET /student-freezes), else
  // the day the student joined the group.
  const findFreezeStart = async (membership: StudentGroupMembership, studentGroupId: string) => {
    try {
      const res = await fetchStudentFreezes({ studentId: student.uid, groupId: membership.id, status: "ACTIVE", limit: 50 }).unwrap();
      const latest = res.rows
        .filter((r) => r.startDate && (!r.studentGroupId || r.studentGroupId === studentGroupId))
        .map((r) => r.startDate.slice(0, 10))
        .sort()
        .pop();
      if (latest) return latest;
    } catch {
      /* fall through to the join date */
    }
    return dateOnly(membership.joinedAt);
  };

  // FROZEN -> ACTIVE: POST /student-groups/{id}/unfreeze {endDate}, then PATCH
  // /student-groups/{id} {paymentStartDate} - payment accounting starts on the
  // picked date. The freeze must END on the day billing starts (never before
  // the freeze's own start).
  const handleUnfreezeConfirm = async (paymentStartDate: string) => {
    if (!activateTarget) return;
    const studentGroupId = await resolveLiveMembershipId(activateTarget.id);
    if (!studentGroupId) {
      toast.error("Failed to activate: membership not found");
      return;
    }
    const freezeStart = await findFreezeStart(activateTarget, studentGroupId);
    const unfreezeEnd = freezeStart && paymentStartDate < freezeStart ? freezeStart : paymentStartDate;
    try {
      await unfreezeStudentGroup({ id: studentGroupId, endDate: unfreezeEnd }).unwrap();
    } catch (err) {
      const detail = extractApiError(err);
      toast.error(detail ? `Failed to activate: ${detail}` : "Failed to activate");
      return;
    }
    setActivateTarget(null);
    // Reported separately: the student IS active once the unfreeze went through.
    try {
      await updateStudentGroup({ id: studentGroupId, paymentStartDate }).unwrap();
      toast.success("Group membership activated");
    } catch (err) {
      const detail = extractApiError(err);
      toast.error(detail ? `Activated, but the payment start date was not saved: ${detail}` : "Activated, but the payment start date was not saved");
    }
  };

  // PROBATION (trial) -> ACTIVE: POST /student-groups/{id}/graduate-trial, then
  // PATCH {paymentStartDate} with the picked date.
  const handleGraduateConfirm = async (paymentStartDate: string) => {
    const target = graduateTarget;
    setGraduateTarget(null);
    if (!target) return;
    const studentGroupId = await resolveLiveMembershipId(target.id);
    if (!studentGroupId) {
      toast.error("Failed to activate: membership not found");
      return;
    }
    try {
      await graduateTrialStudentGroup(studentGroupId).unwrap();
    } catch (err) {
      const detail = extractApiError(err);
      toast.error(detail ? `Failed to activate: ${detail}` : "Failed to activate");
      return;
    }
    // Reported separately: the student IS active once the promotion went through.
    try {
      await updateStudentGroup({ id: studentGroupId, paymentStartDate }).unwrap();
      toast.success("Group membership activated");
    } catch (err) {
      const detail = extractApiError(err);
      toast.error(detail ? `Activated, but the payment start date was not saved: ${detail}` : "Activated, but the payment start date was not saved");
    }
  };

  // Ended (INACTIVE/DELETED) membership -> ACTIVE again, one PATCH with status
  // + paymentStartDate (same call the Archive page's restore makes).
  const handleRestoreConfirm = async (paymentStartDate: string) => {
    const target = restoreTarget;
    if (!target) return;
    const row = membershipRowByGroupId.get(target.id);
    if (!row) {
      toast.error("Failed to restore: membership not found");
      return;
    }
    try {
      await updateStudentGroup({ id: row.id, status: "ACTIVE", paymentStartDate }).unwrap();
      toast.success("Student returned to the group");
      setRestoreTarget(null);
    } catch (err) {
      const detail = extractApiError(err);
      toast.error(detail ? `Failed to restore: ${detail}` : "Failed to restore");
    }
  };

  const closeRemoveDialog = () => {
    setArchiveGroupTarget(null);
    setRemoveReasonId("");
    setRemoveComment("");
    setRemoveScope("current");
    setRemoveDeleteMode(false);
  };

  // Same flow as SingleGroup's handleRemoveStudent (see useArchiveStudent):
  // "Current group" ends just this membership, "All groups" and the "Delete
  // student" switch archive (and delete) the whole account.
  const handleRemoveFromGroupConfirm = async () => {
    const target = archiveGroupTarget;
    if (!target || isArchivingStudent) return;
    const args = { studentId: student.uid, reasonId: removeReasonId || undefined, comment: removeComment };
    const cached = membershipRowByGroupId.get(target.id);
    setIsArchivingStudent(true);
    try {
      if (removeDeleteMode) await deleteStudentFlow(args);
      else if (removeScope === "all") await archiveStudentFlow(args);
      else {
        const left = await leaveGroup({ ...args, groupId: target.id, studentGroupIds: cached && isLiveMembershipStatus(cached.status) ? [cached.id] : undefined });
        if (left === "not-found") {
          toast.error("The server has no membership of this student in the group, so nothing was removed");
          return;
        }
      }
      toast.success(removeDeleteMode ? "Student deleted" : "Removed from the group");
      closeRemoveDialog();
      if (removeDeleteMode) navigate(-1);
    } catch (err) {
      const detail = extractApiError(err);
      toast.error(detail ? `Failed to remove from the group: ${detail}` : "Failed to remove from the group");
    } finally {
      setIsArchivingStudent(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-surface-alt)", padding: 24 }}>
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
          "&:hover": { background: "var(--color-primary-surface)" },
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
            onArchive={() => setArchiveOpen(true)}
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
              background: "var(--color-surface)",
              borderRadius: 16,
              border: "1px solid var(--color-border)",
              overflow: "hidden",
            }}
          >
            {/* Tabs */}
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              sx={{
                px: 2,
                borderBottom: "1px solid var(--color-border-subtle)",
                "& .MuiTab-root": {
                  textTransform: "none",
                  fontSize: 14,
                  fontWeight: 500,
                  color: "var(--color-text-secondary)",
                  minHeight: 48,
                },
                "& .Mui-selected": { color: "var(--color-text-primary)", fontWeight: 600 },
                "& .MuiTabs-indicator": { bgcolor: "var(--color-text-primary)", height: 2 },
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
                      // m.id IS the group's real id (see the comment on
                      // realStudentGroupIdByGroupId above) — used directly
                      // here, no indirection needed.
                      const g = groupsById.get(m.id);
                      const branchId = g?.course?.branchId ?? g?.room?.branchId ?? null;
                      return (
                        <GroupCard
                          key={m.id}
                          membership={m}
                          group={g}
                          studentId={student.uid}
                          branchName={branchId ? branchNameById.get(branchId) ?? null : null}
                          onOpenGroup={() => navigate(`/groups/${m.id}`)}
                          onPauseOrPlay={() => (m.status === "FROZEN" ? setActivateTarget(m) : setFreezeTarget(m))}
                          onGraduate={() => setGraduateTarget(m)}
                          onRestore={() => setRestoreTarget(m)}
                          onArchive={() => setArchiveGroupTarget(m)}
                        />
                      );
                    })
                  ) : (
                    <div style={{ fontSize: 13, color: "var(--color-text-muted)", padding: "8px 0 16px" }}>
                      No groups yet
                    </div>
                  )}
                  <StudentPaymentsSection
                    studentId={student.uid}
                    studentName={student.name}
                    balance={student.balance ?? 0}
                  />
                </>
              ) : activeTab === 1 ? (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                    <TextField
                      multiline
                      minRows={3}
                      fullWidth
                      placeholder="Write a comment about this student"
                      value={commentDraft}
                      onChange={(e) => setCommentDraft(e.target.value)}
                      disabled={isSavingComment}
                      sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", fontSize: 14, alignItems: "flex-start" } }}
                    />
                    <Button
                      variant="contained"
                      onClick={handleAddComment}
                      disabled={!commentDraft.trim() || isSavingComment}
                      sx={{ alignSelf: "flex-start", textTransform: "none", fontWeight: 600, borderRadius: "8px", background: "#1e3a5f", "&:hover": { background: "#1e40af" } }}
                    >
                      {isSavingComment ? "Saving..." : "Add comment"}
                    </Button>
                  </div>
                  <SimpleHistoryList
                    isLoading={isCommentsLoading}
                    isError={isCommentsError}
                    emptyLabel="No comments yet"
                    items={commentItems}
                  />
                </>
              ) : activeTab === 2 ? (
                <AttendanceTab
                  studentId={student.uid}
                  memberships={groupMemberships ?? []}
                  membershipsLoading={isGroupMembershipsLoading}
                  groupsById={groupsById}
                />
              ) : activeTab === 3 ? (
                <SimpleHistoryList
                  isLoading={isSmsLoading}
                  isError={isSmsError}
                  emptyLabel="No SMS sent yet"
                  items={(smsData ?? []).map((s) => ({ id: s.id, primary: s.text, secondary: s.status, date: s.createdAt }))}
                />
              ) : activeTab === 4 ? (
                <StudentHistoryTab studentId={student.uid} />
              ) : (
                <div
                  style={{
                    padding: "48px",
                    textAlign: "center",
                    color: "var(--color-text-muted)",
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


      <RemoveStudentDialog
        open={archiveOpen}
        onClose={() => { setArchiveOpen(false); setArchiveReasonId(""); setArchiveComment(""); setArchiveDeleteMode(false); }}
        onConfirm={handleArchive}
        reasonId={archiveReasonId}
        onReasonIdChange={setArchiveReasonId}
        reasons={archiveReasonOptions ?? []}
        reasonsLoading={reasonsLoading}
        reasonsError={reasonsError}
        comment={archiveComment}
        onCommentChange={setArchiveComment}
        recalculate={false}
        onRecalculateChange={() => {}}
        scope="all"
        onScopeChange={() => {}}
        showGroupScope={false}
        archiveLabel="Archive student"
        showDeleteToggle
        deleteMode={archiveDeleteMode}
        onDeleteModeChange={setArchiveDeleteMode}
        loading={isArchivingStudent}
      />

      <AddToGroupModal
        open={addToGroupOpen}
        onClose={() => setAddToGroupOpen(false)}
        onSubmit={async (groupId, joinedAt) => {
          const ok = await handleAddToGroup(groupId, joinedAt);
          if (ok) setAddToGroupOpen(false);
          return ok;
        }}
        groups={groupOptions}
        isSubmitting={isAddingToGroup}
      />

      <MoveToBranchModal
        open={moveBranchOpen}
        onClose={() => setMoveBranchOpen(false)}
        onSubmit={async (branchId, reason, paymentEndDate) => {
          const ok = await handleMoveToBranch(branchId, reason, paymentEndDate);
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
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            elevation: 0,
            sx: {
              mt: 1, minWidth: 220, borderRadius: "2px", py: 1,
              bgcolor: "var(--color-surface)", border: "1px solid var(--color-border)",
              boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
            },
          },
        }}
        MenuListProps={{ disablePadding: true }}
      >
        {([
          { action: "return", icon: <TbArrowBackUp size={22} />, label: t("studentPayments.actions.returnMoney", "Return money") },
          { action: "writeoff", icon: <TbCalculator size={22} />, label: t("studentPayments.actions.writeOff", "Write-off") },
        ] as const).map((item) => (
          <MenuItem
            key={item.action}
            onClick={() => {
              setPaymentMenuAnchor(null);
              setBalanceAction(item.action);
            }}
            sx={{
              gap: 2, px: 3, py: 1.75, fontSize: 16, color: "#e5484d",
              "&:hover": { bgcolor: "rgba(229,72,77,0.08)" },
            }}
          >
            {item.icon}
            {item.label}
          </MenuItem>
        ))}
      </Menu>

      <StudentBalanceActionDrawer
        action={balanceAction}
        onClose={() => setBalanceAction(null)}
        studentId={student.uid}
        studentName={student.name}
        memberships={groupMemberships ?? []}
      />

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
        isSaving={isUnfreezingGroup || isSavingMembershipDates}
        defaultDate={dateOnly(activateTarget?.joinedAt)}
      />

      <GraduateTrialModal
        open={Boolean(graduateTarget)}
        onClose={() => setGraduateTarget(null)}
        onConfirm={handleGraduateConfirm}
        isSaving={isGraduatingTrial || isSavingMembershipDates}
        joinedAt={dateOnly(graduateTarget?.joinedAt)}
      />

      {/* Return an ended membership to ACTIVE, picking the billing start date. */}
      <ActivateModal
        open={Boolean(restoreTarget)}
        onClose={() => setRestoreTarget(null)}
        onConfirm={handleRestoreConfirm}
        isSaving={isSavingMembershipDates}
      />

      <RemoveStudentDialog
        open={Boolean(archiveGroupTarget)}
        onClose={closeRemoveDialog}
        onConfirm={handleRemoveFromGroupConfirm}
        reasonId={removeReasonId}
        onReasonIdChange={setRemoveReasonId}
        reasons={archiveReasonOptions ?? []}
        reasonsLoading={reasonsLoading}
        reasonsError={reasonsError}
        showDeleteToggle
        deleteMode={removeDeleteMode}
        onDeleteModeChange={setRemoveDeleteMode}
        comment={removeComment}
        onCommentChange={setRemoveComment}
        recalculate={false}
        onRecalculateChange={() => {}}
        scope={removeScope}
        onScopeChange={setRemoveScope}
        loading={isArchivingStudent}
      />
    </div>
  );
};