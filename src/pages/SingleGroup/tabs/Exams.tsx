import { Box, Typography, Button, Stack, Paper } from "@mui/material";
import { GoPlus } from "react-icons/go";
import { useTranslation } from "react-i18next";
export const Exams = () => {
  const { t } = useTranslation();
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={600}>{t("singleGroup.tabs.exams.title")}</Typography>
        <Button startIcon={<GoPlus />} variant="contained" size="small">{t("singleGroup.tabs.exams.addExam")}</Button>
      </Stack>
      <Paper sx={{ p: 4, textAlign: "center", borderRadius: 2, color: "#999" }}>
        {t("singleGroup.tabs.exams.noExamsYet")}
      </Paper>
    </Box>
  );
};