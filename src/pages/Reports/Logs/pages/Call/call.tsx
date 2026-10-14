import { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Select,
  MenuItem,
  OutlinedInput,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import { BsCalendar3 } from "react-icons/bs";
import { useTranslation } from "react-i18next";

const columnKeys = ["type", "play", "time", "who", "toWhom", "gateway", "call", "duration", "result"];

export const Call = () => {
  const { t } = useTranslation();
  const [date, setDate] = useState("07.05.2026");
  const [filter, setFilter] = useState("All");

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "var(--color-surface-alt)", p: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 500, mb: 3, color: "var(--color-text-primary)" }}>
        {t("reports.logs.call.title")}
      </Typography>

      {/* Filters */}
      <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
        {/* Date input */}
        <OutlinedInput
          value={date}
          onChange={(e) => setDate(e.target.value)}
          startAdornment={<BsCalendar3 size={14} color="var(--color-text-muted)" style={{ marginRight: 8 }} />}
          sx={{
            bgcolor: "var(--color-surface)",
            fontSize: "0.875rem",
            height: 40,
            width: 200,
            borderRadius: 1,
            "& .MuiOutlinedInput-notchedOutline": { borderColor: "var(--color-border)" },
          }}
        />

        {/* Select */}
        <Select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          input={<OutlinedInput />}
          sx={{
            bgcolor: "var(--color-surface)",
            fontSize: "0.875rem",
            height: 40,
            width: 200,
            borderRadius: 1,
            "& .MuiOutlinedInput-notchedOutline": { borderColor: "var(--color-border)" },
          }}
        >
          <MenuItem value="All">{t("reports.logs.call.filter.all")}</MenuItem>
          <MenuItem value="Incoming">{t("reports.logs.call.filter.incoming")}</MenuItem>
          <MenuItem value="Outgoing">{t("reports.logs.call.filter.outgoing")}</MenuItem>
          <MenuItem value="Missed">{t("reports.logs.call.filter.missed")}</MenuItem>
        </Select>
      </Box>

      {/* Table */}
      <Paper elevation={0} sx={{ border: "1px solid var(--color-border)", borderRadius: 1, overflow: "hidden" }}>
        <Table>
          <TableHead>
            <TableRow>
              {columnKeys.map((colKey) => (
                <TableCell
                  key={colKey}
                  sx={{
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    color: "var(--color-text-primary)",
                    borderBottom: "1px solid var(--color-border)",
                    py: 2,
                    whiteSpace: "nowrap",
                  }}
                >
                  {t(`reports.logs.call.table.${colKey}`)}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell colSpan={columnKeys.length} sx={{ textAlign: "center", py: 4, border: "none" }}>
                <Typography variant="body2" color="text.secondary">
                  {t("reports.logs.call.noData")}
                </Typography>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};