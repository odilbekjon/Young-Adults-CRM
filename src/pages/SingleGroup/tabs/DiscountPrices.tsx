import {
  Box,
  Button,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { MdClose, MdOutlineLocalOffer } from "react-icons/md";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Student } from "../../../types/group";

interface Props {
  students: Student[];
}

type DiscountEntry = {
  amount: number;
  startDate: string;
  endDate: string;
  cause: string;
};

const formatPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 9) {
    const tail = digits.slice(-9);
    return `(${tail.slice(0, 2)}) ${tail.slice(2, 5)}-${tail.slice(5, 7)}-${tail.slice(7, 9)}`;
  }
  return phone;
};

const fmtDate = (d: Date) => {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()}`;
};

const defaultDateRange = () => {
  const start = new Date();
  const end = new Date();
  end.setMonth(end.getMonth() + 8);
  return { startDate: fmtDate(start), endDate: fmtDate(end) };
};

export const DiscountPrices = ({ students }: Props) => {
  const { t } = useTranslation();
  const [discounts, setDiscounts] = useState<Record<number, DiscountEntry>>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftAmount, setDraftAmount] = useState("");
  const [draftCause, setDraftCause] = useState("");

  const startEdit = (studentId: number) => {
    const existing = discounts[studentId];
    setEditingId(studentId);
    setDraftAmount(existing ? String(existing.amount) : "");
    setDraftCause(existing?.cause ?? "");
  };

  const saveDiscount = (studentId: number) => {
    const amount = Number(draftAmount);
    if (Number.isNaN(amount) || draftAmount.trim() === "") return;
    const range = defaultDateRange();
    setDiscounts((prev) => ({
      ...prev,
      [studentId]: {
        amount,
        startDate: prev[studentId]?.startDate ?? range.startDate,
        endDate: prev[studentId]?.endDate ?? range.endDate,
        cause: draftCause.trim(),
      },
    }));
    setEditingId(null);
    setDraftAmount("");
    setDraftCause("");
  };

  const removeDiscount = (studentId: number) => {
    setDiscounts((prev) => {
      const next = { ...prev };
      delete next[studentId];
      return next;
    });
    if (editingId === studentId) {
      setEditingId(null);
      setDraftAmount("");
      setDraftCause("");
    }
  };

  return (
    <Box>
      <Typography variant="h6" fontWeight={600} mb={2}>
        {t("singleGroup.tabs.discountPrices.title")}
      </Typography>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          p: 2,
          mb: 3,
          bgcolor: "#fff",
          border: "1px solid #e0e0e0",
          borderLeft: "4px solid #1976d2",
          borderRadius: 1,
        }}
      >
        <Typography fontSize={14} color="text.secondary" lineHeight={1.5}>
          {t("singleGroup.tabs.discountPrices.hint")}
        </Typography>
        <MdOutlineLocalOffer size={32} color="#1976d2" style={{ flexShrink: 0 }} />
      </Box>

      <TableContainer
        component={Paper}
        elevation={0}
        sx={{ borderRadius: 2, border: "1px solid #e0e0e0" }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "#fafafa" }}>
              <TableCell sx={{ fontWeight: 600, fontSize: 13 }}>{t("singleGroup.tabs.discountPrices.name")}</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: 13 }}>{t("singleGroup.tabs.discountPrices.phone")}</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: 13 }}>
                {t("singleGroup.tabs.discountPrices.individualDiscount")}
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: 13 }}>{t("singleGroup.tabs.discountPrices.cause")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {students.map((student) => {
              const saved = discounts[student.id];
              const isEditing = editingId === student.id;

              return (
                <TableRow key={student.id} hover>
                  <TableCell sx={{ fontSize: 14 }}>{student.name}</TableCell>
                  <TableCell>
                    <Typography fontSize={14} color="#42a5f5">
                      {formatPhone(student.phone)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {saved && !isEditing ? (
                      <Stack spacing={0.5} alignItems="flex-start">
                        <Box
                          sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 0.5,
                            px: 1,
                            py: 0.25,
                            bgcolor: "#f5f5f5",
                            border: "1px solid #e0e0e0",
                            borderRadius: 1,
                          }}
                        >
                          <Typography fontSize={14} fontWeight={500}>
                            {saved.amount}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => removeDiscount(student.id)}
                            sx={{ p: 0.25, color: "text.secondary" }}
                          >
                            <MdClose size={14} />
                          </IconButton>
                        </Box>
                        <Typography fontSize={12} color="text.secondary">
                          {saved.startDate}—{saved.endDate}
                        </Typography>
                      </Stack>
                    ) : isEditing ? (
                      <Stack spacing={0.5} alignItems="flex-start">
                        <TextField
                          size="small"
                          autoFocus
                          type="number"
                          value={draftAmount}
                          onChange={(e) => setDraftAmount(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveDiscount(student.id);
                            if (e.key === "Escape") {
                              setEditingId(null);
                              setDraftAmount("");
                              setDraftCause("");
                            }
                          }}
                          placeholder="0"
                          sx={{
                            width: 72,
                            "& .MuiOutlinedInput-root": {
                              bgcolor: "#f5f5f5",
                              fontSize: 14,
                            },
                          }}
                        />
                      </Stack>
                    ) : (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => startEdit(student.id)}
                        sx={{
                          textTransform: "none",
                          fontSize: 13,
                          fontWeight: 500,
                          borderRadius: 999,
                          px: 2,
                          bgcolor: "#43a047",
                          boxShadow: "none",
                          "&:hover": { bgcolor: "#388e3c", boxShadow: "none" },
                        }}
                      >
                        {t("singleGroup.tabs.discountPrices.editDiscount")}
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <TextField
                        size="small"
                        fullWidth
                        placeholder={t("singleGroup.tabs.discountPrices.cause")}
                        value={draftCause}
                        onChange={(e) => setDraftCause(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveDiscount(student.id);
                        }}
                        sx={{ maxWidth: 220, "& .MuiOutlinedInput-root": { fontSize: 14 } }}
                      />
                    ) : saved?.cause ? (
                      <Typography fontSize={14} color="text.secondary">
                        {saved.cause}
                      </Typography>
                    ) : null}
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
