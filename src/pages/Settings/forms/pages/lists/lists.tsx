import {
  Box,
  Button,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { FiEdit2 } from "react-icons/fi";
import { RiDeleteBin6Line } from "react-icons/ri";
import { HiOutlineLink } from "react-icons/hi";
import { MdAdd } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useAllLeadFormsQuery, useDeleteLeadFormMutation } from "../../../../../app/api/leadFormsApi";
import { useToast } from "../../../../../Context/ToastContext";

export const Lists = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();

  const { data: formsData, isLoading, isError } = useAllLeadFormsQuery();
  const [deleteLeadForm, { isLoading: isDeleting }] = useDeleteLeadFormMutation();

  const forms = formsData?.data ?? [];

  const handleDelete = async (id: string) => {
    try {
      await deleteLeadForm(id).unwrap();
      toast.success(t("settings.forms.lists.toast.deleted"));
    } catch {
      toast.error(t("settings.forms.lists.toast.error"));
    }
  };

  return (
    <Box
      sx={{
        backgroundColor: "#f0f2f5",
        p: 3,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 780,
          borderRadius: 4,
          p: 4,
          backgroundColor: "#ffffff",
          boxShadow: "0 2px 24px rgba(0,0,0,0.07)",
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 3,
          }}
        >
          <Typography
            variant="h5"
            sx={{
              fontWeight: 600,
              color: "#1a1a2e",
              letterSpacing: "-0.3px",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {t("settings.forms.lists.title")}
          </Typography>

          <Button
            variant="contained"
            startIcon={<MdAdd size={18} />}
            onClick={() => navigate("/settings/forms/create")}
            sx={{
              backgroundColor: "#1a4d6e",
              borderRadius: "50px",
              px: 3,
              py: 1.2,
              textTransform: "none",
              fontWeight: 600,
              fontSize: "0.9rem",
              fontFamily: "'DM Sans', sans-serif",
              boxShadow: "none",
              "&:hover": {
                backgroundColor: "#163d58",
                boxShadow: "none",
              },
            }}
          >
            {t("settings.forms.lists.actions.addNew")}
          </Button>
        </Box>

        {/* Divider */}
        <Box sx={{ borderBottom: "1px solid #e8eaed", mb: 1 }} />

        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>
        ) : isError ? (
          <Typography sx={{ color: "#e53935", fontSize: 14, textAlign: "center", py: 4 }}>
            {t("settings.forms.lists.loadError")}
          </Typography>
        ) : forms.length === 0 ? (
          <Typography sx={{ color: "#9ca3af", fontSize: 14, textAlign: "center", py: 4 }}>
            {t("settings.forms.lists.emptyState")}
          </Typography>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      color: "#1a1a2e",
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "0.875rem",
                      border: "none",
                      pb: 1,
                    }}
                  >
                    {t("settings.forms.lists.table.name")}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontWeight: 700,
                      color: "#1a1a2e",
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "0.875rem",
                      border: "none",
                      pb: 1,
                      width: 150,
                    }}
                  >
                    {t("settings.forms.lists.table.actions")}
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {forms.map((form, index) => (
                  <TableRow
                    key={form.id}
                    sx={{
                      backgroundColor: index % 2 === 0 ? "#ffffff" : "#f7f8fa",
                      "&:last-child td": { border: "none" },
                      "& td": {
                        border: "none",
                        py: 1.8,
                      },
                      borderRadius: 2,
                    }}
                  >
                    <TableCell
                      sx={{
                        color: "#1a1a2e",
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: "0.9rem",
                        fontWeight: 400,
                      }}
                    >
                      {form.name}
                    </TableCell>

                    <TableCell align="right">
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          gap: 0.5,
                        }}
                      >
                        <Tooltip title={t("settings.forms.lists.tooltips.edit")}>
                          <IconButton
                            onClick={() => navigate(`/settings/forms/edit/${form.id}`)}
                            size="small"
                            sx={{
                              color: "#64b5f6",
                              "&:hover": { backgroundColor: "#e3f2fd" },
                            }}
                          >
                            <FiEdit2 size={17} />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title={t("settings.forms.lists.tooltips.delete")}>
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(form.id)}
                            disabled={isDeleting}
                            sx={{
                              color: "#ef5350",
                              "&:hover": { backgroundColor: "#ffebee" },
                            }}
                          >
                            <RiDeleteBin6Line size={18} />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title={t("settings.forms.lists.tooltips.copyLink")}>
                          <IconButton
                            size="small"
                            sx={{
                              color: "#ffb300",
                              "&:hover": { backgroundColor: "#fff8e1" },
                            }}
                          >
                            <HiOutlineLink size={19} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};
