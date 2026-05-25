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
  "Monthly (per calendar month)",
  "Monthly (per lesson month)",
  "Per lesson",
  "Weekly",
];

const Accural = () => {
  const [paymentMode, setPaymentMode] = useState("");
  const [settings, setSettings] = useState<AccuralSettings>(defaultSettings);

  const handleChange = (key: keyof AccuralSettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    console.log("Saved:", { paymentMode, settings });
  };

  const checkboxItems: { key: keyof AccuralSettings; label: string }[] = [
    { key: "allowSendingSms", label: "Teachers: Allow sending SMS to their students" },
    { key: "hideStudentContacts", label: "Teachers: Hide student contacts" },
    { key: "attendanceOnlyDuringLesson", label: "Teachers: setting attendance only during the lesson" },
    { key: "allowGroupIntersection", label: "Schedule: allow the intersection of groups with one classroom/teacher" },
    { key: "showGroupBalance", label: "Show group balance" },
  ];

  return (
    <Box sx={{ p: 3,  }}>
      <Typography variant="h5" fontWeight={500} mb={3}>
        Accrual and payment
      </Typography>

      {/* Student payment mode */}
      <FormControl fullWidth sx={{ mb: 3 }}>
        <Typography fontSize={14} mb={0.5}>
          Student payment mode{" "}
          <Box component="span" sx={{ color: "red" }}>
            *
          </Box>
        </Typography>
        <Select
          displayEmpty
          value={paymentMode}
          onChange={(e) => setPaymentMode(e.target.value)}
          renderValue={(val) =>
            val ? val : (
              <Typography color="text.disabled" fontSize={14}>
                Monthly (per calendar month)
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
              {mode}
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
          Others
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
          Save
        </Button>
      </Box>
    </Box>
  );
};

export default Accural;