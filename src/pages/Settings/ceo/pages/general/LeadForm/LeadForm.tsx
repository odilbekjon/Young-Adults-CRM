import { useState } from "react";
import { Button, Typography, Box, TextField } from "@mui/material";
import { useTranslation } from "react-i18next";
import { RichTextEditor, DropZone } from "../Shared";
import logo from "../../../../../../assets/logo.jpg";
import Logo from "../../../../../../assets/logo_ya_black.png";

const LeadForm = () => {
  const { t } = useTranslation();
  const [bgPreview, setBgPreview] = useState<string | null>(null);
  const [textForm, setTextForm] = useState("");
  const [textAfterFill, setTextAfterFill] = useState("");
  const [customCss, setCustomCss] = useState("");

  return (
    <Box sx={{ flex: 1, p: 5, maxWidth: 960 }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 4, color: "#111827" }}>
        {t("settings.ceo.general.leadForm.title")}
      </Typography>

      {/* ── Company form background ── */}
      <Typography sx={{ fontWeight: 600, fontSize: 15, mb: 1.5, color: "#111827" }}>
        {t("settings.ceo.general.leadForm.companyFormBackground")}
      </Typography>
      <Box sx={{ display: "flex", gap: 2, mb: 0.5 }}>
        <DropZone preview={bgPreview} onFile={(f) => setBgPreview(URL.createObjectURL(f))} />

        {/* Preview card */}
        <Box
          sx={{
            width: 260,
            height: 160,
            borderRadius: "6px",
            overflow: "hidden",
            flexShrink: 0,
            background: "#1e2a3b",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {bgPreview ? (
            <img
              src={bgPreview}
              alt={t("settings.ceo.general.leadForm.previewAlt")}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <img src={logo} alt={t("settings.ceo.general.leadForm.logoAlt")} />
          )}
        </Box>
      </Box>
      <Typography sx={{ fontSize: 12, color: "#9ca3af", mb: 4 }}>
        {t("settings.ceo.general.leadForm.recommendedImageSize")}
      </Typography>

      {/* ── Text form ── */}
      <Typography sx={{ fontWeight: 600, fontSize: 15, mb: 1.5, color: "#111827" }}>
        {t("settings.ceo.general.leadForm.textForm")}
      </Typography>
      <Box sx={{ display: "flex", gap: 2, mb: 4 }}>
        {/* Editor */}
        <Box sx={{ flex: 1 }}>
          <RichTextEditor value={textForm} onChange={setTextForm} />
        </Box>

        {/* Live preview panel */}
        <Box
          sx={{
            width: 260,
            flexShrink: 0,
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
            overflow: "hidden",
          }}
        >
          {/* Red top bar */}
          <Box sx={{ height: 6, background: "#e74c3c" }} />
          <Box sx={{ p: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography
              sx={{ fontSize: 13, color: "#374151", flex: 1, pr: 1 }}
              dangerouslySetInnerHTML={{
                __html: textForm || t("settings.ceo.general.leadForm.defaultPreviewText"),
              }}
            />
            <img src={Logo} alt={t("settings.ceo.general.leadForm.logoAlt")} width={50} height={20} />
          </Box>
        </Box>
      </Box>

      {/* ── Text after filling out the form ── */}
      <Typography sx={{ fontWeight: 600, fontSize: 15, mb: 1.5, color: "#111827" }}>
        {t("settings.ceo.general.leadForm.textAfterFilling")}
      </Typography>
      <Box sx={{ mb: 4 }}>
        <RichTextEditor value={textAfterFill} onChange={setTextAfterFill} />
      </Box>

      {/* ── Custom CSS ── */}
      <Typography sx={{ fontWeight: 600, fontSize: 15, mb: 0.5, color: "#111827" }}>
        {t("settings.ceo.general.leadForm.customCss")}
      </Typography>
      <Typography sx={{ fontSize: 12, color: "#e74c3c", mb: 1, fontFamily: "monospace" }}>
        {t("settings.ceo.general.leadForm.customCssExample")}
      </Typography>
      <TextField
        fullWidth
        multiline
        minRows={5}
        placeholder={t("settings.ceo.general.leadForm.customCssPlaceholder")}
        value={customCss}
        onChange={(e) => setCustomCss(e.target.value)}
        sx={{
          mb: 4,
          background: "#fff",
          "& .MuiOutlinedInput-root": { fontSize: 13, fontFamily: "monospace" },
        }}
      />

      {/* ── Save ── */}
      <Button
        variant="contained"
        sx={{
          background: "#3b82f6",
          textTransform: "none",
          fontWeight: 600,
          px: 4,
          py: 1,
          borderRadius: "24px",
          fontSize: "0.95rem",
          "&:hover": { background: "#2563eb" },
        }}
      >
        {t("settings.ceo.general.leadForm.save")}
      </Button>
    </Box>
  );
};

export default LeadForm;