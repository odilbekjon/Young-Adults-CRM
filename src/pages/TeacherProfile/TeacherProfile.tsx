// src/pages/teachers/TeacherProfile.tsx

import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { IconButton, Button } from "@mui/material";
import { IoArrowBack } from "react-icons/io5";
import { MdEdit, MdClose } from "react-icons/md";
import { BsFlag } from "react-icons/bs";
import {
  TEACHERS_DATA,
  Group,
  formatDate,
} from "../../constants/Teachers";

/* ─── constants ─── */
const BADGE_STYLES = {
  blue:  { bg: "#E6F1FB", color: "#185FA5", border: "#B5D4F4" },
  green: { bg: "#E1F5EE", color: "#0F6E56", border: "#9FE1CB" },
  amber: { bg: "#FAEEDA", color: "#BA7517", border: "#FAC775" },
};

const AVATAR_COLORS = [
  { bg: "#E6F1FB", text: "#185FA5" },
  { bg: "#E1F5EE", text: "#0F6E56" },
  { bg: "#FAEEDA", text: "#BA7517" },
  { bg: "#FBEAF0", text: "#993556" },
  { bg: "#EAF3DE", text: "#3B6D11" },
];

const BRANCHES = [
  "BePro Tashkent",
  "Young Adults Termiz",
  "New Uzbekistan",
  "YA IELTS Campus",
  "YA Grammar Campus",
];

function getAvatarColor(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}
function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

type TabType = "profile" | "history" | "salary";

/* ══════════════════════════════════════════
   Edit Drawer (slides in from the right)
══════════════════════════════════════════ */
const EditDrawer = ({
  teacher,
  open,
  onClose,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  teacher: any;
  open: boolean;
  onClose: () => void;
}) => {
  const [phone, setPhone] = useState(teacher.phone ?? "");
  const [name, setName]   = useState(teacher.fullName ?? "");
  const [gender, setGender] = useState(teacher.gender ?? "Male");
  const [dob, setDob]     = useState(teacher.dob ?? "");
  const [selectedBranches, setSelectedBranches] = useState<string[]>(
    teacher.branch ? [teacher.branch] : []
  );

  const toggleBranch = (b: string) =>
    setSelectedBranches((prev) =>
      prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]
    );

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
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 500,
    color: "#1a1a1a",
    marginBottom: 6,
    display: "block",
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.18)",
          zIndex: 1200,
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.25s",
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: 440,
          height: "100vh",
          background: "#fff",
          zIndex: 1300,
          boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.28s cubic-bezier(.4,0,.2,1)",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px 16px",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <span style={{ fontSize: 17, fontWeight: 600, color: "#1a1a1a" }}>
            Edit Teacher
          </span>
          <div
            onClick={onClose}
            style={{ cursor: "pointer", color: "#888", fontSize: 20 }}
          >
            <MdClose />
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Phone */}
          <div>
            <label style={labelStyle}>Phone</label>
            <div style={{ display: "flex", gap: 8 }}>
              <div
                style={{
                  ...inputStyle,
                  width: 72,
                  flexShrink: 0,
                  color: "#555",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                +998
              </div>
              <input
                style={{ ...inputStyle, flex: 1 }}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="93 986 66 76"
              />
            </div>
          </div>

          {/* Name */}
          <div>
            <label style={labelStyle}>Name</label>
            <input
              style={inputStyle}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Branches */}
          <div>
            <label style={labelStyle}>Branches</label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px 12px",
              }}
            >
              {BRANCHES.map((b) => (
                <label
                  key={b}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 13,
                    color: "#1a1a1a",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedBranches.includes(b)}
                    onChange={() => toggleBranch(b)}
                    style={{ accentColor: "#185FA5", width: 15, height: 15 }}
                  />
                  {b}
                </label>
              ))}
            </div>
          </div>

          {/* Date of birth */}
          <div>
            <label style={labelStyle}>Date of birth</label>
            <div style={{ position: "relative" }}>
              <input
                type="date"
                style={{ ...inputStyle, color: dob ? "#1a1a1a" : "#aaa" }}
                value={dob}
                onChange={(e) => setDob(e.target.value)}
              />
            </div>
          </div>

          {/* Gender */}
          <div>
            <label style={labelStyle}>Gender</label>
            <div style={{ display: "flex", gap: 20 }}>
              {["Male", "Female"].map((g) => (
                <label
                  key={g}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="gender"
                    checked={gender === g}
                    onChange={() => setGender(g)}
                    style={{ accentColor: "#185FA5" }}
                  />
                  {g}
                </label>
              ))}
            </div>
          </div>

          {/* Photo */}
          <div>
            <label style={labelStyle}>Photo</label>
            <div
              style={{
                display: "flex",
                border: "1px solid #e0e0e0",
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  fontSize: 13,
                  color: "#aaa",
                }}
              >
                No file chosen
              </div>
              <label
                style={{
                  padding: "10px 18px",
                  background: "#f5f5f5",
                  borderLeft: "1px solid #e0e0e0",
                  fontSize: 13,
                  color: "#1a1a1a",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                Browse
                <input type="file" style={{ display: "none" }} />
              </label>
            </div>
          </div>

          {/* Set password link */}
          <div style={{ textAlign: "right" }}>
            <span
              style={{ fontSize: 12, color: "#185FA5", cursor: "pointer" }}
            >
              + Set password
            </span>
          </div>

          {/* Submit */}
          <button
            onClick={onClose}
            style={{
              background: "#1a3a5c",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "12px 28px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              alignSelf: "flex-start",
            }}
          >
            Submit
          </button>
        </div>
      </div>
    </>
  );
};

/* ══════════════════════════════════════════
   Flag / Comment Dropdown (from top)
══════════════════════════════════════════ */
const FlagDropdown = ({
  open,
  onClose,
  anchorRef,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLDivElement>;
}) => {
  const [comment, setComment] = useState("");
  const dropRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (open && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 8, left: rect.left });
    }
  }, [open, anchorRef]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        dropRef.current &&
        !dropRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
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
        top: pos.top,
        left: pos.left,
        zIndex: 1400,
        background: "#fff",
        border: "1px solid #e8e8e8",
        borderRadius: 12,
        boxShadow: "0 8px 32px rgba(0,0,0,0.13)",
        padding: "16px",
        width: 280,
        animation: "dropDown 0.18s ease",
      }}
    >
      <style>{`
        @keyframes dropDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a", display: "flex", alignItems: "center", gap: 6 }}>
          <BsFlag size={14} color="#e05c5c" /> Add Comment
        </span>
        <MdClose
          size={16}
          color="#aaa"
          style={{ cursor: "pointer" }}
          onClick={onClose}
        />
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Write a comment..."
        style={{
          width: "100%",
          minHeight: 90,
          border: "1px solid #e0e0e0",
          borderRadius: 8,
          padding: "10px 12px",
          fontSize: 13,
          color: "#1a1a1a",
          outline: "none",
          resize: "vertical",
          boxSizing: "border-box",
          fontFamily: "inherit",
        }}
      />

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
        <button
          onClick={onClose}
          style={{
            padding: "8px 14px",
            fontSize: 12,
            border: "1px solid #e0e0e0",
            borderRadius: 8,
            background: "#fff",
            cursor: "pointer",
            color: "#888",
          }}
        >
          Cancel
        </button>
        <button
          onClick={() => { onClose(); setComment(""); }}
          style={{
            padding: "8px 14px",
            fontSize: 12,
            border: "none",
            borderRadius: 8,
            background: "#1a3a5c",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Save
        </button>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   GroupCard
══════════════════════════════════════════ */
const GroupCard = ({
  group,
  isSelected,
  onSelect,
}: {
  group: Group;
  isSelected: boolean;
  onSelect: () => void;
}) => {
  const badgeStyle = BADGE_STYLES[group.badgeColor];
  return (
    <div
      onClick={onSelect}
      style={{
        border: isSelected ? "1.5px solid #185FA5" : "1px solid #e8e8e8",
        borderRadius: 10,
        padding: "11px 14px",
        cursor: "pointer",
        background: isSelected ? "#f7fbff" : "#fff",
        transition: "all 0.15s",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <div style={{ flexShrink: 0, width: 110 }}>
        <span
          style={{
            display: "inline-block",
            fontSize: 10,
            fontWeight: 500,
            padding: "2px 7px",
            borderRadius: 5,
            background: badgeStyle.bg,
            color: badgeStyle.color,
            border: `1px solid ${badgeStyle.border}`,
            marginBottom: 4,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "100%",
          }}
        >
          {group.badge}
        </span>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "#1a1a1a",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {group.name}
        </div>
      </div>

      <div style={{ flex: 1, textAlign: "center", fontSize: 11, color: "#888", lineHeight: 1.6 }}>
        <div>{formatDate(group.startDate)} — {formatDate(group.endDate)}</div>
        <div>{group.schedule}</div>
      </div>

      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "#1a3a5c",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        {group.students.length}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   StudentsList
══════════════════════════════════════════ */
const StudentsList = ({
  group,
  onGoToGroup,
}: {
  group: Group;
  onGoToGroup: () => void;
}) => {
  const badgeStyle = BADGE_STYLES[group.badgeColor];
  return (
    <div
      style={{
        border: "1px solid #e8e8e8",
        borderRadius: 12,
        overflow: "hidden",
        background: "#fff",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "14px 16px 12px",
          borderBottom: "1px solid #f0f0f0",
          background: "#fafafa",
        }}
      >
        <span
          style={{
            display: "inline-block",
            fontSize: 10,
            fontWeight: 500,
            padding: "2px 8px",
            borderRadius: 6,
            background: badgeStyle.bg,
            color: badgeStyle.color,
            border: `1px solid ${badgeStyle.border}`,
            marginBottom: 6,
          }}
        >
          {group.badge}
        </span>
        <div style={{ fontSize: 15, fontWeight: 500, color: "#1a1a1a" }}>
          {group.name}
        </div>
        <div style={{ fontSize: 12, color: "#888", marginTop: 3 }}>
          Room: <strong style={{ color: "#1a1a1a" }}>{group.room}</strong>
          &nbsp;&nbsp; Start:{" "}
          <strong style={{ color: "#1a1a1a" }}>
            {group.schedule.split("• ")[1]}
          </strong>
        </div>
      </div>

      <div style={{ overflowY: "auto", maxHeight: 360 }}>
        {group.students.map((s, idx) => (
          <div
            key={s.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "8px 16px",
              borderBottom:
                idx < group.students.length - 1 ? "1px solid #f5f5f5" : "none",
            }}
          >
            <span style={{ fontSize: 12, color: "#1a1a1a" }}>{s.name}</span>
            <span style={{ fontSize: 11, color: "#888" }}>{s.phone}</span>
          </div>
        ))}
      </div>

      <div
        style={{
          padding: "10px 16px",
          borderTop: "1px solid #f0f0f0",
          textAlign: "right",
        }}
      >
        <span
          onClick={onGoToGroup}
          style={{
            fontSize: 12,
            color: "#185FA5",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          Go to group →
        </span>
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
  const [activeTab, setActiveTab] = useState<TabType>("profile");
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);
  const flagAnchorRef = useRef<HTMLDivElement>(null);

  const teacher = TEACHERS_DATA.find((t) => t.id === Number(id));

  if (!teacher) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#888" }}>
        <p>Teacher not found.</p>
        <Button onClick={() => navigate("/teachers")} sx={{ mt: 2 }}>
          ← Back to Teachers
        </Button>
      </div>
    );
  }

  const avatarColor = getAvatarColor(teacher.id);
  const activeGroupId = selectedGroupId ?? (teacher.groups[0]?.id ?? null);
  const activeGroup = teacher.groups.find((g) => g.id === activeGroupId);

  const tabs: { key: TabType; label: string }[] = [
    { key: "profile", label: "PROFILE" },
    { key: "history", label: "History" },
    { key: "salary", label: "Salary" },
  ];

  const iconBtn = (
    icon: React.ReactNode,
    onClick: () => void,
    ref?: React.RefObject<HTMLDivElement>
  ) => (
    <div
      ref={ref}
      onClick={onClick}
      style={{
        width: 30,
        height: 30,
        border: "1px solid #e0e0e0",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: "#888",
        background: "#fff",
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5f5")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
    >
      {icon}
    </div>
  );

  return (
    <div style={{ padding: "0" }}>
      {/* Title */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 4,
          padding: "16px 0 0",
        }}
      >
        <IconButton size="small" onClick={() => navigate(-1)}>
          <IoArrowBack size={18} />
        </IconButton>
        <span style={{ fontSize: 22, fontWeight: 500 }}>{teacher.fullName}</span>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #eee", marginBottom: 24 }}>
        {tabs.map((tab) => (
          <div
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "10px 18px 12px",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: activeTab === tab.key ? 600 : 400,
              color: activeTab === tab.key ? "#185FA5" : "#888",
              borderBottom:
                activeTab === tab.key
                  ? "2px solid #185FA5"
                  : "2px solid transparent",
              transition: "all 0.15s",
            }}
          >
            {tab.label}
          </div>
        ))}
      </div>

      {/* PROFILE TAB */}
      {activeTab === "profile" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "260px 1fr 300px",
            gap: 20,
            alignItems: "start",
          }}
        >
          {/* Left: Info card */}
          <div
            style={{
              border: "1px solid #e8e8e8",
              borderRadius: 12,
              padding: "20px 16px",
              background: "#fff",
              position: "relative",
            }}
          >
            {/* Action buttons */}
            <div
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                display: "flex",
                gap: 6,
              }}
            >
              {iconBtn(
                <BsFlag size={13} />,
                () => setFlagOpen((p) => !p),
                flagAnchorRef
              )}
              {iconBtn(<MdEdit size={13} />, () => setEditOpen(true))}
            </div>

            {/* Avatar + name */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: avatarColor.bg,
                  color: avatarColor.text,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  fontWeight: 500,
                  marginBottom: 10,
                }}
              >
                {getInitials(teacher.fullName)}
              </div>
              <div style={{ fontSize: 15, fontWeight: 500, color: "#1a1a1a" }}>
                {teacher.fullName}
              </div>
            </div>

            <div
              style={{ fontSize: 12, color: "#888", marginBottom: 6, textAlign: "center" }}
            >
              (id: {teacher.uid})
            </div>
            <div style={{ fontSize: 13, marginBottom: 4 }}>
              Phone:{" "}
              <span style={{ color: "#185FA5", fontWeight: 500 }}>
                {teacher.phone}
              </span>
            </div>
            {teacher.telegram && (
              <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>
                {teacher.telegram}
              </div>
            )}

            <hr style={{ border: "none", borderTop: "1px solid #f0f0f0", margin: "12px 0" }} />

            <div
              style={{
                fontSize: 11,
                color: "#aaa",
                marginBottom: 5,
                textTransform: "uppercase",
                letterSpacing: "0.4px",
              }}
            >
              Roles
            </div>
            <span
              style={{
                display: "inline-block",
                fontSize: 12,
                padding: "4px 12px",
                borderRadius: 14,
                background: "#E6F1FB",
                color: "#185FA5",
                border: "1px solid #B5D4F4",
              }}
            >
              {teacher.role}
            </span>

            <div
              style={{
                fontSize: 11,
                color: "#aaa",
                marginTop: 12,
                marginBottom: 5,
                textTransform: "uppercase",
                letterSpacing: "0.4px",
              }}
            >
              Branches
            </div>
            <span
              style={{
                display: "inline-block",
                fontSize: 12,
                padding: "4px 12px",
                borderRadius: 14,
                background: "#E1F5EE",
                color: "#0F6E56",
                border: "1px solid #9FE1CB",
              }}
            >
              {teacher.branch}
            </span>

            {(teacher.percent || teacher.gender || teacher.dob) && (
              <>
                <hr
                  style={{
                    border: "none",
                    borderTop: "1px solid #f0f0f0",
                    margin: "14px 0",
                  }}
                />
                <div style={{ fontSize: 12, color: "#888", lineHeight: 1.9 }}>
                  {teacher.percent && (
                    <div>
                      Percent:{" "}
                      <span style={{ color: "#1a1a1a", fontWeight: 500 }}>
                        {teacher.percent}%
                      </span>
                    </div>
                  )}
                  {teacher.gender && (
                    <div>
                      Gender:{" "}
                      <span style={{ color: "#1a1a1a" }}>{teacher.gender}</span>
                    </div>
                  )}
                  {teacher.dob && (
                    <div>
                      DOB:{" "}
                      <span style={{ color: "#1a1a1a" }}>{teacher.dob}</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Middle: Groups */}
          <div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 500,
                color: "#1a1a1a",
                marginBottom: 12,
              }}
            >
              Groups
            </div>
            {teacher.groups.length === 0 ? (
              <div
                style={{
                  color: "#aaa",
                  fontSize: 13,
                  padding: "24px 0",
                  textAlign: "center",
                }}
              >
                No groups assigned
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  maxHeight: 440,
                  overflowY: "auto",
                  paddingRight: 2,
                }}
              >
                {teacher.groups.map((group) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    isSelected={group.id === activeGroupId}
                    onSelect={() =>
                      setSelectedGroupId(
                        group.id === activeGroupId ? null : group.id
                      )
                    }
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right: Students */}
          {activeGroup && (
            <StudentsList
              group={activeGroup}
              onGoToGroup={() => navigate(`/groups/${activeGroup.id}`)}
            />
          )}
        </div>
      )}

      {activeTab === "history" && (
        <div
          style={{
            textAlign: "center",
            color: "#aaa",
            padding: "60px 0",
            fontSize: 14,
          }}
        >
          History coming soon…
        </div>
      )}
      {activeTab === "salary" && (
        <div
          style={{
            textAlign: "center",
            color: "#aaa",
            padding: "60px 0",
            fontSize: 14,
          }}
        >
          Salary information coming soon…
        </div>
      )}

      {/* ── Edit Drawer ── */}
      <EditDrawer
        teacher={teacher}
        open={editOpen}
        onClose={() => setEditOpen(false)}
      />

      {/* ── Flag Dropdown ── */}
      <FlagDropdown
        open={flagOpen}
        onClose={() => setFlagOpen(false)}
        anchorRef={flagAnchorRef}
      />
    </div>
  );
};