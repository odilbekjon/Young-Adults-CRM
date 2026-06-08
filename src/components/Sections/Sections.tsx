import { useState, useRef, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  IconButton,
  TextField,
  Avatar,
} from "@mui/material";
import { FiList, FiMoreHorizontal, FiInfo, FiClock } from "react-icons/fi";
import { HiOutlineUserAdd } from "react-icons/hi";

type ColumnKey = "leads" | "expectation" | "set";

interface LeadCard {
  id: number;
  name: string;
  phone: string;
  date: string;
  hasTask: boolean;
  col: ColumnKey;
}

const COLUMN_LABELS: Record<ColumnKey, string> = {
  leads: "LEADS",
  expectation: "EXPECTATION",
  set: "SET",
};

// Avatar color by index
const AVATAR_COLORS = [
  "#f59e42", "#4f8ef7", "#a78bfa", "#34d399", "#f87171",
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getTodayStr() {
  const d = new Date();
  return `${d.getDate().toString().padStart(2, "0")}.${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")}.${d.getFullYear()}`;
}

const INITIAL_CARDS: LeadCard[] = [
  { id: 1, name: "Azizbem", phone: "94 579 04 24", date: "30.04.2026", hasTask: false, col: "leads" },
  { id: 2, name: "Odinayeva Zebiniso...", phone: "95 312 71 07", date: "30.04.2026", hasTask: false, col: "leads" },
  { id: 3, name: "Azizbek", phone: "94 579 04 24", date: "30.04.2026", hasTask: false, col: "leads" },
  { id: 4, name: "Lochinbek", phone: "95 723 33 53", date: "30.04.2026", hasTask: false, col: "leads" },
  { id: 5, name: "Lochinbek", phone: "95 723 33 53", date: "30.04.2026", hasTask: false, col: "leads" },
  { id: 6, name: "Almardanova Feruza...", phone: "99 417 95 00", date: "19.03.2026", hasTask: false, col: "leads" },
  { id: 7, name: "Sardor", phone: "90 123 45 67", date: "30.04.2026", hasTask: false, col: "leads" },
];

interface AddFormProps {
  onSave: (name: string, phone: string) => void;
  onClose: () => void;
}

const AddForm = ({ onSave, onClose }: AddFormProps) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [fromWhere, setFromWhere] = useState("");
  const [section, setSection] = useState("");
  const [comment, setComment] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // slight delay so the open-click doesn't immediately close it
    const t = setTimeout(() => document.addEventListener("mousedown", handleClick), 100);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [onClose]);

  return (
    <Paper
      ref={ref}
      variant="outlined"
      sx={{ p: 1.5, borderRadius: 1.5, mt: 0.5 }}
    >
      <TextField
        size="small"
        fullWidth
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        sx={{ mb: 1, "& input": { fontSize: 13 } }}
        autoFocus
      />
      <TextField
        size="small"
        fullWidth
        placeholder="+998"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        sx={{ mb: 1, "& input": { fontSize: 13 } }}
      />
      <TextField
        size="small"
        fullWidth
        placeholder="From where"
        value={fromWhere}
        onChange={(e) => setFromWhere(e.target.value)}
        sx={{ mb: 1, "& input": { fontSize: 13 } }}
      />
      <TextField
        size="small"
        fullWidth
        placeholder="Section"
        value={section}
        onChange={(e) => setSection(e.target.value)}
        sx={{ mb: 1, "& input": { fontSize: 13 } }}
      />
      <TextField
        size="small"
        fullWidth
        placeholder="Comment"
        multiline
        rows={2}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        sx={{ mb: 1, "& textarea": { fontSize: 13 } }}
      />
      <Button
        fullWidth
        variant="contained"
        size="small"
        disabled={!name.trim()}
        onClick={() => {
          onSave(name.trim(), phone.trim());
        }}
        sx={{ fontSize: 13, textTransform: "none", borderRadius: 1 }}
      >
        Send
      </Button>
    </Paper>
  );
};

export const Sections = () => {
  const [cards, setCards] = useState<LeadCard[]>(INITIAL_CARDS);
  const [activeFormCol, setActiveFormCol] = useState<ColumnKey | null>(null);

  const handleSave = (col: ColumnKey, name: string, phone: string) => {
    setCards((prev) => [
      ...prev,
      {
        id: Date.now(),
        name,
        phone: phone || "—",
        date: getTodayStr(),
        hasTask: false,
        col,
      },
    ]);
    setActiveFormCol(null);
  };

  const colCards = (col: ColumnKey) => cards.filter((c) => c.col === col);

  const colTitle = (col: ColumnKey) => {
    const list = colCards(col);
    return `${COLUMN_LABELS[col]} (${list.length} / ${list.length})`;
  };

  return (
    <Box
      sx={{
        display: "flex",
        gap: 0,
        mr: 2,
        border: "0.5px solid",
        borderColor: "divider",
        borderRadius: 2,
        overflow: "hidden",
        backgroundColor: "#fff",
        minHeight: 500,
      }}
    >
      {(["leads", "expectation", "set"] as ColumnKey[]).map((col, i) => {
        const list = colCards(col);

        return (
          <Box
            key={col}
            sx={{
              flex: 1,
              borderRight: i < 2 ? "0.5px solid" : "none",
              borderColor: "divider",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Header */}
            <Box
              sx={{
                px: 2,
                py: 1.25,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "0.5px solid",
                borderColor: "divider",
              }}
            >
              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  color: "text.primary",
                }}
              >
                {colTitle(col)}
              </Typography>
              <IconButton size="small" sx={{ color: "text.disabled" }}>
                <FiList size={14} />
              </IconButton>
            </Box>

            {/* Body */}
            <Box
              sx={{
                px: 1.5,
                py: 1.5,
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 1,
                overflowY: "auto",
              }}
            >
              {/* Add button */}
              <Button
                fullWidth
                variant="contained"
                onClick={() =>
                  setActiveFormCol(activeFormCol === col ? null : col)
                }
                sx={{
                  backgroundColor: "#2196f3",
                  minHeight: 40,
                  borderRadius: 1,
                  "&:hover": { backgroundColor: "#1976d2" },
                }}
              >
                <HiOutlineUserAdd size={20} />
              </Button>

              {/* Inline Add Form */}
              {activeFormCol === col && (
                <AddForm
                  onSave={(name, phone) => handleSave(col, name, phone)}
                  onClose={() => setActiveFormCol(null)}
                />
              )}

              {/* Cards */}
              {list.map((card, idx) => (
                <Paper
                  key={card.id}
                  variant="outlined"
                  sx={{
                    borderRadius: 1.5,
                    overflow: "hidden",
                    "&:hover": { borderColor: "#2196f3", boxShadow: "0 1px 6px rgba(33,150,243,0.10)" },
                    transition: "border-color 0.15s, box-shadow 0.15s",
                  }}
                >
                  <Box
                    sx={{
                      px: 1.5,
                      py: 1,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    {/* Avatar */}
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        fontSize: 12,
                        fontWeight: 700,
                        backgroundColor: AVATAR_COLORS[idx % AVATAR_COLORS.length],
                        flexShrink: 0,
                      }}
                    >
                      {getInitials(card.name)}
                    </Avatar>

                    {/* Info */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        sx={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3, color: "text.primary" }}
                        noWrap
                      >
                        {card.name}
                      </Typography>
                      <Typography
                        sx={{ fontSize: 12, color: "text.secondary", lineHeight: 1.3 }}
                        noWrap
                      >
                        {card.phone}
                      </Typography>
                    </Box>

                    {/* Actions */}
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        color: "text.disabled",
                        flexShrink: 0,
                      }}
                    >
                      <IconButton size="small" sx={{ p: 0.25, color: "text.disabled" }}>
                        <FiInfo size={13} />
                      </IconButton>
                      <IconButton size="small" sx={{ p: 0.25, color: "text.disabled" }}>
                        <FiClock size={13} />
                      </IconButton>
                      <IconButton size="small" sx={{ p: 0.25, color: "text.disabled" }}>
                        <FiMoreHorizontal size={13} />
                      </IconButton>
                    </Box>
                  </Box>

                  {/* Footer */}
                  <Box
                    sx={{
                      backgroundColor: "#f9f9f9",
                      borderTop: "0.5px solid",
                      borderColor: "divider",
                      px: 1.5,
                      py: 0.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Typography sx={{ fontSize: 11, color: "text.disabled" }}>
                      {card.date}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <Typography sx={{ fontSize: 11, color: "text.disabled" }}>
                        No
                      </Typography>
                      <Box
                        sx={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          backgroundColor: card.hasTask ? "#4caf50" : "#f59e42",
                        }}
                      />
                    </Box>
                  </Box>
                </Paper>
              ))}
            </Box>

            {/* Column footer — total count */}
            {col === "leads" && list.length > 0 && (
              <Box
                sx={{
                  borderTop: "0.5px solid",
                  borderColor: "divider",
                  px: 2,
                  py: 1,
                  textAlign: "center",
                  backgroundColor: "#fafafa",
                }}
              >
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: "text.secondary" }}>
                  {list.length} / {list.length}
                </Typography>
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
};