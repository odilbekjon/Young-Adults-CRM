import {
  Avatar, Box, Paper, Stack, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow,
  Typography, TextField
} from "@mui/material";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Student } from "../../../types/group";

interface Props { students: Student[] }

export const Grade = ({ students }: Props) => {
  const { t } = useTranslation();
  const [grades, setGrades] = useState<Record<number, string>>({});

  return (
    <Box>
      <Typography variant="h6" fontWeight={600} mb={2}>{t("singleGroup.tabs.grade.title")}</Typography>
      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>{t("singleGroup.tabs.grade.name")}</TableCell>
              <TableCell>{t("singleGroup.tabs.grade.gradeRange")}</TableCell>
              <TableCell>{t("singleGroup.tabs.grade.result")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {students.map((s, i) => {
              const g = Number(grades[s.id] || 0);
              return (
                <TableRow key={s.id} hover>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Avatar sx={{ width: 28, height: 28, fontSize: 13 }}>{s.name[0]}</Avatar>
                      <Typography fontSize={14}>{s.name}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      type="number"
                      value={grades[s.id] || ""}
                      onChange={(e) =>
                        setGrades((prev) => ({ ...prev, [s.id]: e.target.value }))
                      }
                      inputProps={{ min: 0, max: 100 }}
                      sx={{ width: 100 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        px: 1.5, py: 0.5, borderRadius: 2, display: "inline-block",
                        fontSize: 12, fontWeight: 600,
                        bgcolor: g >= 80 ? "#e8f5e9" : g >= 60 ? "#fff8e1" : g > 0 ? "#ffebee" : "#f5f5f5",
                        color: g >= 80 ? "#2e7d32" : g >= 60 ? "#f57f17" : g > 0 ? "#c62828" : "#999",
                      }}
                    >
                      {g >= 80
                        ? t("singleGroup.tabs.grade.excellent")
                        : g >= 60
                        ? t("singleGroup.tabs.grade.good")
                        : g > 0
                        ? t("singleGroup.tabs.grade.fail")
                        : "—"}
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};