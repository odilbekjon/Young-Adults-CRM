import { useState } from "react";
import {
  Box,
  Typography,
  Checkbox,
  FormControlLabel,
  Button,
  Select,
  MenuItem,
  FormControl,
  // InputLabel,
  // FormHelperText,
  Paper,
} from "@mui/material";
import { useTranslation } from "react-i18next";

interface AccuralSettings {
  allowSendingSms: boolean;
  hideStudentContacts: boolean;
  attendanceOnlyDuringLesson: boolean;
  allowGroupIntersection: boolean;
  showGroupBalance: boolean;
}

const defaultSettings: AccuralSettings = {
  allowSendingSms: false,
  hideStudentContacts: false,
  attendanceOnlyDuringLesson: false,
  allowGroupIntersection: false,
  showGroupBalance: false,
};

const paymentModes = [
  "monthlyCalendar",
  "monthlyLesson",
  "perLesson",
  "weekly",
];

const Accural = () => {
  const { t } = useTranslation();
  const [paymentMode, setPaymentMode] = useState("");
  const [settings, setSettings] = useState<AccuralSettings>(defaultSettings);

  const handleChange = (key: keyof AccuralSettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    console.log("Saved:", { paymentMode, settings });
  };

  const checkboxItems: { key: keyof AccuralSettings; label: string }[] = [
    { key: "allowSendingSms", label: t("settings.ceo.general.accrual.checkboxes.allowSendingSms") },
    { key: "hideStudentContacts", label: t("settings.ceo.general.accrual.checkboxes.hideStudentContacts") },
    { key: "attendanceOnlyDuringLesson", label: t("settings.ceo.general.accrual.checkboxes.attendanceOnlyDuringLesson") },
    { key: "allowGroupIntersection", label: t("settings.ceo.general.accrual.checkboxes.allowGroupIntersection") },
    { key: "showGroupBalance", label: t("settings.ceo.general.accrual.checkboxes.showGroupBalance") },
  ];

  return (
    <Box sx={{ p: 3,  }}>
      <Typography variant="h5" fontWeight={500} mb={3}>
        {t("settings.ceo.general.accrual.title")}
      </Typography>

      {/* Student payment mode */}
      <FormControl fullWidth sx={{ mb: 3 }}>
        <Typography fontSize={14} mb={0.5}>
          {t("settings.ceo.general.accrual.paymentModeLabel")}{" "}
          <Box component="span" sx={{ color: "red" }}>
            *
          </Box>
        </Typography>
        <Select
          displayEmpty
          value={paymentMode}
          onChange={(e) => setPaymentMode(e.target.value)}
          renderValue={(val) =>
            val ? (
              t(`settings.ceo.general.accrual.paymentModes.${val}`)
            ) : (
              <Typography color="text.disabled" fontSize={14}>
                {t("settings.ceo.general.accrual.paymentModes.monthlyCalendar")}
              </Typography>
            )
          }
          sx={{
            bgcolor: "#f5f6fa",
            "& .MuiOutlinedInput-notchedOutline": { borderColor: "#e0e0e0" },
            fontSize: 14,
          }}
        >
          {paymentModes.map((mode) => (
            <MenuItem key={mode} value={mode} sx={{ fontSize: 14 }}>
              {t(`settings.ceo.general.accrual.paymentModes.${mode}`)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Others group */}
      <Paper
        variant="outlined"
        sx={{ borderRadius: 1, maxWidth: 700, position: "relative", pt: 2, pb: 1, px: 2 }}
      >
        <Typography
          sx={{
            position: "absolute",
            top: -11,
            left: 12,
            bgcolor: "#fff",
            px: 0.5,
            fontSize: 13,
            color: "#555",
          }}
        >
          {t("settings.ceo.general.accrual.others")}
        </Typography>

        {checkboxItems.map((item) => (
          <FormControlLabel
            key={item.key}
            control={
              <Checkbox
                checked={settings[item.key]}
                onChange={() => handleChange(item.key)}
                size="small"
                sx={{ py: 0.5 }}
              />
            }
            label={<Typography fontSize={14}>{item.label}</Typography>}
            sx={{ display: "flex", ml: 0, mb: 0.5 }}
          />
        ))}
      </Paper>

      {/* Save button */}
      <Box mt={3}>
        <Button
          variant="contained"
          onClick={handleSave}
          sx={{
            textTransform: "none",
            bgcolor: "#1a3f6f",
            borderRadius: 5,
            px: 3,
            fontWeight: 500,
            "&:hover": { bgcolor: "#15345c" },
          }}
        >
          {t("settings.ceo.general.accrual.save")}
        </Button>
      </Box>
    </Box>
  );
};

export default Accural;