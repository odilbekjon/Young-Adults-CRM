import { useState } from "react";
import { TextField, Button, Typography, Box } from "@mui/material";
import { useTranslation } from "react-i18next";
import { RichTextEditor, DropZone } from "../Shared";
import logo from "../../../../../../assets/logo.jpg";

const SignIn = () => {
  const { t } = useTranslation();
  const [bgPreview, setBgPreview] = useState<string | null>(null);
  const [textContent, setTextContent] = useState("<p>Young Adults LLC</p><p>Always step ahead !</p>");
  const [customCss, setCustomCss] = useState("");

  const plainPreview = textContent
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n+/g, "\n")
    .trim();

  return (
    <Box sx={{ flex: 1, p: 5, maxWidth: 900 }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 4, color: "#111827" }}>{t("settings.ceo.general.signIn.title")}</Typography>

      {/* Company form background */}
      <Typography sx={{ fontWeight: 600, fontSize: 15, mb: 1.5, color: "#111827" }}>
        {t("settings.ceo.general.signIn.companyFormBackground")}
      </Typography>
      <Box sx={{ display: "flex", gap: 2, mb: 0.5 }}>
        <DropZone preview={bgPreview} onFile={(f) => setBgPreview(URL.createObjectURL(f))} />
        <Box sx={{
          width: 260, height: 160, borderRadius: "6px", overflow: "hidden",
          flexShrink: 0, background: "#1e2a3b",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {bgPreview
            ? <img src={bgPreview} alt={t("settings.ceo.general.signIn.previewAlt")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : (
              <img src={logo} alt={t("settings.ceo.general.signIn.logoAlt")} />
            )
          }
        </Box>
      </Box>
      <Typography sx={{ fontSize: 12, color: "#9ca3af", mb: 4 }}>{t("settings.ceo.general.signIn.recommendedImageSize")}</Typography>

      {/* Text form */}
      <Typography sx={{ fontWeight: 600, fontSize: 15, mb: 1.5, color: "#111827" }}>{t("settings.ceo.general.signIn.textForm")}</Typography>
      <Box sx={{ display: "flex", gap: 2, mb: 4 }}>
        <Box sx={{ flex: 1 }}>
          <RichTextEditor value={textContent} onChange={setTextContent} />
        </Box>
        <Box sx={{ width: 260, flexShrink: 0, borderLeft: "1px solid #e5e7eb", pl: 3, pt: 1 }}>
          {plainPreview.split("\n").map((line, i) => (
            <Typography key={i} sx={{ fontSize: 14, color: "#374151", lineHeight: 1.8 }}>{line}</Typography>
          ))}
        </Box>
      </Box>

      {/* Custom CSS */}
      <Typography sx={{ fontWeight: 600, fontSize: 15, mb: 1.5, color: "#111827" }}>{t("settings.ceo.general.signIn.customCss")}</Typography>
      <TextField
        fullWidth multiline minRows={5} placeholder={t("settings.ceo.general.signIn.customCssPlaceholder")}
        value={customCss} onChange={(e) => setCustomCss(e.target.value)}
        sx={{ mb: 4, background: "#fff", "& .MuiOutlinedInput-root": { fontSize: 13, fontFamily: "monospace" } }}
      />

      <Button variant="contained" sx={{
        background: "#3b82f6", textTransform: "none", fontWeight: 600,
        px: 4, py: 1, borderRadius: "24px", fontSize: "0.95rem",
        "&:hover": { background: "#2563eb" },
      }}>
        {t("settings.ceo.general.signIn.save")}
      </Button>
    </Box>
  );
};

export default SignIn;