import { useState } from "react";
import {
  Box, Button, Typography, IconButton, Tooltip, Divider, TextField,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { FiEdit2 } from "react-icons/fi";
import { RiDeleteBin6Line } from "react-icons/ri";
import { MdAdd } from "react-icons/md";
import { useNavigate } from "react-router-dom";

interface Blog {
  id: number;
  title: string;
  content: string;
}

const initialBlogs: Blog[] = [];

export const WhatsNew = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [blogs, setBlogs] = useState<Blog[]>(initialBlogs);
  const [selected, setSelected] = useState<Blog | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Add new blog
//   const handleAdd = () => {
//     const newBlog: Blog = {
//       id: Date.now(),
//       title: "New blog post",
//       content: "",
//     };
//     setBlogs((prev) => [...prev, newBlog]);
//     setSelected(newBlog);
//     setEditTitle(newBlog.title);
//     setEditContent(newBlog.content);
//     setIsEditing(true);
//   };

  // Select blog
  const handleSelect = (blog: Blog) => {
    setSelected(blog);
    setEditTitle(blog.title);
    setEditContent(blog.content);
    setIsEditing(false);
  };

  // Delete blog
  const handleDelete = () => {
    if (!selected) return;
    setBlogs((prev) => prev.filter((b) => b.id !== selected.id));
    setSelected(null);
    setIsEditing(false);
  };

  // Save edit
  const handleSave = () => {
    if (!selected) return;
    const updated = { ...selected, title: editTitle, content: editContent };
    setBlogs((prev) => prev.map((b) => (b.id === selected.id ? updated : b)));
    setSelected(updated);
    setIsEditing(false);
  };

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "var(--color-surface-alt)", p: 3, fontFamily: "'DM Sans', sans-serif" }}>
      {/* ── Page header ── */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Typography
          sx={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--color-text-primary)", fontFamily: "'DM Sans', sans-serif" }}
        >
          {t("settings.blog.whatsNew.title")}
        </Typography>
        <Button
          variant="contained"
          startIcon={<MdAdd size={18} />}
          onClick={() => navigate("/settings/blog/whats-new/add")}
          sx={{
            backgroundColor: "#3b9ede",
            borderRadius: "50px",
            px: 3,
            py: 1,
            textTransform: "none",
            fontWeight: 600,
            fontSize: "0.9rem",
            fontFamily: "'DM Sans', sans-serif",
            boxShadow: "none",
            "&:hover": { backgroundColor: "#2e8bc7", boxShadow: "none" },
          }}
        >
          {t("settings.blog.whatsNew.actions.add")}
        </Button>
      </Box>

      <Divider sx={{ mb: 2.5, borderColor: "#dde1e7" }} />

      {/* ── Two-panel layout ── */}
      <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 2, alignItems: { xs: "stretch", md: "flex-start" } }}>
        {/* ── Left: Blog list ── */}
        <Box
          sx={{
            width: { xs: "100%", md: 280 },
            flexShrink: 0,
            backgroundColor: "var(--color-surface)",
            borderRadius: 3,
            border: "1px solid var(--color-border)",
            overflow: "hidden",
            minHeight: 480,
          }}
        >
          {/* List header */}
          <Box sx={{ px: 2.5, py: 1.8, borderBottom: "1px solid var(--color-border-subtle)" }}>
            <Typography sx={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--color-text-secondary)", fontFamily: "'DM Sans', sans-serif" }}>
              {t("settings.blog.whatsNew.list.header")}
            </Typography>
          </Box>

          {/* List items */}
          <Box>
            {blogs.length === 0 ? (
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 380 }}>
                <Typography sx={{ color: "var(--color-text-muted)", fontSize: "0.9rem", fontFamily: "'DM Sans', sans-serif" }}>
                  {t("settings.blog.whatsNew.list.empty")}
                </Typography>
              </Box>
            ) : (
              blogs.map((blog) => (
                <Box
                  key={blog.id}
                  onClick={() => handleSelect(blog)}
                  sx={{
                    px: 2.5,
                    py: 1.6,
                    cursor: "pointer",
                    borderBottom: "1px solid var(--color-border-subtle)",
                    backgroundColor: selected?.id === blog.id ? "var(--color-primary-surface)" : "transparent",
                    borderLeft: selected?.id === blog.id ? "3px solid #3b9ede" : "3px solid transparent",
                    transition: "all 0.15s",
                    "&:hover": { backgroundColor: "#f7f9fc" },
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.88rem",
                      fontWeight: selected?.id === blog.id ? 600 : 400,
                      color: selected?.id === blog.id ? "var(--color-primary)" : "var(--color-text-primary)",
                      fontFamily: "'DM Sans', sans-serif",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {blog.title}
                  </Typography>
                </Box>
              ))
            )}
          </Box>
        </Box>

        {/* ── Right: Detail / Editor ── */}
        <Box
          sx={{
            flex: 1,
            backgroundColor: "var(--color-surface)",
            borderRadius: 3,
            border: "1px solid var(--color-border)",
            minHeight: 480,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {selected ? (
            <>
              {/* Action icons */}
              <Box
                sx={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  zIndex: 2,
                }}
              >
                <Tooltip title={t("settings.blog.whatsNew.tooltips.edit")}>
                  <IconButton
                    size="small"
                    onClick={() => setIsEditing(true)}
                    sx={{
                      width: 34,
                      height: 34,
                      border: "1.5px solid #f59e0b",
                      color: "#f59e0b",
                      backgroundColor: "var(--color-surface)",
                      "&:hover": { backgroundColor: "#fffbeb" },
                    }}
                  >
                    <FiEdit2 size={15} />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t("settings.blog.whatsNew.tooltips.delete")}>
                  <IconButton
                    size="small"
                    onClick={handleDelete}
                    sx={{
                      width: 34,
                      height: 34,
                      border: "1.5px solid #ef4444",
                      color: "#ef4444",
                      backgroundColor: "var(--color-surface)",
                      "&:hover": { backgroundColor: "#fff5f5" },
                    }}
                  >
                    <RiDeleteBin6Line size={15} />
                  </IconButton>
                </Tooltip>
              </Box>

              {/* Title area */}
              <Box sx={{ px: 3, pt: 3, pb: 1.5, borderBottom: "1px solid var(--color-border-subtle)", pr: 10 }}>
                {isEditing ? (
                  <TextField
                    fullWidth
                    size="small"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder={t("settings.blog.whatsNew.placeholders.blogTitle")}
                    variant="standard"
                    InputProps={{
                      disableUnderline: false,
                      style: { fontSize: "1.1rem", fontWeight: 600, color: "var(--color-text-primary)" },
                    }}
                  />
                ) : (
                  <Typography
                    sx={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--color-text-primary)", fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {selected.title}
                  </Typography>
                )}
              </Box>

              {/* Content area */}
              <Box sx={{ p: 3 }}>
                <Box
                  sx={{
                    border: "1px solid var(--color-border)",
                    borderRadius: 2,
                    minHeight: 340,
                    overflow: "hidden",
                  }}
                >
                  {isEditing ? (
                    <TextField
                      fullWidth
                      multiline
                      minRows={14}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      placeholder={t("settings.blog.whatsNew.placeholders.blogContent")}
                      variant="outlined"
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          border: "none",
                          "& fieldset": { border: "none" },
                          fontSize: "0.9rem",
                          color: "var(--color-text-primary)",
                          alignItems: "flex-start",
                          p: 2,
                        },
                      }}
                    />
                  ) : (
                    <Box sx={{ p: 2.5, minHeight: 340 }}>
                      <Typography
                        sx={{ fontSize: "0.9rem", color: "var(--color-text-secondary)", whiteSpace: "pre-wrap", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.7 }}
                      >
                        {selected.content || ""}
                      </Typography>
                    </Box>
                  )}
                </Box>

                {/* Save button when editing */}
                {isEditing && (
                  <Box sx={{ display: "flex", gap: 1.5, mt: 2 }}>
                    <Button
                      variant="contained"
                      onClick={handleSave}
                      sx={{
                        backgroundColor: "#1a4d6e",
                        borderRadius: "50px",
                        textTransform: "none",
                        fontWeight: 600,
                        px: 3,
                        boxShadow: "none",
                        "&:hover": { backgroundColor: "#3b9ede", boxShadow: "none" },
                      }}
                    >
                      {t("settings.blog.whatsNew.actions.save")}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => { setIsEditing(false); setEditTitle(selected.title); setEditContent(selected.content); }}
                      sx={{
                        borderRadius: "50px",
                        textTransform: "none",
                        fontWeight: 500,
                        px: 3,
                        borderColor: "var(--color-border)",
                        color: "var(--color-text-secondary)",
                        "&:hover": { borderColor: "#aaa", backgroundColor: "var(--color-surface-alt)" },
                      }}
                    >
                      {t("settings.blog.whatsNew.actions.cancel")}
                    </Button>
                  </Box>
                )}
              </Box>
            </>
          ) : (
            /* Empty right panel */
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 480 }}>
              <Typography sx={{ color: "var(--color-text-muted)", fontSize: "0.9rem", fontFamily: "'DM Sans', sans-serif" }}>
                {t("settings.blog.whatsNew.emptyState.selectBlog")}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};