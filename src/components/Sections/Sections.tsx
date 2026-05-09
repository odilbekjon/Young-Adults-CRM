import { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  IconButton,
  TextField,
} from "@mui/material";
import { FiList, FiMoreHorizontal, FiLock } from "react-icons/fi";
import { HiOutlineUserAdd } from "react-icons/hi";

type ColumnKey = "leads" | "expectation" | "set";

interface LeadCard {
  id: number;
  name: string;
  count: string;
  col: ColumnKey;
}

const COLUMN_LABELS: Record<ColumnKey, string> = {
  leads: "LEADS",
  expectation: "EXPECTATION",
  set: "SET",
};

export const Sections = () => {
  const [cards, setCards] = useState<LeadCard[]>([
    { id: 1, name: "input", count: "0 / 1", col: "leads" },
  ]);
  // const [modalOpen, setModalOpen] = useState(false);
  const [modalCol, ] = useState<ColumnKey>("leads");
  const [inputName, setInputName] = useState("");
  const [inputCount, setInputCount] = useState("");

  const [activeFormCol, setActiveFormCol] = useState<ColumnKey | null>(null);

  const saveCard = () => { if (!inputName.trim()) return; setCards((prev) => [ ...prev, { id: Date.now(), name: inputName.trim(), count: inputCount.trim() || "0 / 1", col: modalCol, }, ]); closeModal(); };

  const closeModal = () => {
    setInputName("");
    setInputCount("");
  };

  const colCards = (col: ColumnKey) => cards.filter((c) => c.col === col);

  const colTitle = (col: ColumnKey) => {
    const list = colCards(col);
    return `${COLUMN_LABELS[col]} (${list.length} / ${list.length || 0})`;
  };

  return (
    <>
      <Box
        sx={{
          display: "flex",
          gap: 0,
          mr : 2,
          border: "0.5px solid",
          borderColor: "divider",
          borderRadius: 2,
          overflow: "hidden",
          backgroundColor: "#fff",
          minHeight: 400,
        }}
      >
        {(["leads", "expectation", "set"] as ColumnKey[]).map((col, i) => (
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
            {/* Column Header */}
            <Box
              sx={{
                px: 2,
                py: 1.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Typography
                variant="caption"
                fontWeight={600}
                sx={{ letterSpacing: "0.05em", color: "text.primary" }}
              >
                {colTitle(col)}
              </Typography>
              <IconButton size="small">
                <FiList size={14} />
              </IconButton>
            </Box>

            {/* Column Body */}
            <Box sx={{ px: 1.5, pb: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
              {/* Add button */}
              <Button
                fullWidth
                variant="contained"
                onClick={() => 
                  setActiveFormCol(col)
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

              {activeFormCol === col && (
  <Paper
    variant="outlined"
    sx={{ p: 1.5, borderRadius: 1 }}
  >
    <TextField
      size="small"
      fullWidth
      placeholder="Name"
      value={inputName}
      onChange={(e) => setInputName(e.target.value)}
      sx={{ mb: 1 }}
    />

    <TextField
      size="small"
      fullWidth
      placeholder="+998"
      sx={{ mb: 1 }}
    />

    <TextField
      size="small"
      fullWidth
      placeholder="From where"
      sx={{ mb: 1 }}
    />

    <TextField
      size="small"
      fullWidth
      placeholder="Section"
      sx={{ mb: 1 }}
    />

    <TextField
      size="small"
      fullWidth
      placeholder="Comment"
      multiline
      rows={2}
      sx={{ mb: 1 }}
    />

    <Button
      fullWidth
      variant="contained"
      onClick={() => {
        saveCard();
        setActiveFormCol(null);
      }}
      disabled={!inputName}
    >
      Send
    </Button>
  </Paper>
)}

              {/* Cards */}
              {colCards(col).map((card) => (
                <Paper
                  key={card.id}
                  variant="outlined"
                  sx={{ borderRadius: 1, overflow: "hidden" }}
                >
                  <Box
                    sx={{
                      px: 1.5,
                      py: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Typography variant="body2" fontSize={13}>
                      {card.name}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "text.disabled" }}>
                      <FiLock size={13} />
                      <FiMoreHorizontal size={13} />
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      backgroundColor: "#f5f5f5",
                      borderTop: "0.5px solid",
                      borderColor: "divider",
                      px: 1.5,
                      py: 0.75,
                      textAlign: "center",
                    }}
                  >
                    <Typography variant="body2" fontWeight={600} fontSize={13} color="text.secondary">
                      {card.count}
                    </Typography>
                  </Box>
                </Paper>
              ))}
            </Box>
          </Box>
        ))}
      </Box>

    </>
  );
};