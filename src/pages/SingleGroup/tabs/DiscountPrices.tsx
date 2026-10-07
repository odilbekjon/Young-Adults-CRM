import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
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
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Student } from "../../../types/group";
import {
  useCreateStudentDiscountMutation,
  useDeleteStudentDiscountMutation,
  useLazyStudentDiscountForEditQuery,
  useStudentDiscountsByGroupQuery,
  useUpdateStudentDiscountMutation,
} from "../../../app/api/studentDiscountsApi";
import type { StudentDiscountRecord, StudentDiscountType } from "../../../app/api/studentDiscountsApi/types";
import { useToast } from "../../../Context/ToastContext";
import { extractApiError } from "../../../utils/extractApiError";

type DiscountStudent = Student & { realId: string; studentGroupId?: string };

interface Props {
  groupId: string;
  groupPrice: number;
  students: DiscountStudent[];
}

interface DiscountDraft {
  type: StudentDiscountType;
  value: string;
  startDate: string;
  endDate: string;
  reason: string;
}

const formatPhone = (phone: string | null | undefined) => {
  const raw = phone ?? "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 9) {
    const tail = digits.slice(-9);
    return `(${tail.slice(0, 2)}) ${tail.slice(2, 5)}-${tail.slice(5, 7)}-${tail.slice(7, 9)}`;
  }
  return raw;
};

const localISODate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const defaultDateRange = () => {
  const start = new Date();
  const end = new Date();
  end.setMonth(end.getMonth() + 8);
  return { startDate: localISODate(start), endDate: localISODate(end) };
};

const formatDate = (date: string) => {
  if (!date) return "";
  const [year, month, day] = date.slice(0, 10).split("-");
  return `${day}.${month}.${year}`;
};

const formatMoney = (amount: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(amount);

const latestDiscountsByStudent = (records: StudentDiscountRecord[]) => {
  const latest = new Map<string, StudentDiscountRecord>();
  [...records]
    .filter((record) => record.status !== "DELETED")
    .sort((a, b) => {
      if (a.status === "ACTIVE" && b.status !== "ACTIVE") return -1;
      if (b.status === "ACTIVE" && a.status !== "ACTIVE") return 1;
      return b.startDate.localeCompare(a.startDate);
    })
    .forEach((record) => {
      if (record.studentId && !latest.has(record.studentId)) latest.set(record.studentId, record);
    });
  return latest;
};

export const DiscountPrices = ({ groupId, groupPrice, students }: Props) => {
  const { t } = useTranslation();
  const toast = useToast();
  const { data: records = [], isLoading, isError } = useStudentDiscountsByGroupQuery(groupId, { skip: !groupId });
  const [createDiscount, { isLoading: isCreating }] = useCreateStudentDiscountMutation();
  const [updateDiscount, { isLoading: isUpdating }] = useUpdateStudentDiscountMutation();
  const [deleteDiscount] = useDeleteStudentDiscountMutation();
  const [fetchDiscountForEdit] = useLazyStudentDiscountForEditQuery();
  const [editingStudent, setEditingStudent] = useState<DiscountStudent | null>(null);
  const [draft, setDraft] = useState<DiscountDraft | null>(null);
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);
  const discountsByStudent = useMemo(() => latestDiscountsByStudent(records), [records]);

  const startEdit = async (student: DiscountStudent, existing?: StudentDiscountRecord) => {
    if (existing) {
      setLoadingEditId(student.realId);
      try {
        const record = await fetchDiscountForEdit(existing.id).unwrap();
        setDraft({
          type: record.type,
          value: String(record.value),
          startDate: record.startDate,
          endDate: record.endDate,
          reason: record.reason,
        });
      } catch (error) {
        const detail = extractApiError(error);
        toast.error(detail ? `${t("singleGroup.tabs.discountPrices.loadError")} ${detail}` : t("singleGroup.tabs.discountPrices.loadError"));
        setLoadingEditId(null);
        return;
      }
      setLoadingEditId(null);
    } else {
      const range = defaultDateRange();
      setDraft({ type: "FIXED", value: "", ...range, reason: "" });
    }
    setEditingStudent(student);
  };

  const cancelEdit = () => {
    setEditingStudent(null);
    setDraft(null);
  };

  const saveDiscount = async (student: DiscountStudent, existing?: StudentDiscountRecord) => {
    if (!draft) return;
    const value = Number(draft.value);
    if (
      !Number.isFinite(value) ||
      draft.value.trim() === "" ||
      value < 0 ||
      (draft.type === "PERCENTAGE" && value > 100) ||
      !draft.startDate ||
      !draft.endDate ||
      draft.endDate < draft.startDate
    ) {
      toast.error(t("singleGroup.tabs.discountPrices.validationError"));
      return;
    }

    try {
      if (existing) {
        await updateDiscount({
          id: existing.id,
          type: draft.type,
          value,
          startDate: draft.startDate,
          endDate: draft.endDate,
          reason: draft.reason.trim(),
        }).unwrap();
      } else {
        await createDiscount({
          studentId: student.realId,
          groupId,
          studentGroupId: student.studentGroupId,
          type: draft.type,
          value,
          startDate: draft.startDate,
          endDate: draft.endDate,
          reason: draft.reason.trim(),
        }).unwrap();
      }
      cancelEdit();
    } catch (error) {
      const detail = extractApiError(error);
      toast.error(detail ? `${t("singleGroup.tabs.discountPrices.saveError")} ${detail}` : t("singleGroup.tabs.discountPrices.saveError"));
    }
  };

  const handleDelete = async (record: StudentDiscountRecord) => {
    try {
      await deleteDiscount(record.id).unwrap();
      if (editingStudent?.realId === record.studentId) cancelEdit();
    } catch (error) {
      const detail = extractApiError(error);
      toast.error(detail ? `${t("singleGroup.tabs.discountPrices.deleteError")} ${detail}` : t("singleGroup.tabs.discountPrices.deleteError"));
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

      {isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {t("singleGroup.tabs.discountPrices.loadError")}
        </Alert>
      )}

      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: "1px solid #e0e0e0" }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "#fafafa" }}>
              <TableCell sx={{ fontWeight: 600, fontSize: 13 }}>{t("singleGroup.tabs.discountPrices.name")}</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: 13 }}>{t("singleGroup.tabs.discountPrices.phone")}</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: 13 }}>{t("singleGroup.tabs.discountPrices.individualDiscount")}</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: 13 }}>{t("singleGroup.tabs.discountPrices.cause")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  {t("singleGroup.tabs.discountPrices.loadError")}
                </TableCell>
              </TableRow>
            ) : students.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  {t("singleGroup.tabs.discountPrices.noStudents")}
                </TableCell>
              </TableRow>
            ) : (
              students.map((student) => {
                const saved = discountsByStudent.get(student.realId);

                return (
                  <TableRow key={student.realId} hover>
                    <TableCell sx={{ fontSize: 14 }}>{student.name}</TableCell>
                    <TableCell>
                      <Typography fontSize={14} color="#42a5f5">{formatPhone(student.phone)}</Typography>
                    </TableCell>
                    <TableCell sx={{ minWidth: 220 }}>
                      {saved ? (
                        <Stack spacing={0.5} alignItems="flex-start">
                          <Stack direction="row" spacing={0.5} alignItems="flex-start">
                            <Button
                              variant="contained"
                              size="small"
                              onClick={() => void startEdit(student, saved)}
                              sx={{
                                minWidth: 30,
                                px: 1,
                                py: 0.25,
                                color: "text.primary",
                                bgcolor: "#eeeeee",
                                boxShadow: "none",
                                "&:hover": { bgcolor: "#e0e0e0", boxShadow: "none" },
                              }}
                            >
                              {saved.value}{saved.type === "PERCENTAGE" ? "%" : ""}
                            </Button>
                            <IconButton
                              size="small"
                              aria-label={t("singleGroup.tabs.discountPrices.delete")}
                              onClick={() => void handleDelete(saved)}
                              sx={{ mt: -1, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}
                            >
                              <MdClose size={14} />
                            </IconButton>
                          </Stack>
                          <Typography fontSize={12} color="text.secondary">
                            {formatDate(saved.startDate)}—{formatDate(saved.endDate)}
                          </Typography>
                        </Stack>
                      ) : (
                        <Button
                          variant="contained"
                          size="small"
                          disabled={loadingEditId === student.realId}
                          onClick={() => void startEdit(student)}
                          sx={{ textTransform: "none", fontSize: 13, fontWeight: 500, borderRadius: 999, px: 2, bgcolor: "#26a64a", boxShadow: "none", "&:hover": { bgcolor: "#218c3f", boxShadow: "none" } }}
                        >
                          {loadingEditId === student.realId ? <CircularProgress size={16} color="inherit" /> : t("singleGroup.tabs.discountPrices.editDiscount")}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell sx={{ minWidth: 160 }}>
                      {saved?.reason ? <Typography fontSize={14} color="text.secondary">{saved.reason}</Typography> : null}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={Boolean(editingStudent && draft)}
        onClose={cancelEdit}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 1, p: 1.5 } }}
      >
        {editingStudent && draft && (
          <>
            <DialogContent sx={{ pt: 2, px: 2 }}>
              <Stack spacing={1.5}>
                <Box>
                  <Typography color="text.secondary">
                    {t("singleGroup.tabs.discountPrices.price")}: SUM {formatMoney(groupPrice)}
                  </Typography>
                  <Typography color="text.secondary">
                    {t("singleGroup.tabs.discountPrices.discounts")}: SUM {formatMoney(0)}
                  </Typography>
                  <Typography color="text.secondary">
                    {t("singleGroup.tabs.discountPrices.individualDiscount")}:{" "}
                    {draft.type === "PERCENTAGE" ? `${draft.value || "0"}%` : `SUM ${formatMoney(Number(draft.value) || 0)}`}
                  </Typography>
                </Box>

                <Box>
                  <Typography fontSize={14} mb={0.75}>
                    {t("singleGroup.tabs.discountPrices.sum")} <Box component="span" color="error.main">*</Box>
                  </Typography>
                  <TextField
                    fullWidth
                    type="number"
                    value={draft.value}
                    onChange={(event) => setDraft({ ...draft, value: event.target.value })}
                    inputProps={{ min: 0, ...(draft.type === "PERCENTAGE" ? { max: 100, step: 0.1 } : { step: 1000 }) }}
                  />
                </Box>

                <Box>
                  <Typography fontSize={14} mb={0.75}>{t("singleGroup.tabs.discountPrices.startDate")}</Typography>
                  <TextField
                    fullWidth
                    type="date"
                    value={draft.startDate}
                    onChange={(event) => setDraft({ ...draft, startDate: event.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>

                <Box>
                  <Typography fontSize={14} mb={0.75}>{t("singleGroup.tabs.discountPrices.endDate")}</Typography>
                  <TextField
                    fullWidth
                    type="date"
                    value={draft.endDate}
                    onChange={(event) => setDraft({ ...draft, endDate: event.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>

                <Box>
                  <Typography fontSize={14} mb={0.75}>{t("singleGroup.tabs.discountPrices.cause")}</Typography>
                  <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    value={draft.reason}
                    onChange={(event) => setDraft({ ...draft, reason: event.target.value })}
                  />
                </Box>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 2, pb: 2, justifyContent: "flex-start", gap: 1 }}>
              <Button
                variant="contained"
                disabled={isCreating || isUpdating}
                onClick={() => void saveDiscount(editingStudent, discountsByStudent.get(editingStudent.realId))}
                sx={{ textTransform: "none", borderRadius: 999, px: 2.5 }}
              >
                {isCreating || isUpdating ? <CircularProgress size={20} color="inherit" /> : t("singleGroup.tabs.discountPrices.submit")}
              </Button>
              <Button disabled={isCreating || isUpdating} onClick={cancelEdit} sx={{ textTransform: "none" }}>
                {t("singleGroup.tabs.discountPrices.cancel")}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};
