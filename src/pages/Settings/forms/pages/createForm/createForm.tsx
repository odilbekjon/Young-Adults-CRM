// CreateForm.tsx
import { useState } from "react";
import {
  Box, Button,  FormControl, FormControlLabel,
  MenuItem, Radio, Select, TextField, Typography,
  Paper, IconButton,
} from "@mui/material";
import { FiPlus } from "react-icons/fi";
import { MdClose } from "react-icons/md";
import { useParams } from "react-router-dom";

// ─── Types ────────────────────────────────────────────────────────────────────
type BlockType = "One of the list" | "Short answer" | "Long answer";
interface Answer { id: number; label: string; }
interface Block { id: number; type: BlockType; question: string; answers: Answer[]; isRequired: boolean; }

const BLOCK_TYPES: BlockType[] = ["One of the list", "Short answer", "Long answer"];
const TEAL = "#4a7fa5";
const TEAL_DARK = "#1a4d6e";

const defaultBlock = (): Block => ({
  id: Date.now(),
  type: "One of the list",
  question: "Choose of the Answers",
  answers: [{ id: 1, label: "Answer 1" }, { id: 2, label: "Answer 2" }],
  isRequired: true,
});

// ─── Shared field card ────────────────────────────────────────────────────────
const FixedFieldCard = ({ index, label }: { index: number; label: string }) => (
  <Paper
    variant="outlined"
    sx={{ borderRadius: 2, mb: 1.5, overflow: "hidden", border: "1px solid #e0e0e0" }}
  >
    <Box sx={{ px: 2, py: 1, backgroundColor: "#fff", borderBottom: "1px solid #f0f0f0" }}>
      <Typography sx={{ fontWeight: 600, color: "#555", fontSize: "0.85rem" }}>{index}</Typography>
    </Box>
    <Box sx={{ px: 2.5, py: 1.8 }}>
      <Typography sx={{ fontWeight: 600, fontSize: "0.95rem", color: "#1a1a2e" }}>
        <span style={{ color: "red", marginRight: 6 }}>*</span>{label}
      </Typography>
    </Box>
  </Paper>
);

// ─── Lead Form Editor ─────────────────────────────────────────────────────────
function LeadFormEditor() {
  const [formName, setFormName] = useState("");
  const [branch, setBranch] = useState("");
  const [section, setSection] = useState("");
  const [leadSource, setLeadSource] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);

  const addBlock = () => setBlocks((prev) => [...prev, { ...defaultBlock(), id: Date.now() }]);
  const removeBlock = (id: number) => setBlocks((prev) => prev.filter((b) => b.id !== id));
  const updateBlock = (id: number, patch: Partial<Block>) =>
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const addAnswer = (blockId: number) =>
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId
          ? { ...b, answers: [...b.answers, { id: Date.now(), label: `Answer ${b.answers.length + 1}` }] }
          : b
      )
    );
  const removeAnswer = (blockId: number, answerId: number) =>
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId ? { ...b, answers: b.answers.filter((a) => a.id !== answerId) } : b
      )
    );
  const updateAnswer = (blockId: number, answerId: number, label: string) =>
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId
          ? { ...b, answers: b.answers.map((a) => (a.id === answerId ? { ...a, label } : a)) }
          : b
      )
    );

  const fixedFields = ["To'liq ism familyangiz ?", "Telefon raqamingiz ?"];

  // Preview
  const Preview = () => (
    <Paper
      elevation={0}
      sx={{ p: 4, borderRadius: 3, backgroundColor: "#fff", border: "1px solid #eee" }}
    >
      <Typography variant="h6" sx={{ mb: 3, color: formName ? "#1a1a2e" : "#aaa", fontWeight: 600, fontSize: "1.1rem" }}>
        {formName || "Enter form name"}
      </Typography>

      {/* Fixed preview fields */}
      <Box sx={{ mb: 2.5 }}>
        <Typography sx={{ mb: 0.8, fontSize: "0.85rem", color: "#333" }}>
          To'liq ism familyangiz ?<span style={{ color: "red", marginLeft: 4 }}>*</span>
        </Typography>
        <TextField fullWidth size="small" variant="outlined" disabled sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1 } }} />
      </Box>
      <Box sx={{ mb: 2.5 }}>
        <Typography sx={{ mb: 0.8, fontSize: "0.85rem", color: "#333" }}>
          Telefon raqamingiz ?<span style={{ color: "red", marginLeft: 4 }}>*</span>
        </Typography>
        <TextField fullWidth size="small" defaultValue="+998" variant="outlined" InputProps={{ readOnly: true }} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1 } }} />
      </Box>

      {/* Dynamic blocks preview */}
      {blocks.map((block) => (
        <Box key={block.id} sx={{ mb: 2.5 }}>
          <Typography sx={{ mb: 1, fontSize: "0.85rem", color: "#333" }}>
            {block.question}<span style={{ color: "red", marginLeft: 4 }}>*</span>
          </Typography>
          {block.type === "One of the list" && (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              {block.answers.map((a) => (
                <FormControlLabel
                  key={a.id}
                  value={a.label}
                  control={<Radio size="small" sx={{ color: "#ccc", p: 0.5 }} />}
                  label={<Typography sx={{ fontSize: "0.85rem", color: "#555" }}>{a.label}</Typography>}
                />
              ))}
            </Box>
          )}
          {block.type === "Short answer" && <TextField size="small" fullWidth variant="outlined" disabled />}
          {block.type === "Long answer" && <TextField size="small" fullWidth multiline rows={3} variant="outlined" disabled />}
        </Box>
      ))}

      <Button
        variant="contained"
        sx={{ mt: 1, backgroundColor: TEAL, borderRadius: "50px", px: 3, textTransform: "none", fontSize: "0.85rem", boxShadow: "none", "&:hover": { backgroundColor: TEAL_DARK, boxShadow: "none" } }}
      >
        Submit
      </Button>
    </Paper>
  );

  const selectSx = {
    backgroundColor: "#fff",
    borderRadius: 1.5,
    fontSize: "0.9rem",
    "& .MuiOutlinedInput-notchedOutline": { borderColor: "#e0e0e0" },
  };

  return (
    <Box sx={{ display: "flex", gap: 3, alignItems: "flex-start" }}>
      {/* ── Left editor ── */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {/* Form name */}
        <TextField
          fullWidth
          placeholder="Enter form name"
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          size="small"
          sx={{ mb: 1.5, backgroundColor: "#fff", borderRadius: 1.5, "& .MuiOutlinedInput-root": { borderRadius: 1.5, borderColor: "#e0e0e0" } }}
        />

        {/* Selects */}
        <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
          <Select value={branch} onChange={(e) => setBranch(e.target.value)} displayEmpty renderValue={(v) => v || <span style={{ color: "#aaa" }}>Select branch:</span>} sx={selectSx}>
            <MenuItem value="ya_ielts">YA IELTS Campus</MenuItem>
            <MenuItem value="branch2">Branch 2</MenuItem>
          </Select>
        </FormControl>
        <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
          <Select value={section} onChange={(e) => setSection(e.target.value)} displayEmpty renderValue={(v) => v || <span style={{ color: "#aaa" }}>input</span>} sx={selectSx}>
            <MenuItem value="sec1">Section 1</MenuItem>
            <MenuItem value="sec2">Section 2</MenuItem>
          </Select>
        </FormControl>
        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <Select value={leadSource} onChange={(e) => setLeadSource(e.target.value)} displayEmpty renderValue={(v) => v || <span style={{ color: "#aaa" }}>Leads Sources</span>} sx={selectSx}>
            <MenuItem value="src1">Source 1</MenuItem>
            <MenuItem value="src2">Source 2</MenuItem>
          </Select>
        </FormControl>

        {/* Fixed field cards */}
        {fixedFields.map((label, i) => (
          <FixedFieldCard key={i} index={i + 1} label={label} />
        ))}

        {/* Dynamic blocks */}
        {blocks.map((block, idx) => (
          <Paper
            key={block.id}
            variant="outlined"
            sx={{ borderRadius: 2, mb: 1.5, overflow: "hidden", border: "1px solid #e0e0e0" }}
          >
            {/* Block header */}
            <Box sx={{ display: "flex", alignItems: "center", px: 2, py: 1, gap: 2, backgroundColor: "#fff", borderBottom: "1px solid #f0f0f0" }}>
              <Typography sx={{ fontWeight: 600, color: "#555", minWidth: 20, fontSize: "0.85rem" }}>
                {fixedFields.length + idx + 1}
              </Typography>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <Select
                  value={block.type}
                  onChange={(e) => updateBlock(block.id, { type: e.target.value as BlockType })}
                  sx={{ fontSize: "0.85rem", "& .MuiOutlinedInput-notchedOutline": { borderColor: "#e0e0e0" } }}
                >
                  {BLOCK_TYPES.map((t) => <MenuItem key={t} value={t} sx={{ fontSize: "0.85rem" }}>{t}</MenuItem>)}
                </Select>
              </FormControl>
              <Box sx={{ flex: 1 }} />
              <IconButton size="small" onClick={() => removeBlock(block.id)} sx={{ color: "#aaa" }}>
                <MdClose size={15} />
              </IconButton>
            </Box>

            {/* Block body */}
            <Box sx={{ p: 2.5 }}>
              <TextField
                fullWidth size="small"
                value={block.question}
                onChange={(e) => updateBlock(block.id, { question: e.target.value })}
                variant="standard"
                InputProps={{
                  disableUnderline: true,
                  startAdornment: <span style={{ color: "red", marginRight: 6, fontWeight: 700 }}>*</span>,
                  style: { fontWeight: 600, fontSize: "0.95rem" },
                }}
                sx={{ mb: block.type === "One of the list" ? 1.5 : 0 }}
              />

              {block.type === "One of the list" && (
                <Box>
                  {block.answers.map((answer) => (
                    <Box key={answer.id} sx={{ display: "flex", alignItems: "center", mb: 0.8 }}>
                      <Radio size="small" disabled sx={{ color: "#ccc", p: 0.5 }} />
                      <TextField
                        size="small"
                        value={answer.label}
                        onChange={(e) => updateAnswer(block.id, answer.id, e.target.value)}
                        variant="standard"
                        InputProps={{ disableUnderline: true, style: { fontSize: "0.9rem" } }}
                        sx={{ ml: 0.5, flex: 1 }}
                      />
                      {block.answers.length > 1 && (
                        <IconButton size="small" onClick={() => removeAnswer(block.id, answer.id)} sx={{ color: "#ccc" }}>
                          <MdClose size={13} />
                        </IconButton>
                      )}
                    </Box>
                  ))}
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<FiPlus size={13} />}
                    onClick={() => addAnswer(block.id)}
                    sx={{ mt: 1, backgroundColor: TEAL_DARK, borderRadius: "50px", textTransform: "none", boxShadow: "none", fontSize: "0.8rem", px: 2, "&:hover": { backgroundColor: TEAL, boxShadow: "none" } }}
                  >
                    Add answer
                  </Button>
                </Box>
              )}
            </Box>
          </Paper>
        ))}

        {/* Add block */}
        <Button
          variant="contained"
          startIcon={<FiPlus size={15} />}
          onClick={addBlock}
          sx={{ backgroundColor: TEAL_DARK, borderRadius: "50px", textTransform: "none", boxShadow: "none", px: 3, py: 1, fontSize: "0.85rem", mt: 0.5, "&:hover": { backgroundColor: TEAL, boxShadow: "none" } }}
        >
          Add block
        </Button>
      </Box>

      {/* ── Right preview ── */}
      <Box sx={{ width: 560, flexShrink: 0 }}>
        <Preview />
      </Box>
    </Box>
  );
}

// ─── Simple Form Editor ───────────────────────────────────────────────────────
function SimpleFormEditor() {
  const [formName, setFormName] = useState("");
  const [branch, setBranch] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([defaultBlock()]);

  const addBlock = () => setBlocks((prev) => [...prev, { ...defaultBlock(), id: Date.now() }]);
  const removeBlock = (id: number) => setBlocks((prev) => prev.filter((b) => b.id !== id));
  const updateBlock = (id: number, patch: Partial<Block>) =>
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const addAnswer = (blockId: number) =>
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId
          ? { ...b, answers: [...b.answers, { id: Date.now(), label: `Answer ${b.answers.length + 1}` }] }
          : b
      )
    );
  const removeAnswer = (blockId: number, answerId: number) =>
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId ? { ...b, answers: b.answers.filter((a) => a.id !== answerId) } : b
      )
    );
  const updateAnswer = (blockId: number, answerId: number, label: string) =>
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId
          ? { ...b, answers: b.answers.map((a) => (a.id === answerId ? { ...a, label } : a)) }
          : b
      )
    );

  const Preview = () => (
    <Paper elevation={0} sx={{ p: 4, borderRadius: 3, backgroundColor: "#fff", border: "1px solid #eee" }}>
      <Typography variant="h6" sx={{ mb: 3, color: formName ? "#1a1a2e" : "#aaa", fontWeight: 600, fontSize: "1.1rem" }}>
        {formName || "Enter form name"}
      </Typography>
      {blocks.map((block) => (
        <Box key={block.id} sx={{ mb: 3 }}>
          <Typography sx={{ mb: 1.5, fontSize: "0.9rem", color: "#333" }}>
            {block.question}{block.isRequired && <span style={{ color: "red", marginLeft: 4 }}>*</span>}
          </Typography>
          {block.type === "One of the list" && (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              {block.answers.map((a) => (
                <FormControlLabel key={a.id} value={a.label} control={<Radio size="small" sx={{ color: "#ccc" }} />} label={<Typography sx={{ fontSize: "0.85rem", color: "#555" }}>{a.label}</Typography>} />
              ))}
            </Box>
          )}
          {block.type === "Short answer" && <TextField size="small" fullWidth variant="outlined" disabled />}
          {block.type === "Long answer" && <TextField size="small" fullWidth multiline rows={3} variant="outlined" disabled />}
        </Box>
      ))}
      <Button variant="contained" sx={{ mt: 1, backgroundColor: TEAL, borderRadius: "50px", px: 3, textTransform: "none", boxShadow: "none", "&:hover": { backgroundColor: TEAL_DARK, boxShadow: "none" } }}>Submit</Button>
    </Paper>
  );

  return (
    <Box sx={{ display: "flex", gap: 3, alignItems: "flex-start" }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <TextField fullWidth placeholder="Enter form name" value={formName} onChange={(e) => setFormName(e.target.value)} variant="outlined" size="small" sx={{ mb: 1.5, backgroundColor: "#fff", borderRadius: 1.5 }} />
        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <Select value={branch} onChange={(e) => setBranch(e.target.value)} displayEmpty renderValue={(v) => v || <span style={{ color: "#aaa" }}>Select branch:</span>} sx={{ backgroundColor: "#fff", borderRadius: 1.5 }}>
            <MenuItem value="branch1">Branch 1</MenuItem>
            <MenuItem value="branch2">Branch 2</MenuItem>
          </Select>
        </FormControl>

        {blocks.map((block, idx) => (
          <Paper key={block.id} variant="outlined" sx={{ borderRadius: 2, mb: 1.5, overflow: "hidden", border: "1px solid #e0e0e0" }}>
            <Box sx={{ display: "flex", alignItems: "center", px: 2, py: 1, gap: 2, borderBottom: "1px solid #f0f0f0" }}>
              <Typography sx={{ fontWeight: 600, color: "#555", minWidth: 20, fontSize: "0.85rem" }}>{idx + 1}</Typography>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <Select value={block.type} onChange={(e) => updateBlock(block.id, { type: e.target.value as BlockType })} sx={{ fontSize: "0.85rem" }}>
                  {BLOCK_TYPES.map((t) => <MenuItem key={t} value={t} sx={{ fontSize: "0.85rem" }}>{t}</MenuItem>)}
                </Select>
              </FormControl>
              <Box sx={{ flex: 1 }} />
              {blocks.length > 1 && <IconButton size="small" onClick={() => removeBlock(block.id)} sx={{ color: "#aaa" }}><MdClose size={15} /></IconButton>}
            </Box>
            <Box sx={{ p: 2.5 }}>
              <TextField fullWidth size="small" value={block.question} onChange={(e) => updateBlock(block.id, { question: e.target.value })} variant="standard" InputProps={{ disableUnderline: true, startAdornment: <span style={{ color: "red", marginRight: 6, fontWeight: 700 }}>*</span>, style: { fontWeight: 600, fontSize: "0.95rem" } }} sx={{ mb: block.type === "One of the list" ? 1.5 : 0 }} />
              {block.type === "One of the list" && (
                <Box>
                  {block.answers.map((answer) => (
                    <Box key={answer.id} sx={{ display: "flex", alignItems: "center", mb: 0.8 }}>
                      <Radio size="small" disabled sx={{ color: "#ccc", p: 0.5 }} />
                      <TextField size="small" value={answer.label} onChange={(e) => updateAnswer(block.id, answer.id, e.target.value)} variant="standard" InputProps={{ disableUnderline: true }} sx={{ ml: 0.5, flex: 1 }} />
                      {block.answers.length > 1 && <IconButton size="small" onClick={() => removeAnswer(block.id, answer.id)} sx={{ color: "#ccc" }}><MdClose size={13} /></IconButton>}
                    </Box>
                  ))}
                  <Button size="small" variant="contained" startIcon={<FiPlus size={13} />} onClick={() => addAnswer(block.id)} sx={{ mt: 1, backgroundColor: TEAL_DARK, borderRadius: "50px", textTransform: "none", boxShadow: "none", fontSize: "0.8rem", px: 2, "&:hover": { backgroundColor: TEAL, boxShadow: "none" } }}>Add answer</Button>
                </Box>
              )}
            </Box>
          </Paper>
        ))}

        <Button variant="contained" startIcon={<FiPlus size={15} />} onClick={addBlock} sx={{ backgroundColor: TEAL_DARK, borderRadius: "50px", textTransform: "none", boxShadow: "none", px: 3, py: 1, fontSize: "0.85rem", mt: 0.5, "&:hover": { backgroundColor: TEAL, boxShadow: "none" } }}>Add block</Button>
      </Box>
      <Box sx={{ width: 560, flexShrink: 0 }}><Preview /></Box>
    </Box>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export const CreateForm = () => {
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);

  // ✅ Edit rejimida Lead form tab (1) avtomatik tanlanadi
  const [tab, setTab] = useState<number>(isEdit ? 1 : 0);

  const tabSx = {
    cursor: "pointer",
    flex: 1,
    textAlign: "center" as const,
    py: 1.2,
    fontSize: "0.9rem",
    fontWeight: 500,
    fontFamily: "'DM Sans', sans-serif",
    border: "1px solid #d0d5dd",
    userSelect: "none" as const,
    transition: "all 0.15s",
  };

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#f0f2f5", p: 3, fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header row */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 3, mb: 3 }}>
        {/* Custom tab switcher — rasmdagi ko'rinishga mos */}
        <Box sx={{ display: "flex", flex: 1, border: "1px solid #d0d5dd", borderRadius: "6px", overflow: "hidden" }}>
          <Box
            onClick={() => setTab(0)}
            sx={{
              ...tabSx,
              borderRight: "1px solid #d0d5dd",
              borderRadius: "5px 0 0 5px",
              backgroundColor: tab === 0 ? "#fff" : "#fafafa",
              color: tab === 0 ? TEAL_DARK : "#666",
              fontWeight: tab === 0 ? 700 : 500,
              borderColor: tab === 0 ? TEAL_DARK : "transparent",
              borderWidth: tab === 0 ? 2 : 1,
            }}
          >
            Simple form
          </Box>
          <Box
            onClick={() => setTab(1)}
            sx={{
              ...tabSx,
              borderRadius: "0 5px 5px 0",
              backgroundColor: tab === 1 ? "#fff" : "#fafafa",
              color: tab === 1 ? TEAL_DARK : "#666",
              fontWeight: tab === 1 ? 700 : 500,
              borderColor: tab === 1 ? TEAL_DARK : "transparent",
              borderWidth: tab === 1 ? 2 : 1,
            }}
          >
            Lead form
          </Box>
        </Box>

        {/* Save / Update */}
        <Button
          variant="contained"
          sx={{ backgroundColor: TEAL_DARK, borderRadius: "50px", textTransform: "none", fontWeight: 600, px: 4, py: 1.2, boxShadow: "none", whiteSpace: "nowrap", fontSize: "0.9rem", "&:hover": { backgroundColor: TEAL, boxShadow: "none" } }}
        >
          {isEdit ? "Update" : "Save"}
        </Button>
      </Box>

      {/* Content */}
      {tab === 0 ? <SimpleFormEditor /> : <LeadFormEditor />}
    </Box>
  );
};