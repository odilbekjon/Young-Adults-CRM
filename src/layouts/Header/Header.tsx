// src/components/Header/Header.tsx

import { useState, useRef, useEffect } from "react";
import { Box, Avatar, Typography, Menu, MenuItem } from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import { useBranch, BRANCH_OPTIONS, type BranchId } from "../../Context/BranchContext";
import { useData } from "../../Context/DataContext";
import type { FlatStudent } from "../../constants/FlatStudents";
import { SIDEBAR_WIDTH, HEADER_HEIGHT } from "../Sidebar/Sidebar";

import {
  MdSearch, MdFullscreen, MdFullscreenExit,
  MdHelpOutline, MdHistory, MdNotificationsNone,
  MdKeyboardArrowDown, MdAdd, MdClose, MdCalendarToday,
} from "react-icons/md";
import {
  BsTelephone, BsKey, BsPerson, BsEnvelope,
  BsTelegram, BsMortarboard, BsGeoAlt, BsCardText,
} from "react-icons/bs";

import logo from "../../assets/logo.svg";

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

const additionalIcons = [
  { icon: <BsTelephone size={16} />, label: "Phone" },
  { icon: <BsKey size={16} />, label: "Key" },
  { icon: <BsPerson size={16} />, label: "Contact" },
  { icon: <BsEnvelope size={16} />, label: "Email" },
  { icon: <BsTelegram size={16} />, label: "Telegram" },
  { icon: <BsMortarboard size={16} />, label: "Education" },
  { icon: <BsGeoAlt size={16} />, label: "Location" },
  { icon: <BsCardText size={16} />, label: "Card" },
];

const PAYMENT_METHODS = [
  ["Cash", "Click"],
  ["Card", "Uzum"],
  ["Bank account", "Humo"],
  ["Payme", ""],
];

/* ══════════════════════════════════════════
   Right Drawer (reusable)
══════════════════════════════════════════ */
const RightDrawer = ({
  open, onClose, title, width = 460, children,
}: {
  open: boolean; onClose: () => void; title: string; width?: number; children: React.ReactNode;
}) => (
  <>
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.18)",
        zIndex: 1200, opacity: open ? 1 : 0,
        pointerEvents: open ? "auto" : "none", transition: "opacity 0.25s",
      }}
    />
    <div
      style={{
        position: "fixed", top: 0, right: 0,
        width, height: "100vh", background: "#fff",
        zIndex: 1300, boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.28s cubic-bezier(.4,0,.2,1)",
        display: "flex", flexDirection: "column",
      }}
    >
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "20px 24px", borderBottom: "1px solid #f0f0f0", flexShrink: 0,
      }}>
        <span style={{ fontSize: 17, fontWeight: 600, color: "#1a1a1a" }}>{title}</span>
        <div onClick={onClose} style={{ cursor: "pointer", color: "#aaa", display: "flex" }}>
          <MdClose size={20} />
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
        {children}
      </div>
    </div>
  </>
);

/* ══════════════════════════════════════════
   Add Student Drawer
══════════════════════════════════════════ */
const AddStudentDrawer = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { groups, addStudent } = useData();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<"Male" | "Female" | "">("");
  const [comment, setComment] = useState("");
  const [showGroupField, setShowGroupField] = useState(false);
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [group, setGroup] = useState("");
  const [password, setPassword] = useState("");

  const handleClose = () => {
    setPhone(""); setName(""); setDob(""); setGender("");
    setComment(""); setGroup(""); setPassword("");
    setShowGroupField(false); setShowPasswordField(false);
    onClose();
  };

  const handleSubmit = () => {
    const firstGroup = groups[0];
    if (!firstGroup) { handleClose(); return; }
    const newStudent: FlatStudent = {
      uid: `${firstGroup.id}-${Date.now()}`,
      id: Date.now(),
      name: name || "Yangi O'quvchi",
      phone: `+998 ${phone}`,
      active: true,
      groupId: firstGroup.id,
      groupName: firstGroup.name,
      groupSchedule: firstGroup.schedule,
      groupBadge: firstGroup.badge,
      groupBadgeColor: firstGroup.badgeColor,
      course: firstGroup.course,
      teacher: firstGroup.teacher,
      teacherId: firstGroup.teacherId,
      startDate: firstGroup.startDate,
      endDate: firstGroup.endDate,
      branch: firstGroup.branch ?? "",
      room: firstGroup.room,
      price: firstGroup.price ?? 0,
      balance: 0,
    };
    addStudent(newStudent);
    handleClose();
  };

  return (
    <RightDrawer open={open} onClose={handleClose} title="Add New Student">
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

        {/* Phone */}
        <div>
          <label style={labelStyle}>Phone</label>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{
              ...inputStyle, width: 72, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#555", fontWeight: 500,
            }}>+998</div>
            <input
              style={{ ...inputStyle, flex: 1 }}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="90 123 45 67"
              type="tel"
            />
          </div>
        </div>

        {/* Name */}
        <div>
          <label style={labelStyle}>Name</label>
          <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        {/* Date of birth */}
        <div>
          <label style={labelStyle}>Date of birth</label>
          <div style={{ position: "relative" }}>
            <MdCalendarToday size={14} style={{
              position: "absolute", left: 12, top: "50%",
              transform: "translateY(-50%)", color: "#aaa", pointerEvents: "none",
            }} />
            <input
              type="date"
              style={{ ...inputStyle, paddingLeft: 34, color: dob ? "#1a1a1a" : "#aaa" }}
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
          </div>
        </div>

        {/* Gender */}
        <div>
          <label style={labelStyle}>Gender</label>
          <div style={{ display: "flex", gap: 24 }}>
            {(["Male", "Female"] as const).map((g) => (
              <label key={g} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <div
                  onClick={() => setGender(g)}
                  style={{
                    width: 18, height: 18, borderRadius: "50%",
                    border: `2px solid ${gender === g ? "#185FA5" : "#ccc"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", flexShrink: 0,
                  }}
                >
                  {gender === g && <div style={{ width: 9, height: 9, borderRadius: "50%", background: "#185FA5" }} />}
                </div>
                {g}
              </label>
            ))}
          </div>
        </div>

        {/* Comment */}
        <div>
          <label style={labelStyle}>Comment</label>
          <textarea
            style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        {/* Additional contacts */}
        <div>
          <label style={{ ...labelStyle, color: "#888", fontWeight: 400 }}>Additional contacts</label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {additionalIcons.map((item, i) => (
              <button
                key={i}
                title={item.label}
                style={{
                  width: 40, height: 40,
                  border: "1.5px solid #c5d8ec", borderRadius: "50%",
                  background: "#fff", display: "flex", alignItems: "center",
                  justifyContent: "center", cursor: "pointer", color: "#4a7aaa",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#f0f7ff")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#fff")}
              >
                {item.icon}
              </button>
            ))}
          </div>
        </div>

        {/* Add to group */}
        <div>
          <span
            onClick={() => setShowGroupField((p) => !p)}
            style={{ fontSize: 13, color: "#555", cursor: "pointer", userSelect: "none" }}
          >
            + Add to the group
          </span>
          {showGroupField && (
            <select
              style={{ ...inputStyle, marginTop: 8, appearance: "none" }}
              value={group}
              onChange={(e) => setGroup(e.target.value)}
            >
              <option value="">Select group...</option>
              {groups.map((g) => (
                <option key={g.id} value={String(g.id)}>{g.name} — {g.schedule}</option>
              ))}
            </select>
          )}
        </div>

        {/* Set password */}
        <div>
          <span
            onClick={() => setShowPasswordField((p) => !p)}
            style={{ fontSize: 13, color: "#555", cursor: "pointer", userSelect: "none" }}
          >
            + Set password
          </span>
          {showPasswordField && (
            <input
              type="password"
              style={{ ...inputStyle, marginTop: 8 }}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </div>

        {/* Submit */}
        <div style={{ marginTop: 4 }}>
          <button
            onClick={handleSubmit}
            style={{
              background: "#4a7aaa", color: "#fff", border: "none",
              borderRadius: 20, padding: "11px 32px",
              fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}
          >
            Submit
          </button>
        </div>
      </div>
    </RightDrawer>
  );
};

/* ══════════════════════════════════════════
   Add Payment Drawer
══════════════════════════════════════════ */
const AddPaymentDrawer = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { students, editStudent } = useData();
  const [method, setMethod] = useState("Cash");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [comment, setComment] = useState("");
  const [selectedUid, setSelectedUid] = useState("");

  const handleClose = () => {
    setMethod("Cash"); setAmount(""); setComment("");
    setSelectedUid(""); setDate(new Date().toISOString().split("T")[0]);
    onClose();
  };

  const handleSubmit = () => {
    if (selectedUid && amount) {
      const student = students.find((s) => s.uid === selectedUid);
      if (student) {
        const paid = Number(amount);
        editStudent(selectedUid, { balance: (student.balance ?? 0) + paid });
      }
    }
    handleClose();
  };

  return (
    <RightDrawer open={open} onClose={handleClose} title="Add payment" width={440}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Student */}
        <div>
          <label style={labelStyle}>Student</label>
          <div style={{ position: "relative" }}>
            <select
              value={selectedUid}
              onChange={(e) => setSelectedUid(e.target.value)}
              style={{
                ...inputStyle, appearance: "none",
                color: selectedUid ? "#1a1a1a" : "#aaa", paddingRight: 36,
              }}
            >
              <option value="">Select student</option>
              {students.map((s) => (
                <option key={s.uid} value={s.uid}>{s.name}</option>
              ))}
            </select>
            <MdKeyboardArrowDown size={18} style={{
              position: "absolute", right: 12, top: "50%",
              transform: "translateY(-50%)", color: "#aaa", pointerEvents: "none",
            }} />
          </div>
        </div>

        {/* Show balance if student selected */}
        {selectedUid && (() => {
          const s = students.find((st) => st.uid === selectedUid);
          return s ? (
            <div style={{
              background: "#2d4a5a", color: "#fff", borderRadius: 20,
              padding: "6px 16px", fontSize: 13, fontWeight: 600,
              display: "inline-flex", alignSelf: "flex-start",
            }}>
              Balance: {(s.balance ?? 0).toLocaleString("ru-RU")} UZS
            </div>
          ) : null;
        })()}

        {/* Method pay */}
        <div>
          <label style={labelStyle}>Method pay</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px" }}>
            {PAYMENT_METHODS.map((row, ri) =>
              row.map((m, ci) =>
                m ? (
                  <label key={m} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                    <div
                      onClick={() => setMethod(m)}
                      style={{
                        width: 18, height: 18, borderRadius: "50%",
                        border: `2px solid ${method === m ? "#185FA5" : "#ccc"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", flexShrink: 0,
                        background: method === m ? "#185FA5" : "#fff",
                      }}
                    >
                      {method === m && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#fff" }} />}
                    </div>
                    {m}
                  </label>
                ) : <div key={`empty-${ri}-${ci}`} />
              )
            )}
          </div>
        </div>

        {/* Amount */}
        <div>
          <label style={labelStyle}>Amount</label>
          <input
            style={inputStyle}
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
          />
        </div>

        {/* Date */}
        <div>
          <label style={labelStyle}>Date</label>
          <div style={{ position: "relative" }}>
            <MdCalendarToday size={14} style={{
              position: "absolute", left: 12, top: "50%",
              transform: "translateY(-50%)", color: "#aaa", pointerEvents: "none",
            }} />
            <input
              type="date"
              style={{ ...inputStyle, paddingLeft: 34 }}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        {/* Comment */}
        <div>
          <label style={labelStyle}>Comment</label>
          <textarea
            style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        {/* Submit */}
        <div>
          <button
            onClick={handleSubmit}
            style={{
              background: "#4a9bb5", color: "#fff", border: "none",
              borderRadius: 20, padding: "11px 32px",
              fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}
          >
            Submit
          </button>
        </div>
      </div>
    </RightDrawer>
  );
};

/* ══════════════════════════════════════════
   Icon Button helper
══════════════════════════════════════════ */
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

/* ─── Branch Dropdown ─── */
const BranchDropdown = ({ branch, setBranch }: { branch: BranchId; setBranch: (b: BranchId) => void }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = BRANCH_OPTIONS.find((o) => o.value === branch);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((p) => !p)}
        style={{
          display: "flex", alignItems: "center", gap: 4,
          border: "none", background: "none", cursor: "pointer",
          padding: "4px 8px", borderRadius: 8, fontSize: 14,
          fontWeight: 500, color: "#1a2332", transition: "background 0.15s",
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#f0f4f9")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "none")}
      >
        {current?.label ?? "Branch"}
        <MdKeyboardArrowDown
          size={16} color="#6b7a8d"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
        />
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", left: 0,
          background: "#fff", border: "1px solid #e0e5ec", borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 500,
          minWidth: 200, animation: "dropDown 0.15s ease", overflow: "hidden",
        }}>
          <style>{`@keyframes dropDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>
          {BRANCH_OPTIONS.map((opt) => (
            <div
              key={opt.value}
              onClick={() => { setBranch(opt.value); setOpen(false); }}
              style={{
                padding: "10px 14px", fontSize: 13, cursor: "pointer",
                fontWeight: opt.value === branch ? 600 : 400,
                color: opt.value === branch ? "#185FA5" : "#1a2332",
                background: opt.value === branch ? "#f0f7ff" : "#fff",
              }}
              onMouseEnter={(e) => { if (opt.value !== branch) (e.currentTarget as HTMLDivElement).style.background = "#f7f8fa"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = opt.value === branch ? "#f0f7ff" : "#fff"; }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Search Bar ─── */
const SearchBar = () => {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      background: "#f5f6f8", border: `1px solid ${focused ? "#185FA5" : "#e0e5ec"}`,
      borderRadius: 10, padding: "0 14px", height: 36,
      flex: 1, maxWidth: 380, transition: "border-color 0.15s",
    }}>
      <MdSearch size={17} color="#6b7a8d" />
      <input
        placeholder="Search"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          border: "none", background: "none", outline: "none",
          fontSize: 13, color: "#1a2332", width: "100%", fontFamily: "inherit",
        }}
      />
    </div>
  );
};

/* ─── Language Toggle ─── */
const LangToggle = () => {
  const [lang, setLang] = useState<"en" | "uz" | "ru">("en");
  const langs: ("en" | "uz" | "ru")[] = ["en", "uz", "ru"];
  return (
    <button
      onClick={() => setLang((l) => langs[(langs.indexOf(l) + 1) % langs.length])}
      style={{
        height: 34, padding: "0 10px", border: "1px solid #e0e5ec",
        borderRadius: 8, background: "#fff", cursor: "pointer",
        fontSize: 12, fontWeight: 600, color: "#6b7a8d",
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#f0f4f9")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#fff")}
    >
      {lang}
    </button>
  );
};

/* ─── Notifications ─── */
const NotificationBtn = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((p) => !p)}
        style={{
          width: 34, height: 34, border: "1px solid #e0e5ec", borderRadius: 8,
          background: "#fff", display: "flex", alignItems: "center",
          justifyContent: "center", cursor: "pointer", color: "#6b7a8d", position: "relative",
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#f0f4f9")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#fff")}
      >
        <MdNotificationsNone size={18} />
        <span style={{
          position: "absolute", top: 4, right: 4, width: 7, height: 7,
          background: "#e53935", borderRadius: "50%", border: "1.5px solid #fff",
        }} />
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0,
          background: "#fff", border: "1px solid #e0e5ec", borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 500,
          width: 280, animation: "dropDown 0.15s ease", overflow: "hidden",
        }}>
          <div style={{ padding: "12px 14px 8px", fontSize: 13, fontWeight: 600, color: "#1a2332", borderBottom: "1px solid #f0f0f0" }}>
            Notifications
          </div>
          {[
            { text: "New student added to KIDS English", time: "2 min ago" },
            { text: "Payment received from Aliyev Bobur", time: "15 min ago" },
            { text: "Group IELTS updated", time: "1 hr ago" },
          ].map((n, i) => (
            <div
              key={i}
              style={{ padding: "10px 14px", borderBottom: "1px solid #f5f5f5", cursor: "pointer" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = "#f7f8fa")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = "#fff")}
            >
              <div style={{ fontSize: 12, color: "#1a2332", marginBottom: 2 }}>{n.text}</div>
              <div style={{ fontSize: 11, color: "#aaa" }}>{n.time}</div>
            </div>
          ))}
          <div style={{ padding: "10px 14px", textAlign: "center" }}>
            <span style={{ fontSize: 12, color: "#185FA5", cursor: "pointer" }}>View all</span>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── History ─── */
const HistoryBtn = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <IconBtn onClick={() => setOpen((p) => !p)} title="History" active={open}>
        <MdHistory size={18} />
      </IconBtn>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0,
          background: "#fff", border: "1px solid #e0e5ec", borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 500,
          width: 240, animation: "dropDown 0.15s ease", overflow: "hidden",
        }}>
          <div style={{ padding: "12px 14px 8px", fontSize: 13, fontWeight: 600, color: "#1a2332", borderBottom: "1px solid #f0f0f0" }}>
            Recent pages
          </div>
          {["Teachers list", "KIDS English group", "Pardayev Jahongir", "Students"].map((p, i) => (
            <div
              key={i}
              style={{
                padding: "9px 14px", fontSize: 12, color: "#555", cursor: "pointer",
                display: "flex", gap: 8, alignItems: "center", borderBottom: "1px solid #f5f5f5",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = "#f7f8fa")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = "#fff")}
            >
              <MdHistory size={13} color="#aaa" /> {p}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════
   Quick Add Dropdown (➕)
══════════════════════════════════════════ */
const QuickAddBtn = ({ onAddStudent, onAddPayment }: {
  onAddStudent: () => void; onAddPayment: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const items = [
    { label: "Add student", emoji: "🎓", action: onAddStudent },
    { label: "Add payment", emoji: "💳", action: onAddPayment },
  ];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <IconBtn onClick={() => setOpen((p) => !p)} title="Quick add" active={open}>
        <MdAdd size={18} />
      </IconBtn>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", left: 0,
          background: "#fff", border: "1px solid #e0e5ec", borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 500,
          minWidth: 180, animation: "dropDown 0.15s ease", overflow: "hidden",
        }}>
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

/* ══════════════════════════════════════════
   Main Header
══════════════════════════════════════════ */
export const Header = () => {
  const navigate = useNavigate();
  const { branch, setBranch } = useBranch();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <>
      <Box
        component="header"
        sx={{
          position: "fixed", top: 0, left: 0, right: 0,
          height: HEADER_HEIGHT, zIndex: 100,
          backgroundColor: "#fff", borderBottom: "1px solid #e0e5ec",
          display: "flex", alignItems: "center",
        }}
      >
        {/* Logo */}
        <Box sx={{
          width: SIDEBAR_WIDTH, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          height: "100%", borderRight: "1px solid #e0e5ec", px: 1.5,
        }}>
          <Link to="/" style={{ display: "flex", alignItems: "center" }}>
            <img
              src={logo} alt="logo"
              style={{ width: SIDEBAR_WIDTH - 24, height: "auto", maxHeight: 36, objectFit: "contain", display: "block" }}
            />
          </Link>
        </Box>

        {/* Main area */}
        <Box sx={{ flex: 1, display: "flex", alignItems: "center", gap: 2, px: 3, height: "100%" }}>
          <BranchDropdown branch={branch} setBranch={setBranch} />

          <QuickAddBtn
            onAddStudent={() => setAddStudentOpen(true)}
            onAddPayment={() => setAddPaymentOpen(true)}
          />

          <SearchBar />
          <Box sx={{ flex: 1 }} />

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <LangToggle />
            <IconBtn onClick={toggleFullscreen} title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
              {isFullscreen ? <MdFullscreenExit size={18} /> : <MdFullscreen size={18} />}
            </IconBtn>
            <IconBtn title="Help"><MdHelpOutline size={18} /></IconBtn>
            <HistoryBtn />
            <NotificationBtn />
          </Box>

          <div style={{ width: 1, height: 28, background: "#e0e5ec", marginLeft: 4, marginRight: 4 }} />

          <button
            onClick={(e) => setUserMenuAnchor(e.currentTarget)}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              border: "none", background: "none", cursor: "pointer",
              borderRadius: 10, padding: "4px 8px", transition: "background 0.15s",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#f0f4f9")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "none")}
          >
            <Typography sx={{ fontSize: 13, fontWeight: 500, color: "#1a2332" }}>
              Odilbek Safarov
            </Typography>
            <Avatar sx={{ width: 32, height: 32, backgroundColor: "#c8cdd4", fontSize: 13, fontWeight: 600 }}>
              O
            </Avatar>
          </button>

          <Menu
            anchorEl={userMenuAnchor}
            open={Boolean(userMenuAnchor)}
            onClose={() => setUserMenuAnchor(null)}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            PaperProps={{ sx: { borderRadius: 2, mt: 1, minWidth: 160, boxShadow: "0 8px 24px rgba(0,0,0,0.1)" } }}
          >
            <MenuItem sx={{ fontSize: 13 }} onClick={() => { setUserMenuAnchor(null); navigate("/profile"); }}>
              Account
            </MenuItem>
          
            <MenuItem sx={{ fontSize: 13, color: "#e53935" }} onClick={() => setUserMenuAnchor(null)}>
              Sign out
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* Drawers */}
      <AddStudentDrawer open={addStudentOpen} onClose={() => setAddStudentOpen(false)} />
      <AddPaymentDrawer open={addPaymentOpen} onClose={() => setAddPaymentOpen(false)} />
    </>
  );
};