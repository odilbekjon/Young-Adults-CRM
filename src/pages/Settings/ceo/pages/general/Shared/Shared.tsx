import { useRef, useState, useCallback } from "react";
import { Box, Typography } from "@mui/material";
import { BsCloudUpload } from "react-icons/bs";
import {
  MdFormatAlignLeft,
  MdFormatListBulleted,
  MdFormatListNumbered,
  MdLink,
  MdImage,
  MdTableChart,
  MdFormatColorText,
  MdOutlineFormatColorReset,
} from "react-icons/md";

// ─────────────────────────────────────────────
// Sidebar items
// ─────────────────────────────────────────────
export const SIDEBAR_ITEMS = [
  { label: "General settings", key: "general" },
  { label: "Sign in", key: "signin" },
  { label: "Lead form", key: "lead" },
  { label: "Payment methods", key: "payment" },
  { label: "Communication", key: "communication" },
  { label: "Integrations", key: "integrations" },
  { label: "Exams", key: "exams" },
  { label: "Invoice", key: "invoice" },
  { label: "Accrual and payment", key: "accural" },
  { label: "Landing page", key: "landing" },
];

export const themeColors = [
  { color: "#7B2D8B" },
  { color: "#FFFFFF", border: true },
  { color: "#4A6741" },
  { color: "#E08C3A" },
  { color: "#8B1A1A" },
];

// ─────────────────────────────────────────────
// Rich-text editor
// ─────────────────────────────────────────────
const FONTS = ["Sans Serif", "Serif", "Monospace", "Cursive"];
const FORMAT_OPTIONS = ["Normal", "Heading 1", "Heading 2", "Heading 3"];

export const RichTextEditor = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [fmt, setFmt] = useState("Normal");
  const [font, setFont] = useState("Sans Serif");

  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
  };

  const selStyle: React.CSSProperties = {
    border: "1px solid #d1d5db",
    borderRadius: 4,
    padding: "2px 6px",
    fontSize: 13,
    background: "#fff",
    cursor: "pointer",
  };
  const btnStyle: React.CSSProperties = {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 3,
    display: "flex",
    alignItems: "center",
  };

  return (
    <Box sx={{ border: "1px solid #d1d5db", borderRadius: "6px", overflow: "hidden", background: "#fff" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.5, py: 0.8, borderBottom: "1px solid #e5e7eb", background: "#fafafa", flexWrap: "wrap" }}>
        <select value={fmt} onChange={(e) => { setFmt(e.target.value); exec("formatBlock", e.target.value === "Normal" ? "p" : e.target.value.replace(" ", "").toLowerCase()); }} style={selStyle}>
          {FORMAT_OPTIONS.map((f) => <option key={f}>{f}</option>)}
        </select>
        <select value={font} onChange={(e) => { setFont(e.target.value); exec("fontName", e.target.value); }} style={selStyle}>
          {FONTS.map((f) => <option key={f}>{f}</option>)}
        </select>
        <Box sx={{ width: "1px", height: 20, background: "#e5e7eb", mx: 0.5 }} />
        <button onClick={() => exec("justifyLeft")} style={btnStyle}><MdFormatAlignLeft size={18} color="#374151" /></button>
        <button onClick={() => exec("insertOrderedList")} style={btnStyle}><MdFormatListNumbered size={18} color="#374151" /></button>
        <button onClick={() => exec("insertUnorderedList")} style={btnStyle}><MdFormatListBulleted size={18} color="#374151" /></button>
        <Box sx={{ width: "1px", height: 20, background: "#e5e7eb", mx: 0.5 }} />
        <button onClick={() => { const u = prompt("URL:"); if (u) exec("createLink", u); }} style={btnStyle}><MdLink size={18} color="#374151" /></button>
        <button onClick={() => { const u = prompt("Image URL:"); if (u) exec("insertImage", u); }} style={btnStyle}><MdImage size={18} color="#374151" /></button>
        <button style={btnStyle}><MdTableChart size={18} color="#374151" /></button>
        <Box sx={{ width: "1px", height: 20, background: "#e5e7eb", mx: 0.5 }} />
        <button style={btnStyle}><MdFormatColorText size={18} color="#374151" /></button>
        <button onClick={() => exec("removeFormat")} style={btnStyle}><MdOutlineFormatColorReset size={18} color="#374151" /></button>
      </Box>
      <Box
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
        dangerouslySetInnerHTML={{ __html: value }}
        sx={{ minHeight: 100, p: 2, fontSize: 14, color: "#374151", outline: "none", lineHeight: 1.7 }}
      />
    </Box>
  );
};

// ─────────────────────────────────────────────
// Drop zone
// ─────────────────────────────────────────────
export const DropZone = ({ onFile }: { preview: string | null; onFile: (f: File) => void }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }, [onFile]);

  return (
    <Box
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      sx={{
        border: `1.5px dashed ${dragging ? "#3b82f6" : "#d1d5db"}`,
        borderRadius: "6px", minHeight: 160, display: "flex",
        flexDirection: "column", alignItems: "center", justifyContent: "center",
        background: dragging ? "#eff6ff" : "#fafafa",
        transition: "all 0.2s", cursor: "pointer", flex: 1,
      }}
    >
      <BsCloudUpload size={48} color="#9ca3af" />
      <Typography sx={{ fontSize: 13, color: "#6b7280", mt: 1.5 }}>
        Drop file here or{" "}
        <span style={{ color: "#3b82f6", textDecoration: "underline" }}>click to upload</span>
      </Typography>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }}
        onChange={(e) => { if (e.target.files?.[0]) onFile(e.target.files[0]); }} />
    </Box>
  );
};