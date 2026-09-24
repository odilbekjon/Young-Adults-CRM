import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import {
  TextField, Switch, Button, Typography, Box, Divider, CircularProgress,
} from "@mui/material";
import { MdAccessTime } from "react-icons/md";
import { useTranslation } from "react-i18next";
import { themeColors } from "../Shared";
import {
  useGeneralSettingsQuery,
  useUpdateGeneralSettingsMutation,
} from "../../../../../../app/api/settingsApi";
import type { GeneralSettings } from "../../../../../../app/api/settingsApi/types";
import { useToast } from "../../../../../../Context/ToastContext";
import { extractApiError } from "../../../../../../utils";
import type { RootState } from "../../../../../../app/store";

const EMPTY_FORM: GeneralSettings = {
  companyName: "",
  companyPhone: "",
  startTime: "",
  endTime: "",
  lessonStartStep: false,
  animation: true,
  logoUrl: "",
  themeColor: "",
  offerUrl: "",
};

const GeneralContent = () => {
  const { t } = useTranslation();
  const toast = useToast();
  // General settings are per-branch on the backend (confirmed live) — there
  // is no "all branches" view, so a specific branch must be selected in the
  // header first.
  const selectedBranchId = useSelector((s: RootState) => s.branch.selectedBranchId);

  const { data, isLoading, isError } = useGeneralSettingsQuery(
    { branchId: selectedBranchId ?? "" },
    { skip: !selectedBranchId }
  );
  const [updateSettings, { isLoading: isSaving }] = useUpdateGeneralSettingsMutation();

  const [form, setForm] = useState<GeneralSettings>(EMPTY_FORM);
  const [saveError, setSaveError] = useState<string | null>(null);

  // These two toggles exist in the current UI but have no corresponding
  // field in the Swagger /settings contract (only companyName, companyPhone,
  // startTime, endTime, lessonStartStep, animation, logoUrl, themeColor,
  // offerUrl are documented) — kept as local-only UI state rather than
  // guessing a backend field name for them.
  const [allStaffCoin, setAllStaffCoin] = useState(false);
  const [branchPBX, setBranchPBX] = useState(false);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const set = <K extends keyof GeneralSettings>(key: K, value: GeneralSettings[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!selectedBranchId) return;
    setSaveError(null);
    try {
      await updateSettings({ ...form, branchId: selectedBranchId }).unwrap();
      toast.success(t("settings.ceo.general.generalContent.toast.saved"));
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t("settings.ceo.general.generalContent.toast.error");
      const message = detail ? `${generic}: ${detail}` : generic;
      setSaveError(message);
      toast.error(message);
    }
  };

  if (!selectedBranchId) {
    return (
      <Box sx={{ flex: 1, p: 5 }}>
        <Typography sx={{ fontSize: 14, color: "#6b7280" }}>
          {t("settings.ceo.general.generalContent.selectBranchFirst")}
        </Typography>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box sx={{ flex: 1, p: 5, display: "flex", justifyContent: "center" }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, p: 5, maxWidth: 900 }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 4, color: "#111827" }}>
        {t("settings.ceo.general.generalContent.title")}
      </Typography>

      {isError && (
        <Typography sx={{ mb: 3, fontSize: 13, color: "#d32f2f" }}>
          {t("settings.ceo.general.generalContent.loadError")}
        </Typography>
      )}

      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px 40px" }}>
        {/* Company Name */}
        <Box>
          <Typography sx={{ fontSize: 13, color: "#4b5563", mb: 1 }}>
            {t("settings.ceo.general.generalContent.companyName")} <span style={{ color: "red" }}>*</span>
          </Typography>
          <TextField fullWidth size="small" value={form.companyName}
            onChange={(e) => set("companyName", e.target.value)} sx={{ background: "#fff" }} />
        </Box>

        {/* Company Phone */}
        <Box>
          <Typography sx={{ fontSize: 13, color: "#4b5563", mb: 1 }}>
            {t("settings.ceo.general.generalContent.companyPhone")} <span style={{ color: "red" }}>*</span>
          </Typography>
          <TextField fullWidth size="small" value={form.companyPhone}
            onChange={(e) => set("companyPhone", e.target.value)} sx={{ background: "#fff" }} />
        </Box>

        {/* Start Time */}
        <Box>
          <Typography sx={{ fontSize: 13, color: "#4b5563", mb: 1 }}>
            {t("settings.ceo.general.generalContent.startTime")} <span style={{ color: "red" }}>*</span>
          </Typography>
          <TextField fullWidth size="small" type="time" value={form.startTime}
            onChange={(e) => set("startTime", e.target.value)}
            InputProps={{ startAdornment: <MdAccessTime style={{ color: "#9ca3af", marginRight: 8 }} size={18} /> }}
            sx={{ background: "#fff" }} />
        </Box>

        {/* End Time */}
        <Box>
          <Typography sx={{ fontSize: 13, color: "#4b5563", mb: 1 }}>
            {t("settings.ceo.general.generalContent.endTime")} <span style={{ color: "red" }}>*</span>
          </Typography>
          <TextField fullWidth size="small" type="time" value={form.endTime}
            onChange={(e) => set("endTime", e.target.value)}
            InputProps={{ startAdornment: <MdAccessTime style={{ color: "#9ca3af", marginRight: 8 }} size={18} /> }}
            sx={{ background: "#fff" }} />
        </Box>

        {/* Toggles */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography sx={{ fontSize: 13, color: "#374151" }}>{t("settings.ceo.general.generalContent.lessonStartTimeStep")}</Typography>
          <Switch checked={form.lessonStartStep} onChange={(e) => set("lessonStartStep", e.target.checked)} size="small" />
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography sx={{ fontSize: 13, color: "#374151" }}>{t("settings.ceo.general.generalContent.allStaffCoin")}</Typography>
          <Switch checked={allStaffCoin} onChange={(e) => setAllStaffCoin(e.target.checked)} size="small" />
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography sx={{ fontSize: 13, color: "#374151" }}>{t("settings.ceo.general.generalContent.branchSpecificPbx")}</Typography>
          <Switch checked={branchPBX} onChange={(e) => setBranchPBX(e.target.checked)} size="small" />
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography sx={{ fontSize: 13, color: "#374151" }}>{t("settings.ceo.general.generalContent.animation")}</Typography>
          <Switch checked={form.animation} onChange={(e) => set("animation", e.target.checked)} size="small"
            sx={{
              "& .MuiSwitch-switchBase.Mui-checked": { color: "#2196f3" },
              "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#2196f3" },
            }} />
        </Box>

        {/* Logo — Swagger's /settings body stores logoUrl as a plain string
            (no file-upload endpoint is documented for it), so this is a URL
            field rather than a file picker; the preview renders whatever URL
            is currently set. */}
        <Box>
          <Typography sx={{ fontSize: 13, color: "#374151", mb: 1.5 }}>{t("settings.ceo.general.generalContent.logo")}</Typography>
          <Box sx={{
            border: "1px solid #e5e7eb", borderRadius: "8px",
            width: 180, height: 130, display: "flex", alignItems: "center", justifyContent: "center",
            background: "#fafafa", overflow: "hidden", mb: 1.5,
          }}>
            {form.logoUrl
              ? <img src={form.logoUrl} alt={t("settings.ceo.general.generalContent.logo")} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              : <Typography variant="caption" sx={{ color: "#9ca3af" }}>{t("settings.ceo.general.generalContent.noLogo")}</Typography>
            }
          </Box>
          <TextField fullWidth size="small" placeholder={t("settings.ceo.general.generalContent.logoUrlPlaceholder")}
            value={form.logoUrl} onChange={(e) => set("logoUrl", e.target.value)} sx={{ background: "#fff" }} />
        </Box>

        {/* Theme color + Oferta */}
        <Box>
          <Typography sx={{ fontSize: 13, color: "#374151", mb: 2 }}>{t("settings.ceo.general.generalContent.selectThemeColor")}</Typography>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            {themeColors.map((tc) => (
              <Box key={tc.color} onClick={() => set("themeColor", tc.color)} sx={{
                width: 36, height: 36, borderRadius: "50%", background: tc.color, cursor: "pointer",
                border: tc.border ? "2px solid #b0b0b0" : form.themeColor === tc.color ? "3px solid #1976d2" : "2px solid transparent",
                boxShadow: form.themeColor === tc.color ? "0 0 0 2px #90caf9" : "0 1px 4px rgba(0,0,0,0.15)",
                transform: form.themeColor === tc.color ? "scale(1.15)" : "scale(1)",
                transition: "all 0.15s ease",
              }} />
            ))}
          </Box>

          <Box sx={{ mt: 4 }}>
            <Typography sx={{ fontSize: 13, color: "#374151", mb: 1.5 }}>{t("settings.ceo.general.generalContent.companyOferta")}</Typography>
            <TextField fullWidth size="small" placeholder={t("settings.ceo.general.generalContent.offerUrlPlaceholder")}
              value={form.offerUrl} onChange={(e) => set("offerUrl", e.target.value)} sx={{ background: "#fff" }} />
          </Box>
        </Box>
      </Box>

      {saveError && (
        <Typography sx={{ mt: 3, fontSize: 13, color: "#d32f2f" }}>{saveError}</Typography>
      )}

      <Divider sx={{ my: 4 }} />

      <Button
        variant="contained"
        onClick={handleSave}
        disabled={isSaving}
        startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : undefined}
        sx={{
          background: "#E08C3A", textTransform: "none", fontWeight: 600,
          px: 4, py: 1, fontSize: "0.95rem", "&:hover": { background: "#c97a2e" },
          "&.Mui-disabled": { background: "#eab68c", color: "#fff" },
        }}
      >
        {t("settings.ceo.general.generalContent.save")}
      </Button>
    </Box>
  );
};

export default GeneralContent;
