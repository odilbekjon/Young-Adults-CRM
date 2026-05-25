import { useState, useRef, useEffect } from "react";
import {
  Box, Button, Checkbox, FormControlLabel, Typography, Tooltip,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

// Toolbar icons (react-icons)
import { MdFormatAlignLeft, MdFormatListBulleted, MdFormatListNumbered, MdInsertLink, MdImage, MdVideoLibrary, MdFormatColorText, MdFormatClear } from "react-icons/md";

const TITLE_MAX = 255;

// ── Minimal rich-text toolbar actions ──────────────────────────────────────────
const execCmd = (cmd: string, value?: string) => {
  document.execCommand(cmd, false, value);
};

const ToolbarSelect = ({
  value, options, onChange,
}: {
  value: string;
  options: { label: string; value: string }[];
  onChange: (v: string) => void;
}) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    style={{
      border: "1px solid #e0e0e0",
      borderRadius: 4,
      padding: "3px 6px",
      fontSize: 13,
      color: "#333",
      background: "#fff",
      cursor: "pointer",
      outline: "none",
    }}
  >
    {options.map((o) => (
      <option key={o.value} value={o.value}>{o.label}</option>
    ))}
  </select>
);

const ToolbarBtn = ({
  title, onClick, children,
}: {
  title: string; onClick: () => void; children: React.ReactNode;
}) => (
  <Tooltip title={title}>
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      style={{
        border: "none",
        background: "transparent",
        cursor: "pointer",
        padding: "4px 6px",
        borderRadius: 4,
        display: "flex",
        alignItems: "center",
        color: "#444",
        fontSize: 18,
      }}
    >
      {children}
    </button>
  </Tooltip>
);

// ── Main Page ──────────────────────────────────────────────────────────────────
export const BlogAdd = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [blockStyle, setBlockStyle] = useState("p");
  const [fontFamily, setFontFamily] = useState("Sans Serif");
  const editorRef = useRef<HTMLDivElement>(null);

  // Apply block format
  const applyBlockStyle = (val: string) => {
    setBlockStyle(val);
    execCmd("formatBlock", val === "p" ? "p" : val);
    editorRef.current?.focus();
  };

  // Apply font
  const applyFont = (val: string) => {
    setFontFamily(val);
    execCmd("fontName", val);
    editorRef.current?.focus();
  };

  const handleSave = () => {
    const content = editorRef.current?.innerHTML ?? "";
    console.log({ title, content, isPublic });
    navigate(-1);
  };

  // Keep editor placeholder behaviour
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const onInput = () => {
      if (el.innerHTML === "<br>") el.innerHTML = "";
    };
    el.addEventListener("input", onInput);
    return () => el.removeEventListener("input", onInput);
  }, []);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "#f0f2f5",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        p: 3,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <Box
        sx={{
          width: "100%",
          backgroundColor: "#fff",
          borderRadius: 3,
          border: "1px solid #e8eaed",
          p: 3,
        }}
      >
        {/* Page title */}
        <Typography
          sx={{
            fontSize: "1rem",
            fontWeight: 600,
            color: "#1a1a2e",
            mb: 3,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Blog: Add
        </Typography>

        {/* ── Title input ── */}
        <Typography
          sx={{ fontSize: "0.85rem", fontWeight: 500, color: "#555", mb: 0.8, fontFamily: "'DM Sans', sans-serif" }}
        >
          Title
        </Typography>
        <Box
          sx={{
            position: "relative",
            border: "1px solid #e0e0e0",
            borderRadius: 2,
            mb: 2.5,
            overflow: "hidden",
          }}
        >
          <input
            type="text"
            maxLength={TITLE_MAX}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter title here"
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              padding: "10px 60px 10px 14px",
              fontSize: 14,
              color: "#333",
              fontFamily: "'DM Sans', sans-serif",
              boxSizing: "border-box",
              background: "transparent",
            }}
          />
          <span
            style={{
              position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 12,
              color: "#aaa",
              pointerEvents: "none",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {title.length}/{TITLE_MAX}
          </span>
        </Box>

        {/* ── Rich text editor ── */}
        <Box
          sx={{
            border: "1px solid #e0e0e0",
            borderRadius: 2,
            overflow: "hidden",
            mb: 2,
          }}
        >
          {/* Toolbar */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              px: 1.5,
              py: 0.8,
              borderBottom: "1px solid #f0f0f0",
              flexWrap: "wrap",
            }}
          >
            {/* Block style */}
            <ToolbarSelect
              value={blockStyle}
              options={[
                { label: "Normal", value: "p" },
                { label: "Heading 1", value: "h1" },
                { label: "Heading 2", value: "h2" },
                { label: "Heading 3", value: "h3" },
              ]}
              onChange={applyBlockStyle}
            />

            {/* Font family */}
            <ToolbarSelect
              value={fontFamily}
              options={[
                { label: "Sans Serif", value: "sans-serif" },
                { label: "Serif", value: "serif" },
                { label: "Monospace", value: "monospace" },
              ]}
              onChange={applyFont}
            />

            <Box sx={{ width: 1, height: 20, backgroundColor: "#e0e0e0", mx: 0.5 }} />

            <ToolbarBtn title="Align left" onClick={() => execCmd("justifyLeft")}>
              <MdFormatAlignLeft />
            </ToolbarBtn>
            <ToolbarBtn title="Ordered list" onClick={() => execCmd("insertOrderedList")}>
              <MdFormatListNumbered />
            </ToolbarBtn>
            <ToolbarBtn title="Unordered list" onClick={() => execCmd("insertUnorderedList")}>
              <MdFormatListBulleted />
            </ToolbarBtn>

            <Box sx={{ width: 1, height: 20, backgroundColor: "#e0e0e0", mx: 0.5 }} />

            <ToolbarBtn
              title="Insert link"
              onClick={() => {
                const url = prompt("Enter URL:");
                if (url) execCmd("createLink", url);
              }}
            >
              <MdInsertLink />
            </ToolbarBtn>
            <ToolbarBtn
              title="Insert image"
              onClick={() => {
                const url = prompt("Image URL:");
                if (url) execCmd("insertImage", url);
              }}
            >
              <MdImage />
            </ToolbarBtn>
            <ToolbarBtn title="Embed video" onClick={() => {}}>
              <MdVideoLibrary />
            </ToolbarBtn>

            <Box sx={{ width: 1, height: 20, backgroundColor: "#e0e0e0", mx: 0.5 }} />

            <ToolbarBtn title="Text color" onClick={() => {}}>
              <MdFormatColorText />
            </ToolbarBtn>
            <ToolbarBtn title="Clear formatting" onClick={() => execCmd("removeFormat")}>
              <MdFormatClear />
            </ToolbarBtn>
          </Box>

          {/* Editable area */}
          <Box
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            data-placeholder="Insert text here ..."
            onInput={() => {}}
            sx={{
              minHeight: 220,
              p: 2,
              outline: "none",
              fontSize: "0.9rem",
              color: "#333",
              fontFamily: "'DM Sans', sans-serif",
              lineHeight: 1.7,
              "&:empty::before": {
                content: "attr(data-placeholder)",
                color: "#bbb",
                pointerEvents: "none",
              },
            }}
          />
        </Box>

        {/* ── Public checkbox ── */}
        <FormControlLabel
          control={
            <Checkbox
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              size="small"
              sx={{ color: "#d0d5dd", "&.Mui-checked": { color: "#3b9ede" } }}
            />
          }
          label={
            <Typography sx={{ fontSize: "0.9rem", color: "#444", fontFamily: "'DM Sans', sans-serif" }}>
              Public
            </Typography>
          }
          sx={{ mb: 2.5 }}
        />

        {/* ── Save button ── */}
        <Box>
          <Button
            variant="contained"
            onClick={handleSave}
            sx={{
              backgroundColor: "#3b9ede",
              borderRadius: "50px",
              textTransform: "none",
              fontWeight: 600,
              fontSize: "0.9rem",
              px: 3.5,
              py: 1,
              boxShadow: "none",
              fontFamily: "'DM Sans', sans-serif",
              "&:hover": { backgroundColor: "#2e8bc7", boxShadow: "none" },
            }}
          >
            Save
          </Button>
        </Box>
      </Box>
    </Box>
  );
};