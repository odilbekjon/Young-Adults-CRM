// src/pages/Students.tsx
import React, { useState, useMemo, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControlLabel,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { MdDelete, MdMail, MdEdit, MdPayment, MdAdd } from "react-icons/md";
import { BsThreeDotsVertical, BsPersonPlus } from "react-icons/bs";
import { TbAdjustmentsHorizontal, TbColumns3 } from "react-icons/tb";
import { HiChevronDown } from "react-icons/hi";
import { IoClose, IoSearchOutline } from "react-icons/io5";
import { FiUser } from "react-icons/fi";

import { FlatStudent, mapApiStudentToFlat, formatDate } from "../../constants/FlatStudents";
import { ALL_COLUMNS, CONTACT_ICONS, BADGE_COLORS } from "../../constants/StudentsTable";
import { useNavigate } from "react-router-dom";

import { AddStudent } from "../../components/AddStudent";
import { AddPayment } from "../../components/AddPayment";
import { useAllStudentsQuery, useUpdateStudentMutation, useDeleteStudentMutation } from "../../app/api/studentsApi";
import { useToast } from "../../Context/ToastContext";

import { SendSmsModal } from "../../components/SendSmsModal";

/* ─── TYPES ─────────────────────────────────────────── */
type SortDir = "asc" | "desc";
type SortKey = keyof FlatStudent | "";

interface Filters {
  search: string;
  teacher: string;
}

/* ─── STYLES ─────────────────────────────────────────── */
const inputSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "6px",
    fontSize: 13,
    bgcolor: "white",
    "& fieldset": { borderColor: "#d0d5dd" },
    "&:hover fieldset": { borderColor: "#a0aec0" },
    "&.Mui-focused fieldset": { borderColor: "#5c7fa3" },
  },
};

/* ─── ICON BUTTON HELPER (Header'dan ko'chirildi) ────── */
const IconBtn = ({ children, onClick, active, title }: {
  children: React.ReactNode; onClick?: () => void; active?: boolean; title?: string;
}) => (
  <button
    title={title}
    onClick={onClick}
    style={{
      width: 34, height: 34, border: "1px solid #e0e5ec", borderRadius: 8,
      background: active ? "#f0f4f9" : "#fff", display: "flex",
      alignItems: "center", justifyContent: "center", cursor: "pointer",
      color: "#6b7a8d", flexShrink: 0, transition: "background 0.15s, color 0.15s",
    }}
    onMouseEnter={(e) => {
      (e.currentTarget as HTMLButtonElement).style.background = "#f0f4f9";
      (e.currentTarget as HTMLButtonElement).style.color = "#1a2332";
    }}
    onMouseLeave={(e) => {
      (e.currentTarget as HTMLButtonElement).style.background = active ? "#f0f4f9" : "#fff";
      (e.currentTarget as HTMLButtonElement).style.color = "#6b7a8d";
    }}
  >
    {children}
  </button>
);

/* ─── DROPDOWN FILTER ────────────────────────────────── */
interface DropdownProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (val: string) => void;
  onClear: () => void;
}

const DropdownFilter = ({ label, value, options, onChange, onClear }: DropdownProps) => {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  return (
    <>
      <Button
        variant="outlined"
        size="small"
        endIcon={!value ? <HiChevronDown size={13} /> : undefined}
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{
          borderRadius: "6px",
          borderColor: value ? "#5c7fa3" : "#d0d5dd",
          color: value ? "#5c7fa3" : "#667085",
          bgcolor: value ? "#eef4f9" : "white",
          fontWeight: 400, fontSize: 13, px: 1.5, py: 0.6,
          textTransform: "none", whiteSpace: "nowrap",
          "&:hover": { borderColor: "#5c7fa3", bgcolor: "#eef4f9" },
        }}
      >
        {value ? (
          <Stack direction="row" alignItems="center" gap={0.5}>
            <span>{options.find((o) => o.value === value)?.label || value}</span>
            <IoClose size={13} onClick={(e) => { e.stopPropagation(); onClear(); }} />
          </Stack>
        ) : label}
      </Button>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        PaperProps={{ sx: { borderRadius: 2, minWidth: 160, mt: 0.5, boxShadow: "0 4px 16px rgba(0,0,0,0.1)" } }}
      >
        {options.map((o) => (
          <MenuItem
            key={o.value} selected={value === o.value}
            onClick={() => { onChange(o.value); setAnchor(null); }}
            sx={{ fontSize: 13 }}
          >
            {o.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

/* ─── ADD TO GROUP MODAL ─────────────────────────────── */
const AddToGroupModal = ({
  open,
  onClose,
  onSubmit,
  groups,
  selectedCount,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (groupId: string) => void;
  groups: { id: string; name: string }[];
  selectedCount: number;
}) => {
  const { t } = useTranslation();
  const [groupId, setGroupId] = useState("");

  const handleSubmit = () => {
    if (groupId) {
      onSubmit(groupId);
      setGroupId("");
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { borderRadius: "12px", width: 580, maxWidth: "95vw", p: 0 } }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ px: 3, py: 2.5 }}
      >
        <Box>
          <Typography fontWeight={600} fontSize={16} color="#111827">
            {t("students.addToGroup.title")}
          </Typography>
          {selectedCount > 0 && (
            <Typography fontSize={12} color="#6b7280" mt={0.3}>
              {t("students.addToGroup.studentsSelected", { count: selectedCount })}
            </Typography>
          )}
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: "#9ca3af" }}>
          <IoClose size={20} />
        </IconButton>
      </Stack>

      <Divider />

      <Box sx={{ px: 3, py: 3 }}>
        <TextField
          select
          fullWidth
          size="small"
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          SelectProps={{ displayEmpty: true }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: "8px",
              fontSize: 14,
              bgcolor: "white",
              "& fieldset": { borderColor: "#d0d5dd" },
              "&:hover fieldset": { borderColor: "#a0aec0" },
              "&.Mui-focused fieldset": { borderColor: "#5c7fa3" },
            },
          }}
        >
          <MenuItem value="" disabled sx={{ fontSize: 14, color: "#9ca3af" }}>
            {t("students.addToGroup.selectGroup")}
          </MenuItem>
          {groups.map((g) => (
            <MenuItem key={g.id} value={g.id} sx={{ fontSize: 14 }}>
              {g.name}
            </MenuItem>
          ))}
        </TextField>

        <Box mt={3}>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!groupId}
            sx={{
              borderRadius: "20px",
              py: 1.1, px: 3,
              fontWeight: 600, fontSize: 14,
              bgcolor: "#4bbfbf",
              "&:hover": { bgcolor: "#3aacac" },
              "&.Mui-disabled": { bgcolor: "#d0d5dd", color: "white" },
              boxShadow: "none",
              textTransform: "none",
            }}
          >
            {t("students.addToGroup.submit")}
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
};

/* ─── EDIT STUDENT DRAWER ────────────────────────────── */
const EditStudentDrawer = ({
  open, student, onClose, onSave, saving, error,
}: {
  open: boolean;
  student: FlatStudent | null;
  onClose: () => void;
  onSave: (uid: string, data: { name: string; phone: string }) => Promise<boolean>;
  saving?: boolean;
  error?: string | null;
}) => {
  const { t } = useTranslation();
  const [name,   setName]   = useState("");
  const [phone,  setPhone]  = useState("");
  const [dob,    setDob]    = useState("");
  const [gender, setGender] = useState("male");

  React.useEffect(() => {
    if (student) { setName(student.name); setPhone(student.phone); }
  }, [student]);

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: 420 } }}>
      <Stack
        direction="row" justifyContent="space-between" alignItems="center"
        sx={{ px: 3, py: 2.5, borderBottom: "1px solid #eaecf0", bgcolor: "white" }}
      >
        <Typography fontWeight={700} fontSize={17}>{t("students.editDrawer.title")}</Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: "#9ca3af" }}><IoClose size={20} /></IconButton>
      </Stack>

      <Box sx={{ px: 3, py: 2.5, overflowY: "auto", flex: 1, bgcolor: "#f8f9fa" }}>
        <Box mb={2.5}>
          <Typography fontSize={13} fontWeight={500} color="#344054" mb={0.8}>{t("students.editDrawer.phone")}</Typography>
          <Stack direction="row" gap={1}>
            <Box sx={{ border: "1px solid #d0d5dd", borderRadius: "6px", px: 1.5, display: "flex", alignItems: "center", bgcolor: "white", fontSize: 13, color: "#374151", whiteSpace: "nowrap", minWidth: 60, justifyContent: "center" }}>
              +998
            </Box>
            <TextField fullWidth size="small" value={phone} onChange={(e) => setPhone(e.target.value)} sx={inputSx} />
          </Stack>
        </Box>

        <Box mb={2.5}>
          <Typography fontSize={13} fontWeight={500} color="#344054" mb={0.8}>{t("students.editDrawer.name")}</Typography>
          <TextField fullWidth size="small" value={name} onChange={(e) => setName(e.target.value)} sx={inputSx} />
        </Box>

        <Box mb={2.5}>
          <Typography fontSize={13} fontWeight={500} color="#344054" mb={0.8}>{t("students.editDrawer.dob")}</Typography>
          <TextField fullWidth size="small" type="date" value={dob} onChange={(e) => setDob(e.target.value)} InputLabelProps={{ shrink: true }} sx={inputSx} />
        </Box>

        <Box mb={2.5}>
          <Typography fontSize={13} fontWeight={500} color="#344054" mb={0.8}>{t("students.editDrawer.gender")}</Typography>
          <RadioGroup row value={gender} onChange={(e) => setGender(e.target.value)} sx={{ gap: 3 }}>
            {[
              { value: "male", label: t("students.editDrawer.male") },
              { value: "female", label: t("students.editDrawer.female") },
            ].map((g) => (
              <FormControlLabel key={g.value} value={g.value}
                control={<Radio size="small" sx={{ color: "#d0d5dd", "&.Mui-checked": { color: "#5c7fa3" }, p: 0.5 }} />}
                label={<Typography fontSize={13} color="#374151">{g.label}</Typography>}
                sx={{ m: 0, gap: 0.5 }}
              />
            ))}
          </RadioGroup>
        </Box>

        <Box mb={2.5}>
          <Typography fontSize={13} fontWeight={500} color="#344054" mb={1}>{t("students.editDrawer.additionalContacts")}</Typography>
          <Stack direction="row" gap={1} flexWrap="wrap">
            {CONTACT_ICONS.map((item, i) => (
              <Tooltip key={i} title={t(`students.contacts.${item.key}`)} arrow>
                <IconButton size="small" sx={{ width: 40, height: 40, border: "1.5px solid #c5d4e3", borderRadius: "50%", color: "#5c7fa3", bgcolor: "white" }}>
                  {item.icon}
                </IconButton>
              </Tooltip>
            ))}
          </Stack>
        </Box>

        <Stack alignItems="flex-end" gap={0.5} mb={3}>
          <Button variant="text" size="small" sx={{ fontSize: 13, color: "#5c7fa3", textTransform: "none", p: 0, minWidth: 0 }}>{t("students.editDrawer.addToGroup")}</Button>
          <Button variant="text" size="small" sx={{ fontSize: 13, color: "#5c7fa3", textTransform: "none", p: 0, minWidth: 0 }}>{t("students.editDrawer.setPassword")}</Button>
        </Stack>

        {error && (
          <Typography fontSize={13} color="error" mb={1.5}>{error}</Typography>
        )}

        <Button
          variant="contained" fullWidth
          disabled={saving}
          onClick={async () => { if (!student) return; const ok = await onSave(student.uid, { name, phone }); if (ok) onClose(); }}
          sx={{ borderRadius: "20px", py: 1.2, fontWeight: 600, fontSize: 14, bgcolor: "#5c7fa3", "&:hover": { bgcolor: "#4a6a8a" }, boxShadow: "none", textTransform: "none" }}
        >
          {saving ? t("students.editDrawer.saving") : t("students.editDrawer.submit")}
        </Button>
      </Box>
    </Drawer>
  );
};


/* ══════════════════════════════════════════
   Quick Add Dropdown (➕)
══════════════════════════════════════════ */
const QuickAddBtn = ({ onAddStudent, onAddPayment }: {
  onAddStudent: () => void; onAddPayment: () => void;
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const items = [
    { label: t("quickAdd.addStudent"), emoji: "🎓", action: onAddStudent },
    { label: t("quickAdd.addPayment"), emoji: "💳", action: onAddPayment },
  ];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <IconBtn onClick={() => setOpen((p) => !p)} title={t("quickAdd.addStudent")} active={open}>
        <MdAdd size={18} />
      </IconBtn>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", left: 0,
          background: "#fff", border: "1px solid #e0e5ec", borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 500,
          minWidth: 180, animation: "dropDown 0.15s ease", overflow: "hidden",
        }}>
          <style>{`@keyframes dropDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>
          {items.map((item) => (
            <div
              key={item.label}
              onClick={() => { setOpen(false); item.action(); }}
              style={{
                padding: "11px 16px", fontSize: 13, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 10,
                color: "#1a2332", transition: "background 0.1s",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = "#f7f8fa")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = "#fff")}
            >
              <span style={{ fontSize: 16 }}>{item.emoji}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── MAIN COMPONENT ─────────────────────────────────── */
export const Students = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();

  const [sendSmsOpen, setSendSmsOpen] = useState(false);

  const [page, setPage] = useState(1);
  const limit = 20;
  const { data: studentsData, isLoading: studentsLoading } = useAllStudentsQuery({ page, limit });
  const [updateStudent, { isLoading: isUpdatingStudent }] = useUpdateStudentMutation();
  const [deleteStudent, { isLoading: isDeletingStudent }] = useDeleteStudentMutation();

  const [students, setStudents] = useState<FlatStudent[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (studentsData) setStudents(studentsData.data.map(mapApiStudentToFlat));
  }, [studentsData]);

  const [selected,          setSelected]          = useState<string[]>([]);
  const [sortKey,           setSortKey]           = useState<SortKey>("");
  const [sortDir,           setSortDir]           = useState<SortDir>("asc");
  const [visibleCols,       setVisibleCols]       = useState<string[]>(ALL_COLUMNS.map((c) => c.key));
  const [columnsAnchor,     setColumnsAnchor]     = useState<null | HTMLElement>(null);
  const [actionMenu,        setActionMenu]        = useState<{ el: HTMLElement; uid: string } | null>(null);
  const [deleteUid,         setDeleteUid]         = useState<string | null>(null);
 
  const [editDrawerOpen,    setEditDrawerOpen]    = useState(false);
  const [activeStudent,     setActiveStudent]     = useState<FlatStudent | null>(null);
  const [addToGroupOpen,    setAddToGroupOpen]    = useState(false);
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);

  const [filters, setFilters] = useState<Filters>({ search: "", teacher: "" });

  const setFilter = <K extends keyof Filters>(key: K, val: Filters[K]) =>
    setFilters((p) => ({ ...p, [key]: val }));

  const clearAll = () => setFilters({ search: "", teacher: "" });

  const hasFilters = Object.values(filters).some(Boolean);

  const TEACHERS_LIST = useMemo(() => {
    const names = new Set<string>();
    studentsData?.data.forEach((s) => (s.teachers ?? []).forEach((tch) => names.add(tch.name)));
    return Array.from(names);
  }, [studentsData]);

  const ALL_GROUPS = useMemo(() => {
    const groups = new Map<string, string>();
    studentsData?.data.forEach((s) => (s.groups ?? []).forEach((g) => groups.set(g.id, g.name)));
    return Array.from(groups, ([id, name]) => ({ id, name }));
  }, [studentsData]);

  // Backend hozircha sahifalash meta'sini qaytarmaydi; shu sababli joriy
  // sahifa hajmidan taxminiy meta hosil qilamiz, chunki bu maydon kelib
  // qolsa (studentsData.meta) to'g'ridan-to'g'ri ishlatiladi.
  const pageMeta = useMemo(() => {
    if (studentsData?.meta) return studentsData.meta;
    const count = studentsData?.data.length ?? 0;
    return {
      total: count,
      page,
      limit,
      totalPages: count < limit ? page : page + 1,
    };
  }, [studentsData, page, limit]);

  const filtered = useMemo(() => {
    return students
      .filter((s) => {
        const search = filters.search.toLowerCase();
        return (
          (!search || s.name.toLowerCase().includes(search) || s.phone.includes(search)) &&
          (!filters.teacher || s.teacher === filters.teacher)
        );
      })
      .sort((a, b) => {
        if (!sortKey) return 0;
        const av = String(a[sortKey as keyof FlatStudent] ?? "");
        const bv = String(b[sortKey as keyof FlatStudent] ?? "");
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      });
  }, [students, filters, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const allSelected = filtered.length > 0 && filtered.every((s) => selected.includes(s.uid));
  const toggleAll   = () => setSelected(allSelected ? [] : filtered.map((s) => s.uid));
  const toggleOne   = (uid: string) =>
    setSelected((p) => p.includes(uid) ? p.filter((x) => x !== uid) : [...p, uid]);

  const handleDeleteConfirm = async () => {
    if (!deleteUid) return;
    setActionError(null);
    try {
      await deleteStudent(deleteUid).unwrap();
      setSelected((p) => p.filter((x) => x !== deleteUid));
      setDeleteUid(null);
      toast.success(t("students.toast.deleted"));
    } catch {
      setActionError(t("students.deleteDialog.error"));
      toast.error(t("students.deleteDialog.error"));
    }
  };

  const handleBulkDelete = async () => {
    if (selected.length === 0) return;
    setActionError(null);
    try {
      await Promise.all(selected.map((uid) => deleteStudent(uid).unwrap()));
      setSelected([]);
      toast.success(t("students.toast.deleted"));
    } catch {
      setActionError(t("students.deleteDialog.error"));
      toast.error(t("students.deleteDialog.error"));
    }
  };

  const handleSaveEdit = async (uid: string, data: { name: string; phone: string }): Promise<boolean> => {
    setActionError(null);
    try {
      await updateStudent({ id: uid, name: data.name, phone: data.phone }).unwrap();
      toast.success(t("students.toast.updated"));
      return true;
    } catch {
      setActionError(t("students.editDrawer.error"));
      toast.error(t("students.editDrawer.error"));
      return false;
    }
  };

  const openActionMenu = (e: React.MouseEvent<HTMLButtonElement>, uid: string) => {
    e.stopPropagation();
    const student = students.find((s) => s.uid === uid) || null;
    setActiveStudent(student);
    setActionMenu(actionMenu?.uid === uid ? null : { el: e.currentTarget, uid });
  };

  const col = (key: string) => visibleCols.includes(key);

  const columnLabels: Record<string, string> = {
    photo: t("students.table.photo"),
    name: t("students.table.name"),
    phone: t("students.table.phone"),
    groups: t("students.table.groups"),
    teachers: t("students.table.teachers"),
    training: t("students.table.trainingDates"),
    balance: t("students.table.balance"),
    comment: t("students.table.comment"),
  };

  /* ── UI ─────────────────────────────────────────────── */
  return (
    <Box sx={{ p: 3, bgcolor: "#f8f9fa", minHeight: "100vh" }}>

      {/* HEADER */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2.5}>
        <Stack direction="row" alignItems="baseline" gap={1.5}>
          <Typography variant="h5" fontWeight={700} fontSize={26} color="#111827">{t("students.header.title")}</Typography>
          <Typography fontSize={14} color="#6b7280">{t("students.header.quantity", { count: studentsData ? pageMeta.total : filtered.length })}</Typography>
        </Stack>
        <Button
          variant="contained"
          onClick={() => setAddStudentOpen(true)}
          sx={{
            bgcolor: "#2d4a5a", color: "white", borderRadius: "8px",
            px: 3, py: 1.1, fontWeight: 700, fontSize: 13, letterSpacing: 0.5,
            textTransform: "uppercase", "&:hover": { bgcolor: "#1e3340" }, boxShadow: "none",
          }}
        >
          {t("students.header.addNew")}
        </Button>
      </Stack>

      {/* FILTER ROW */}
      <Stack
        direction="row" flexWrap="wrap" gap={1} mb={1.5}
        sx={{ bgcolor: "white", border: "1px solid #eaecf0", borderRadius: "8px", p: 1.5 }}
      >
        {/* Search */}
        <Box
          sx={{
            display: "flex", alignItems: "center", gap: 0.5,
            border: "1px solid #d0d5dd", borderRadius: "6px",
            px: 1.2, py: 0.6, bgcolor: "white", minWidth: 220,
          }}
        >
          <IoSearchOutline size={15} color="#9ca3af" />
          <input
            placeholder={t("students.filters.searchPlaceholder")}
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
            style={{ border: "none", outline: "none", fontSize: 13, color: "#374151", background: "transparent", width: "100%" }}
          />
          {filters.search && (
            <IoClose size={13} color="#9ca3af" style={{ cursor: "pointer" }} onClick={() => setFilter("search", "")} />
          )}
        </Box>

         <QuickAddBtn
            onAddStudent={() => setAddStudentOpen(true)}
            onAddPayment={() => setAddPaymentOpen(true)}
          />


        <DropdownFilter
          label={t("students.filters.byTeacher")} value={filters.teacher}
          options={TEACHERS_LIST.map((tch) => ({ value: tch, label: tch }))}
          onChange={(v) => setFilter("teacher", v)} onClear={() => setFilter("teacher", "")}
        />

        {hasFilters && (
          <Button
            size="small" startIcon={<IoClose />} onClick={clearAll} variant="outlined"
            sx={{ borderRadius: "6px", borderColor: "#d0d5dd", color: "#667085", fontSize: 12, px: 1.5, textTransform: "none" }}
          >
            {t("students.filters.clearAll")}
          </Button>
        )}
      </Stack>

      {/* COLUMNS + BULK ACTIONS */}
      <Stack direction="row" justifyContent="flex-end" alignItems="center" mb={1.5} gap={1}>
        {selected.length > 0 && (
          <Typography fontSize={13} color="text.secondary" sx={{ mr: "auto" }}>
            {t("students.table.selectedCount", { count: selected.length })}
          </Typography>
        )}
        <Button
          size="small" startIcon={<TbAdjustmentsHorizontal size={14} />} variant="outlined"
          sx={{ borderRadius: "6px", borderColor: "#d0d5dd", color: "#667085", fontSize: 12, px: 1.5, textTransform: "none" }}
        >
          {t("students.table.filters")}
        </Button>
        <Button
          size="small" startIcon={<TbColumns3 size={14} />} variant="outlined"
          onClick={(e) => setColumnsAnchor(e.currentTarget)}
          sx={{ borderRadius: "6px", borderColor: "#d0d5dd", color: "#667085", fontSize: 12, px: 1.5, textTransform: "none" }}
        >
          {t("students.table.columns")}
        </Button>
        <Menu
          anchorEl={columnsAnchor} open={Boolean(columnsAnchor)}
          onClose={() => setColumnsAnchor(null)}
          PaperProps={{ sx: { borderRadius: 2, minWidth: 160, mt: 0.5 } }}
        >
          {ALL_COLUMNS.map((c) => (
            <MenuItem
              key={c.key}
              onClick={() => setVisibleCols((p) => p.includes(c.key) ? p.filter((k) => k !== c.key) : [...p, c.key])}
              sx={{ fontSize: 13, gap: 1 }}
            >
              <Checkbox size="small" checked={visibleCols.includes(c.key)} sx={{ p: 0 }} />
              {columnLabels[c.key]}
            </MenuItem>
          ))}
        </Menu>
      </Stack>

      {/* TABLE */}
      <Paper sx={{ borderRadius: "12px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #eaecf0" }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow
                sx={{ "& th": { fontWeight: 600, fontSize: 13, color: "#374151", py: 1.5, borderBottom: "1px solid #eaecf0", bgcolor: "white" } }}
              >
                <TableCell sx={{ width: 32, pr: 0 }} />
                <TableCell sx={{ width: 32, pl: 0 }}>
                  <Checkbox size="small" checked={allSelected} onChange={toggleAll} sx={{ p: 0 }} />
                </TableCell>
                {col("photo")    && <TableCell>{t("students.table.photo")}</TableCell>}
                {col("name")     && <TableCell><TableSortLabel active={sortKey === "name"} direction={sortDir} onClick={() => handleSort("name")}>{t("students.table.name")}</TableSortLabel></TableCell>}
                {col("phone")    && <TableCell>{t("students.table.phone")}</TableCell>}
                {col("groups")   && <TableCell>{t("students.table.groups")}</TableCell>}
                {col("teachers") && <TableCell>{t("students.table.teachers")}</TableCell>}
                {col("training") && <TableCell>{t("students.table.trainingDates")}</TableCell>}
                {col("balance")  && <TableCell>{t("students.table.balance")}</TableCell>}
                {col("comment")  && <TableCell>{t("students.table.comment")}</TableCell>}
                <TableCell align="right">
                  <Stack direction="row" justifyContent="flex-end" gap={0.5}>
                    {/* Add to group */}
                    <Tooltip title={t("students.table.addToGroup")}>
                      <IconButton
                        size="small"
                        sx={{
                          color: selected.length > 0 ? "#5c7fa3" : "#9ca3af",
                          "&:hover": { bgcolor: selected.length > 0 ? "#eef4f9" : "transparent" },
                        }}
                        onClick={() => { if (selected.length > 0) setAddToGroupOpen(true); }}
                      >
                        <BsPersonPlus size={15} />
                      </IconButton>
                    </Tooltip>

                    {/* Mail */}
                    <Tooltip title={t("students.table.mailSelected")}>
                      <IconButton size="small" sx={{ color: "#9ca3af" }} onClick={() => { if (selected.length > 0) setSendSmsOpen(true); }}>
                        <MdMail />
                      </IconButton>
                    </Tooltip>

                    {/* Delete selected */}
                    <Tooltip title={t("students.table.deleteSelected")}>
                      <IconButton
                        size="small" sx={{ color: "#9ca3af" }}
                        onClick={handleBulkDelete}
                      >
                        <MdDelete size={15} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {filtered.map((s, i) => {
                const badge      = BADGE_COLORS[s.groupBadgeColor] ?? BADGE_COLORS.blue;
                const isSelected = selected.includes(s.uid);
                return (
                  <TableRow
                    key={s.uid}
                    hover
                    onClick={() => navigate(`/students/${s.uid}`)}
                    sx={{
                      "& td": { borderBottom: "1px solid #f3f4f6", py: 1.4, fontSize: 13 },
                      "&:last-child td": { borderBottom: "none" },
                      bgcolor: isSelected ? "#f0f7ff" : "white",
                      "&:hover": { bgcolor: isSelected ? "#e8f2ff" : "#f9fafb", cursor: "pointer" },
                    }}
                  >
                    <TableCell sx={{ color: "#9ca3af", fontSize: 12, pr: 0, width: 32 }}>{i + 1}.</TableCell>
                    <TableCell sx={{ pl: 0, width: 32 }} onClick={(e) => e.stopPropagation()}>
                      <Checkbox size="small" checked={isSelected} onChange={() => toggleOne(s.uid)} sx={{ p: 0 }} />
                    </TableCell>

                    {col("photo") && (
                      <TableCell>
                        <Avatar sx={{ width: 34, height: 34, fontSize: 13, fontWeight: 700, bgcolor: "#d1d9e0", color: "#6b7280" }}>
                          <FiUser size={16} />
                        </Avatar>
                      </TableCell>
                    )}
                    {col("name") && (
                      <TableCell sx={{ fontWeight: 500, color: "#111827", minWidth: 160 }}>{s.name}</TableCell>
                    )}
                    {col("phone") && (
                      <TableCell><Typography fontSize={13} color="#5c7fa3">{s.phone}</Typography></TableCell>
                    )}
                    {col("groups") && (
                      <TableCell sx={{ minWidth: 220 }}>
                        <Stack direction="row" alignItems="center" gap={0.5} flexWrap="wrap">
                          <Chip
                            label={s.groupBadge} size="small"
                            sx={{ fontSize: 10, height: 20, fontWeight: 600, bgcolor: badge.bg, color: badge.color, borderRadius: "4px" }}
                          />
                          <Typography fontSize={13} color="#374151">{s.groupName}</Typography>
                          <Typography fontSize={12} color="#9ca3af">({s.groupSchedule.split("• ")[1] || ""})</Typography>
                        </Stack>
                      </TableCell>
                    )}
                    {col("teachers") && (
                      <TableCell sx={{ minWidth: 140, color: "#374151" }}>{s.teacher}</TableCell>
                    )}
                    {col("training") && (
                      <TableCell sx={{ minWidth: 120 }}>
                        <Typography fontSize={13} color="#9ca3af">{formatDate(s.startDate)} —</Typography>
                        <Typography fontSize={13} color="#9ca3af">{formatDate(s.endDate)}</Typography>
                      </TableCell>
                    )}
                    {col("balance") && (
                      <TableCell>
                        <Typography fontSize={13} fontWeight={500} color={(s.balance ?? 0) < 0 ? "#ef4444" : "#16a34a"}>
                          {(s.balance ?? 0).toLocaleString("ru-RU")}
                        </Typography>
                      </TableCell>
                    )}
                    {col("comment") && <TableCell />}

                    {/* ACTIONS */}
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <IconButton size="small" onClick={(e) => openActionMenu(e, s.uid)} sx={{ color: "#6b7280" }}>
                        <BsThreeDotsVertical size={15} />
                      </IconButton>
                      <Menu
                        anchorEl={actionMenu?.uid === s.uid ? actionMenu.el : null}
                        open={actionMenu?.uid === s.uid}
                        onClose={() => setActionMenu(null)}
                        PaperProps={{ sx: { borderRadius: 2, minWidth: 170, boxShadow: "0 4px 20px rgba(0,0,0,0.13)", border: "1px solid #f0f0f0" } }}
                        transformOrigin={{ horizontal: "right", vertical: "top" }}
                        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
                      >
                        <MenuItem onClick={() => { setActionMenu(null); setEditDrawerOpen(true); }} sx={{ fontSize: 13, gap: 1.2, py: 1.2, color: "#374151" }}>
                          <MdEdit size={16} color="#6b7280" /> {t("students.actions.editStudent")}
                        </MenuItem>
                        <Divider sx={{ my: 0.5 }} />
                        <MenuItem onClick={() => { setActionMenu(null); setAddPaymentOpen(true); }} sx={{ fontSize: 13, gap: 1.2, py: 1.2, color: "#16a34a" }}>
                          <MdPayment size={16} color="#16a34a" /> {t("students.actions.addPayment")}
                        </MenuItem>
                        <Divider sx={{ my: 0.5 }} />
                        <MenuItem onClick={() => { setActionMenu(null); setDeleteUid(s.uid); }} sx={{ fontSize: 13, gap: 1.2, py: 1.2, color: "#ef4444" }}>
                          <MdDelete size={16} /> {t("students.actions.remove")}
                        </MenuItem>
                      </Menu>
                    </TableCell>
                  </TableRow>
                );
              })}

              {!studentsLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} align="center" sx={{ py: 6, color: "#9ca3af" }}>
                    {t("students.table.noStudentsFound")}
                  </TableCell>
                </TableRow>
              )}
              {studentsLoading && (
                <TableRow>
                  <TableCell colSpan={12} align="center" sx={{ py: 6, color: "#9ca3af" }}>
                    {t("students.table.loading")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* PAGINATION */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 3, py: 1.5, borderTop: "1px solid #f3f4f6" }}>
          <Typography fontSize={13} color="text.secondary">
            {studentsData
              ? t("students.pagination.range", {
                  from: pageMeta.total === 0 ? 0 : (pageMeta.page - 1) * pageMeta.limit + 1,
                  to: Math.min(pageMeta.page * pageMeta.limit, pageMeta.total),
                  total: pageMeta.total,
                })
              : t("students.pagination.range", { from: 0, to: 0, total: 0 })}
          </Typography>
          <Stack direction="row" gap={0.5}>
            <Button
              size="small" variant="outlined"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              sx={{ minWidth: 32, px: 1, borderColor: "#e5e7eb", color: "#374151", borderRadius: "6px", fontSize: 13 }}
            >
              {"<"}
            </Button>
            <Button
              size="small" variant="outlined"
              disabled={!studentsData || page >= pageMeta.totalPages}
              onClick={() => setPage((p) => (studentsData && p < pageMeta.totalPages ? p + 1 : p))}
              sx={{ minWidth: 32, px: 1, borderColor: "#e5e7eb", color: "#374151", borderRadius: "6px", fontSize: 13 }}
            >
              {">"}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* ── MODALS & DRAWERS ─────────────────────────────── */}

      <AddStudent open={addStudentOpen} onClose={() => setAddStudentOpen(false)} />
      <AddPayment open={addPaymentOpen} onClose={() => setAddPaymentOpen(false)} />

      <EditStudentDrawer
        open={editDrawerOpen}
        student={activeStudent}
        onClose={() => setEditDrawerOpen(false)}
        onSave={handleSaveEdit}
        saving={isUpdatingStudent}
        error={actionError}
      />
      <AddToGroupModal
        open={addToGroupOpen}
        onClose={() => setAddToGroupOpen(false)}
        groups={ALL_GROUPS}
        selectedCount={selected.length}
        onSubmit={(groupId) => {
          console.log("Add students to group:", groupId, selected);
          // Real logika shu yerda
        }}
      />

      <SendSmsModal
        open={sendSmsOpen}
        onClose={() => setSendSmsOpen(false)}
        selectedCount={selected.length}
      />

      {/* Delete dialog */}
      <Dialog open={Boolean(deleteUid)} onClose={() => setDeleteUid(null)} PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>{t("students.deleteDialog.title")}</DialogTitle>
        <DialogContent>
          <Typography fontSize={14} color="text.secondary">{t("students.deleteDialog.message")}</Typography>
          {actionError && (
            <Typography fontSize={13} color="error" mt={1.5}>{actionError}</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteUid(null)} disabled={isDeletingStudent} sx={{ color: "#667085" }}>{t("students.deleteDialog.cancel")}</Button>
          <Button variant="contained" color="error" disabled={isDeletingStudent} onClick={handleDeleteConfirm} sx={{ borderRadius: 2 }}>{t("students.deleteDialog.confirm")}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};