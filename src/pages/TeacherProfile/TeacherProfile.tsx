// src/pages/teachers/TeacherProfile.tsx

import { useState, useRef, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IconButton, Button, CircularProgress } from "@mui/material";
import { IoArrowBack } from "react-icons/io5";
import { MdEdit, MdClose } from "react-icons/md";
import { BsFlag } from "react-icons/bs";
import { useTeacherByIdQuery, useTeacherForEditQuery, useUpdateTeacherMutation, useTeacherHistoryQuery } from "../../app/api/teachersApi";
import type { Teacher, TeacherGender } from "../../app/api/teachersApi/types";
import { useAllBranchesQuery } from "../../app/api/branchesApi";
import { useAllGroupsQuery } from "../../app/api/groupsApi";
import { useTeacherSalariesQuery } from "../../app/api/salariesApi";
import { useLazyStudentByIdQuery, useLazyStudentCommentsQuery } from "../../app/api/studentsApi";
import type { StudentDetail, StudentComment } from "../../app/api/studentsApi/types";
import { useToast } from "../../Context/ToastContext";
import { DatePickerField } from "../SingleGroup/DatePickerField";
import { StudentHoverCard } from "../SingleGroup/StudentHoverCard";
import type { StudentCardData } from "../SingleGroup/types";
import { formatDate as formatFullDate } from "../../constants/FlatStudents";

const BADGE_COLORS = [
  { bg: "#E6F1FB", color: "#185FA5", border: "#B5D4F4" },
  { bg: "#E1F5EE", color: "#0F6E56", border: "#9FE1CB" },
  { bg: "#FAEEDA", color: "#BA7517", border: "#FAC775" },
];

const AVATAR_COLORS = [
  { bg: "#E6F1FB", text: "#185FA5" },
  { bg: "#E1F5EE", text: "#0F6E56" },
  { bg: "#FAEEDA", text: "#BA7517" },
  { bg: "#FBEAF0", text: "#993556" },
  { bg: "#EAF3DE", text: "#3B6D11" },
];

function hashIndex(id: string, mod: number) {
  let sum = 0;
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
  return sum % mod;
}
function getAvatarColor(id: string) {
  return AVATAR_COLORS[hashIndex(id, AVATAR_COLORS.length)];
}
function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}
function formatDate(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  if (!y || !m || !day) return d;
  return `${day}.${m}.${y}`;
}

/* ── group shape derived from real groupsApi data for this teacher ── */
interface ProfileGroupStudent {
  id: string;
  name: string;
  phone: string;
}
interface ProfileGroup {
  id: string;
  name: string;
  courseName: string;
  startDate: string | null;
  endDate: string | null;
  schedule: string;
  room: string;
  students: ProfileGroupStudent[];
}

type TabType = "profile" | "history" | "salary";

/* ── Edit Drawer ── */
const EditDrawer = ({
  teacher, open, onClose, branches, onSave, isSaving,
}: {
  teacher: Teacher;
  open: boolean;
  onClose: () => void;
  branches: { id: string; name: string }[];
  onSave: (data: { name: string; phone: string; gender: TeacherGender | undefined; birthdate: string; branchIds: string[]; photo?: File }) => void;
  isSaving: boolean;
}) => {
  const [phone, setPhone] = useState(teacher.phone ?? "");
  const [name, setName] = useState(teacher.name ?? "");
  const [gender, setGender] = useState<TeacherGender | "">(teacher.gender ?? "");
  const [dob, setDob] = useState(teacher.birthdate ?? "");
  const [selectedBranches, setSelectedBranches] = useState<string[]>(
    teacher.branches?.map((b) => b.id) ?? []
  );
  const [photo, setPhoto] = useState<File | undefined>(undefined);

  useEffect(() => {
    if (open) {
      setPhone(teacher.phone ?? "");
      setName(teacher.name ?? "");
      setGender(teacher.gender ?? "");
      setDob(teacher.birthdate ?? "");
      setSelectedBranches(teacher.branches?.map((b) => b.id) ?? []);
      setPhoto(undefined);
    }
  }, [open, teacher]);

  const toggleBranch = (b: string) =>
    setSelectedBranches((prev) => prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]);

  const inputStyle: React.CSSProperties = {
    width: "100%", border: "1px solid #e0e0e0", borderRadius: 8,
    padding: "10px 12px", fontSize: 13, color: "#1a1a1a", outline: "none",
    boxSizing: "border-box", background: "#fff",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 13, fontWeight: 500, color: "#1a1a1a", marginBottom: 6, display: "block",
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.18)", zIndex: 1200, opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none", transition: "opacity 0.25s" }} />
      <div style={{ position: "fixed", top: 0, right: 0, width: 440, height: "100vh", background: "#fff", zIndex: 1300, boxShadow: "-4px 0 24px rgba(0,0,0,0.12)", transform: open ? "translateX(0)" : "translateX(100%)", transition: "transform 0.28s cubic-bezier(.4,0,.2,1)", display: "flex", flexDirection: "column", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 16px", borderBottom: "1px solid #f0f0f0" }}>
          <span style={{ fontSize: 17, fontWeight: 600, color: "#1a1a1a" }}>Edit Teacher</span>
          <div onClick={onClose} style={{ cursor: "pointer", color: "#888", fontSize: 20 }}><MdClose /></div>
        </div>
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <label style={labelStyle}>Phone</label>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ ...inputStyle, width: 72, flexShrink: 0, color: "#555", display: "flex", alignItems: "center", justifyContent: "center" }}>+998</div>
              <input style={{ ...inputStyle, flex: 1 }} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="93 986 66 76" />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Name</label>
            <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Branches</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px" }}>
              {branches.map((b) => (
                <label key={b.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#1a1a1a", cursor: "pointer" }}>
                  <input type="checkbox" checked={selectedBranches.includes(b.id)} onChange={() => toggleBranch(b.id)} style={{ accentColor: "#185FA5", width: 15, height: 15 }} />
                  {b.name}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label style={labelStyle}>Date of birth</label>
            <DatePickerField value={dob} onChange={setDob} />
          </div>
          <div>
            <label style={labelStyle}>Gender</label>
            <div style={{ display: "flex", gap: 20 }}>
              {(["MALE", "FEMALE"] as const).map((g) => (
                <label key={g} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                  <input type="radio" name="gender" checked={gender === g} onChange={() => setGender(g)} style={{ accentColor: "#185FA5" }} />
                  {g === "MALE" ? "Male" : "Female"}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label style={labelStyle}>Photo</label>
            <div style={{ display: "flex", border: "1px solid #e0e0e0", borderRadius: 8, overflow: "hidden" }}>
              <div style={{ flex: 1, padding: "10px 12px", fontSize: 13, color: photo ? "#1a1a1a" : "#aaa" }}>{photo ? photo.name : "No file chosen"}</div>
              <label style={{ padding: "10px 18px", background: "#f5f5f5", borderLeft: "1px solid #e0e0e0", fontSize: 13, color: "#1a1a1a", cursor: "pointer", userSelect: "none" }}>
                Browse<input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => setPhoto(e.target.files?.[0])} />
              </label>
            </div>
          </div>
          <button
            onClick={() => onSave({ name, phone, gender: gender || undefined, birthdate: dob, branchIds: selectedBranches, photo })}
            disabled={isSaving}
            style={{ background: "#1a3a5c", color: "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 600, cursor: "pointer", alignSelf: "flex-start", opacity: isSaving ? 0.7 : 1 }}
          >
            {isSaving ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : "Submit"}
          </button>
        </div>
      </div>
    </>
  );
};

/* ── Flag Dropdown ── */
const FlagDropdown = ({ open, onClose, anchorRef }: { open: boolean; onClose: () => void; anchorRef: React.RefObject<HTMLDivElement> }) => {
  const [comment, setComment] = useState("");
  const dropRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (open && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 8, left: rect.left });
    }
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node) && anchorRef.current && !anchorRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose, anchorRef]);

  if (!open) return null;
  return (
    <div ref={dropRef} style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 1400, background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.13)", padding: "16px", width: 280, animation: "dropDown 0.18s ease" }}>
      <style>{`@keyframes dropDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a", display: "flex", alignItems: "center", gap: 6 }}>
          <BsFlag size={14} color="#e05c5c" /> Add Comment
        </span>
        <MdClose size={16} color="#aaa" style={{ cursor: "pointer" }} onClick={onClose} />
      </div>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write a comment..." style={{ width: "100%", minHeight: 90, border: "1px solid #e0e0e0", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#1a1a1a", outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
        <button onClick={onClose} style={{ padding: "8px 14px", fontSize: 12, border: "1px solid #e0e0e0", borderRadius: 8, background: "#fff", cursor: "pointer", color: "#888" }}>Cancel</button>
        <button onClick={() => { onClose(); setComment(""); }} style={{ padding: "8px 14px", fontSize: 12, border: "none", borderRadius: 8, background: "#1a3a5c", color: "#fff", cursor: "pointer", fontWeight: 600 }}>Save</button>
      </div>
    </div>
  );
};

/* ── GroupCard ── */
const GroupCard = ({ group, index, isSelected, onSelect }: { group: ProfileGroup; index: number; isSelected: boolean; onSelect: () => void }) => {
  const badgeStyle = BADGE_COLORS[index % BADGE_COLORS.length];
  return (
    <div onClick={onSelect} style={{ border: isSelected ? "1.5px solid #185FA5" : "1px solid #e8e8e8", borderRadius: 10, padding: "11px 14px", cursor: "pointer", background: isSelected ? "#f7fbff" : "#fff", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flexShrink: 0, width: 110 }}>
        <span style={{ display: "inline-block", fontSize: 10, fontWeight: 500, padding: "2px 7px", borderRadius: 5, background: badgeStyle.bg, color: badgeStyle.color, border: `1px solid ${badgeStyle.border}`, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{group.courseName}</span>
        <div style={{ fontSize: 13, fontWeight: 500, color: "#1a1a1a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{group.name}</div>
      </div>
      <div style={{ flex: 1, textAlign: "center", fontSize: 11, color: "#888", lineHeight: 1.6 }}>
        <div>{formatDate(group.startDate)} — {formatDate(group.endDate)}</div>
        <div>{group.schedule}</div>
      </div>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: "#1a3a5c", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
        {group.students.length}
      </div>
    </div>
  );
};

/* ── StudentRow ── */
const StudentRow = ({
  student, isLast, onNavigate, onHoverEnter, onHoverLeave,
}: {
  student: ProfileGroupStudent;
  isLast: boolean;
  onNavigate: (id: string) => void;
  onHoverEnter: (e: React.MouseEvent<HTMLElement>, student: ProfileGroupStudent) => void;
  onHoverLeave: () => void;
}) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={() => onNavigate(student.id)}
      onMouseEnter={(e) => { setHovered(true); onHoverEnter(e, student); }}
      onMouseLeave={() => { setHovered(false); onHoverLeave(); }}
      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 16px", borderBottom: !isLast ? "1px solid #f5f5f5" : "none", cursor: "pointer", background: hovered ? "#f7fbff" : "transparent", transition: "background 0.12s" }}
    >
      <span style={{ fontSize: 12, color: hovered ? "#185FA5" : "#1a1a1a", fontWeight: hovered ? 500 : 400, transition: "color 0.12s" }}>{student.name}</span>
      <span style={{ fontSize: 11, color: "#888" }}>{student.phone}</span>
    </div>
  );
};

/* ── StudentsList ── */
const StudentsList = ({
  group, onGoToGroup, onNavigateToStudent, onHoverEnter, onHoverLeave,
}: {
  group: ProfileGroup;
  onGoToGroup: () => void;
  onNavigateToStudent: (id: string) => void;
  onHoverEnter: (e: React.MouseEvent<HTMLElement>, student: ProfileGroupStudent) => void;
  onHoverLeave: () => void;
}) => {
  return (
    <div style={{ border: "1px solid #e8e8e8", borderRadius: 12, overflow: "hidden", background: "#fff", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid #f0f0f0", background: "#fafafa" }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: "#1a1a1a" }}>{group.name}</div>
        <div style={{ fontSize: 12, color: "#888", marginTop: 3 }}>
          Room: <strong style={{ color: "#1a1a1a" }}>{group.room}</strong>
        </div>
      </div>
      <div style={{ overflowY: "auto", maxHeight: 360 }}>
        {group.students.map((s, idx) => (
          <StudentRow
            key={s.id}
            student={s}
            isLast={idx === group.students.length - 1}
            onNavigate={onNavigateToStudent}
            onHoverEnter={onHoverEnter}
            onHoverLeave={onHoverLeave}
          />
        ))}
      </div>
      <div style={{ padding: "10px 16px", borderTop: "1px solid #f0f0f0", textAlign: "right" }}>
        <span onClick={onGoToGroup} style={{ fontSize: 12, color: "#185FA5", cursor: "pointer", fontWeight: 500 }}>Go to group →</span>
      </div>
    </div>
  );
};


/* ══════════════════════════════════════════
   HistoryTab
══════════════════════════════════════════ */
const HistoryTab = ({ teacherId }: { teacherId: string }) => {
  const { t } = useTranslation();
  const { data: entries, isLoading, isError } = useTeacherHistoryQuery(teacherId, { skip: !teacherId });

  if (isLoading) {
    return <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><CircularProgress size={26} /></div>;
  }
  if (isError) {
    return <div style={{ textAlign: "center", padding: 40, color: "#e53935", fontSize: 14 }}>{t("teacherProfile.history.loadError")}</div>;
  }
  if (!entries || entries.length === 0) {
    return <div style={{ textAlign: "center", padding: 40, color: "#aaa", fontSize: 14 }}>{t("teacherProfile.history.emptyState")}</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 860 }}>
      {entries.map((entry) => (
        <div
          key={entry.id}
          style={{
            background: "#fff",
            border: "1px solid #e8e8e8",
            borderRadius: 12,
            padding: "18px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <div style={{ fontSize: 17, fontWeight: 500, color: "#1a1a1a", marginBottom: entry.detail ? 8 : 0 }}>
              {t(`teacherProfile.history.types.${entry.type}`, { defaultValue: entry.type.toLowerCase().split("_").filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ") || "—" })}
            </div>
            {entry.detail && (
              <div style={{ fontSize: 13, color: "#555" }}>{entry.detail}</div>
            )}
          </div>

          <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 24 }}>
            {entry.createdAt && (
              <div style={{ fontSize: 13, color: "#888" }}>{new Date(entry.createdAt).toLocaleString()}</div>
            )}
            {entry.actor && (
              <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>{entry.actor}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

/* ══════════════════════════════════════════
   SalaryTab — GET /salaries/teacher/{teacherId}
   ("O'qituvchi profilidagi Oyliklar tarixi"):
   the teacher's published/paid payroll history.
══════════════════════════════════════════ */
const SalaryTab = ({ teacherId }: { teacherId: string }) => {
  const { t } = useTranslation();
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const { data, isLoading, isError } = useTeacherSalariesQuery(teacherId, { skip: !teacherId });

  const all = useMemo(() => data ?? [], [data]);

  // The endpoint takes no period parameter, so the month picker filters the
  // returned history and its options come from the periods actually present.
  const months = useMemo(() => {
    const keys = all
      .filter((r) => r.periodYear && r.periodMonth)
      .map((r) => `${r.periodYear}-${String(r.periodMonth).padStart(2, "0")}`);
    return [...new Set(keys)].sort().reverse();
  }, [all]);

  const rows = useMemo(
    () =>
      selectedMonth
        ? all.filter((r) => `${r.periodYear}-${String(r.periodMonth).padStart(2, "0")}` === selectedMonth)
        : all,
    [all, selectedMonth]
  );

  const total = rows.reduce((sum, r) => sum + r.totalAmount, 0);

  const thStyle: React.CSSProperties = {
    padding: "12px 14px",
    fontSize: 13,
    fontWeight: 500,
    color: "#6b7280",
    textAlign: "left",
    borderBottom: "1px solid #e8e8e8",
    whiteSpace: "nowrap",
  };
  const tdStyle: React.CSSProperties = {
    padding: "12px 14px",
    fontSize: 13,
    color: "#1a1a1a",
    borderBottom: "1px solid #f2f2f2",
    whiteSpace: "nowrap",
  };

  const statusLabel = (status: string) => {
    const key = status.toLowerCase();
    return ["draft", "published", "paid"].includes(key)
      ? t(`finance.salaries.payrolls.status.${key}`)
      : status || "—";
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          style={{ border: "1px solid #e0e0e0", borderRadius: 6, padding: "5px 10px", fontSize: 13, color: "#1a1a1a", outline: "none", background: "#fff", cursor: "pointer" }}
        >
          <option value="">—</option>
          {months.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      <div style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>
        Total: <span style={{ color: "#1a1a1a", fontWeight: 500 }}>{total.toLocaleString("ru-RU")}</span>
      </div>

      <div style={{ border: "1px solid #e8e8e8", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#fff" }}>
              {[
                t("finance.salaries.payrolls.table.period"),
                t("finance.salaries.payrolls.table.status"),
                t("finance.salaries.payrolls.table.total"),
                t("finance.salaries.payrolls.table.paid"),
              ].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", padding: "32px 0" }}>
                  <CircularProgress size={24} />
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", padding: "32px 0", fontSize: 14, color: "#e53935" }}>
                  {t("finance.salaries.payrolls.loadError")}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", padding: "32px 0", fontSize: 14, color: "#aaa" }}>
                  {t("finance.salaries.payrolls.noData")}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td style={tdStyle}>
                    {r.periodYear && r.periodMonth
                      ? `${String(r.periodMonth).padStart(2, "0")}.${r.periodYear}`
                      : "—"}
                  </td>
                  <td style={tdStyle}>{statusLabel(r.status)}</td>
                  <td style={tdStyle}>{r.totalAmount.toLocaleString("ru-RU")}</td>
                  <td style={tdStyle}>{r.paidAmount.toLocaleString("ru-RU")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   Main — TeacherProfile
══════════════════════════════════════════ */
export const TeacherProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabType>("profile");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);
  const flagAnchorRef = useRef<HTMLDivElement>(null);

  // Student hover card (same shared component/pattern as SingleGroup) — the
  // group roster here only carries id/name/phone, so balance/status/comments
  // are lazy-fetched per student the moment a row is hovered.
  const [hoverStudent, setHoverStudent] = useState<StudentCardData | null>(null);
  const [hoverAnchorEl, setHoverAnchorEl] = useState<HTMLElement | null>(null);
  const hoverRequestId = useRef<string | null>(null);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [fetchStudentDetail] = useLazyStudentByIdQuery();
  const [fetchStudentComments] = useLazyStudentCommentsQuery();

  const { data: teacherData, isLoading: teacherLoading } = useTeacherByIdQuery(id ?? "", { skip: !id });
  // Tahrirlash formasi ochilganda maxsus /for-edit endpointidan yangi
  // ma'lumot olamiz (profil ko'rish endpointidan farqli, tahrirlashga
  // moslangan snapshot bo'lishi mumkin).
  const { data: teacherForEditData } = useTeacherForEditQuery(id ?? "", { skip: !id || !editOpen });
  const { data: branchesData } = useAllBranchesQuery();
  const { data: allGroupsData } = useAllGroupsQuery({ page: 1, limit: 100 });
  const [updateTeacher, { isLoading: isSaving }] = useUpdateTeacherMutation();

  const teacher = teacherData?.data;
  // GET /branches includes soft-deleted/deactivated branches — this list
  // feeds the edit drawer's branch-assignment picker, so it's filtered to
  // ACTIVE only (same convention as Header's own branch dropdown).
  const branches = (branchesData?.data ?? []).filter((b) => b.status === "ACTIVE");

  // Backend `GET /teachers/{id}` javobida guruhlar ro'yxati yo'q — bu
  // ro'yxat mavjud groupsApi ma'lumotidan (guruhning teachers[] massivi
  // orqali) hisoblanadi, yangi endpoint o'ylab topilmadi.
  const teacherGroups: ProfileGroup[] = useMemo(() => {
    if (!teacher) return [];
    return (allGroupsData?.data ?? [])
      .filter((g) => g.teachers.some((tch) => tch.id === teacher.id))
      .map((g) => ({
        id: g.id,
        name: g.name,
        courseName: g.course?.name ?? "—",
        startDate: g.trainingStart,
        endDate: g.trainingEnd,
        schedule: `${g.daysType === "EVEN" ? "Even days" : g.daysType === "ODD" ? "Odd days" : g.daysType ?? "—"} • ${g.time ?? ""}`,
        room: g.room?.name ?? "—",
        students: g.students.map((s) => ({ id: s.id, name: s.name, phone: s.phone })),
      }));
  }, [allGroupsData, teacher]);

  const handleSaveTeacher = async (data: { name: string; phone: string; gender: TeacherGender | undefined; birthdate: string; branchIds: string[]; photo?: File }) => {
    if (!id) return;
    try {
      await updateTeacher({
        id,
        name: data.name,
        phone: data.phone || undefined,
        gender: data.gender,
        birthdate: data.birthdate || undefined,
        branchIds: data.branchIds,
        photo: data.photo,
      }).unwrap();
      toast.success(t("teacherProfile.toast.updated"));
      setEditOpen(false);
    } catch {
      toast.error(t("teacherProfile.toast.error"));
    }
  };

  // `detail`/`comments` (GET /students/{id}, GET /students/{id}/comments)
  // carry the real balance/status/comments this group roster doesn't —
  // merged in once the hover fetch resolves, same pattern as SingleGroup's
  // own StudentHoverCard wiring.
  function buildHoverData(student: ProfileGroupStudent, detail?: StudentDetail | null, comments?: StudentComment[]): StudentCardData {
    return {
      id: hashIndex(student.id, 1000) + 1,
      uid: student.id,
      name: detail?.name ?? student.name,
      phone: detail?.phone ?? student.phone,
      active: detail ? detail.status === "ACTIVE" : true,
      status: detail?.status,
      balance: detail?.balance,
      addedAt: detail?.createdAt ? formatFullDate(detail.createdAt) : undefined,
      note: detail?.comment ?? undefined,
      comments,
    };
  }

  const handleStudentHoverEnter = (e: React.MouseEvent<HTMLElement>, student: ProfileGroupStudent) => {
    if (leaveTimeout.current) clearTimeout(leaveTimeout.current);
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    const target = e.currentTarget;
    hoverTimeout.current = setTimeout(() => {
      setHoverStudent(buildHoverData(student));
      setHoverAnchorEl(target);
      hoverRequestId.current = student.id;

      let latestDetail: StudentDetail | null | undefined;
      let latestComments: StudentComment[] | undefined;
      const mergeIfCurrent = () => {
        if (hoverRequestId.current !== student.id) return;
        setHoverStudent(buildHoverData(student, latestDetail, latestComments));
      };

      fetchStudentDetail(student.id)
        .then((res) => {
          if (!res.data) return;
          latestDetail = res.data.data;
          mergeIfCurrent();
        })
        .catch(() => {});
      fetchStudentComments(student.id)
        .then((res) => {
          if (!res.data) return;
          latestComments = res.data;
          mergeIfCurrent();
        })
        .catch(() => {});
    }, 200);
  };

  const handleStudentHoverLeave = () => {
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

  if (teacherLoading) {
    return <div style={{ padding: 40, textAlign: "center" }}><CircularProgress /></div>;
  }

  if (!teacher) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#888" }}>
        <p>Teacher not found.</p>
        <Button onClick={() => navigate("/teachers")} sx={{ mt: 2 }}>← Back to Teachers</Button>
      </div>
    );
  }

  const avatarColor = getAvatarColor(teacher.id);
  const activeGroupId = selectedGroupId ?? (teacherGroups[0]?.id ?? null);
  const activeGroup = teacherGroups.find((g) => g.id === activeGroupId);

  const tabs: { key: TabType; label: string }[] = [
    { key: "profile", label: "PROFILE" },
    { key: "history", label: "History" },
    { key: "salary", label: "Salary" },
  ];

  const iconBtn = (icon: React.ReactNode, onClick: () => void, ref?: React.RefObject<HTMLDivElement>) => (
    <div ref={ref} onClick={onClick}
      style={{ width: 30, height: 30, border: "1px solid #e0e0e0", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#888", background: "#fff", transition: "background 0.15s" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5f5")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
    >
      {icon}
    </div>
  );

  return (
    <div style={{ padding: "10px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, padding: "16px 0 0" }}>
        <IconButton size="small" onClick={() => navigate(-1)}><IoArrowBack size={18} /></IconButton>
        <span style={{ fontSize: 22, fontWeight: 500 }}>{teacher.name}</span>
      </div>

      <div style={{ display: "flex", borderBottom: "1px solid #eee", marginBottom: 24 }}>
        {tabs.map((tab) => (
          <div key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{ padding: "10px 18px 12px", cursor: "pointer", fontSize: 13, fontWeight: activeTab === tab.key ? 600 : 400, color: activeTab === tab.key ? "#185FA5" : "#888", borderBottom: activeTab === tab.key ? "2px solid #185FA5" : "2px solid transparent", transition: "all 0.15s" }}>
            {tab.label}
          </div>
        ))}
      </div>

      {activeTab === "profile" && (
        <div style={{ display: "grid", gridTemplateColumns: "400px 1fr 300px", gap: 20, alignItems: "start" }}>

          {/* Left */}
          <div style={{ border: "1px solid #e8e8e8", borderRadius: 12, padding: "20px 16px", background: "#fff", position: "relative" }}>
            <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 6 }}>
              {iconBtn(<BsFlag size={13} />, () => setFlagOpen((p) => !p), flagAnchorRef)}
              {iconBtn(<MdEdit size={13} />, () => setEditOpen(true))}
            </div>
            <div style={{ display: "flex" }}>
              {teacher.photo ? (
                <img src={teacher.photo} alt={teacher.name} style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", marginBottom: 10 }} />
              ) : (
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: avatarColor.bg, color: avatarColor.text, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 500, marginBottom: 10 }}>
                  {getInitials(teacher.name)}
                </div>
              )}
              <div style={{ marginLeft: 12, marginTop: 10, fontSize: 15, fontWeight: 500, color: "#1a1a1a" }}>{teacher.name}</div>
            </div>
            <div style={{ fontSize: 13, marginBottom: 4 }}>ID: <span style={{ color: "#185FA5", fontWeight: 500 }}>{teacher.id}</span></div>
            {teacher.phone && <div style={{ fontSize: 13, marginBottom: 4 }}>Phone: <span style={{ color: "#185FA5", fontWeight: 500 }}>{teacher.phone}</span></div>}
            <div style={{ fontSize: 13, marginBottom: 4 }}>Role: <span style={{ color: "#185FA5", fontWeight: 500 }}>Teacher</span></div>
            {teacher.email && <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>{teacher.email}</div>}
            {teacher.specialization && <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>{teacher.specialization}</div>}
            <hr style={{ border: "none", borderTop: "1px solid #f0f0f0", margin: "12px 0" }} />
            <div style={{ fontSize: 11, color: "#aaa", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.4px" }}>Status</div>
            <span style={{ display: "inline-block", fontSize: 12, padding: "4px 12px", borderRadius: 14, background: "#E6F1FB", color: "#185FA5", border: "1px solid #B5D4F4" }}>{teacher.status}</span>
            <div style={{ fontSize: 11, color: "#aaa", marginTop: 12, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.4px" }}>Branches</div>
            {(teacher.branches ?? []).length === 0 ? (
              <span style={{ fontSize: 12, color: "#aaa" }}>—</span>
            ) : (
              (teacher.branches ?? []).map((b) => (
                <span key={b.id} style={{ display: "inline-block", fontSize: 12, padding: "4px 12px", borderRadius: 14, background: "#E1F5EE", color: "#0F6E56", border: "1px solid #9FE1CB", marginRight: 6, marginBottom: 6 }}>{b.name}</span>
              ))
            )}
          </div>

          {/* Middle */}
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: "#1a1a1a", marginBottom: 12 }}>Groups</div>
            {teacherGroups.length === 0 ? (
              <div style={{ color: "#aaa", fontSize: 13, padding: "24px 0", textAlign: "center" }}>No groups assigned</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 440, overflowY: "auto", paddingRight: 2 }}>
                {teacherGroups.map((group, i) => (
                  <GroupCard key={group.id} group={group} index={i} isSelected={group.id === activeGroupId} onSelect={() => setSelectedGroupId(group.id === activeGroupId ? null : group.id)} />
                ))}
              </div>
            )}
          </div>

          {/* Right */}
          {activeGroup && (
            <StudentsList
              group={activeGroup}
              onGoToGroup={() => navigate(`/groups/${activeGroup.id}`)}
              onNavigateToStudent={(studentId) => navigate(`/students/${studentId}`)}
              onHoverEnter={handleStudentHoverEnter}
              onHoverLeave={handleStudentHoverLeave}
            />
          )}
        </div>
      )}

      {activeTab === "history" && <HistoryTab teacherId={teacher.id} />}
      {activeTab === "salary" && <SalaryTab teacherId={id ?? ""} />}

      <EditDrawer teacher={teacherForEditData?.data ?? teacher} open={editOpen} onClose={() => setEditOpen(false)} branches={branches} onSave={handleSaveTeacher} isSaving={isSaving} />
      <FlagDropdown open={flagOpen} onClose={() => setFlagOpen(false)} anchorRef={flagAnchorRef} />

      <div onMouseEnter={handleHoverCardMouseEnter} onMouseLeave={handleHoverCardMouseLeave}>
        <StudentHoverCard
          student={hoverStudent}
          anchorEl={hoverAnchorEl}
          onClose={() => { setHoverStudent(null); setHoverAnchorEl(null); }}
          onGoToProfile={() => {
            if (hoverStudent) {
              setHoverStudent(null);
              setHoverAnchorEl(null);
              navigate(`/students/${hoverStudent.uid}`);
            }
          }}
        />
      </div>
    </div>
  );
};
