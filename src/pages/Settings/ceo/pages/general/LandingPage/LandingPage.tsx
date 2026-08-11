import { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  // FormControl,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { useTranslation } from "react-i18next";

interface LandingPageItem {
  id: number;
  name: string;
  slug: string;
}

interface FormState {
  name: string;
  slug: string;
  branch: string;
  section: string;
  source: string;
}

const defaultForm: FormState = {
  name: "",
  slug: "",
  branch: "",
  section: "",
  source: "",
};

const branches = ["branch1", "branch2", "branch3"];
const sections = ["section1", "section2", "section3"];
const sources = ["source1", "source2", "source3"];

const LandingPage = () => {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState>(defaultForm);
  const [rows, setRows] = useState<LandingPageItem[]>([]);
  const [errors, setErrors] = useState<{ name?: string; slug?: string }>({});

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field as "name" | "slug"]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = () => {
    const newErrors: { name?: string; slug?: string } = {};
    if (!form.name.trim()) newErrors.name = t("settings.ceo.general.landingPage.errors.nameRequired");
    if (!form.slug.trim()) newErrors.slug = t("settings.ceo.general.landingPage.errors.slugRequired");
    return newErrors;
  };

  const handleCreate = () => {
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setRows((prev) => [
      ...prev,
      { id: Date.now(), name: form.name, slug: form.slug },
    ]);
    setForm(defaultForm);
    setErrors({});
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: "auto" }}>
      <Typography variant="h5" fontWeight={500} mb={2.5}>
        {t("settings.ceo.general.landingPage.title")}
      </Typography>

      {/* Form card */}
      <Paper
        variant="outlined"
        sx={{ maxWidth: 750, position: "relative", pt: 2.5, pb: 3, px: 2.5, mb: 3 }}
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
          {t("settings.ceo.general.landingPage.createTitle")}
        </Typography>

        {/* Name */}
        <Box mb={2}>
          <Typography fontSize={13} mb={0.5}>
            {t("settings.ceo.general.landingPage.name")}
          </Typography>
          <TextField
            fullWidth
            size="small"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            error={!!errors.name}
            helperText={errors.name}
            sx={{ "& .MuiOutlinedInput-root": { bgcolor: "#fff" } }}
          />
        </Box>

        {/* Slug */}
        <Box mb={2}>
          <Typography fontSize={13} mb={0.5}>
            {t("settings.ceo.general.landingPage.slug")}
          </Typography>
          <TextField
            fullWidth
            size="small"
            value={form.slug}
            onChange={(e) => handleChange("slug", e.target.value)}
            error={!!errors.slug}
            helperText={errors.slug}
            sx={{ "& .MuiOutlinedInput-root": { bgcolor: "#fff" } }}
          />
        </Box>

        {/* Branch */}
        <Box mb={2}>
          <Typography fontSize={13} mb={0.5}>
            {t("settings.ceo.general.landingPage.branch")}
          </Typography>
          <Select
            fullWidth
            size="small"
            displayEmpty
            value={form.branch}
            onChange={(e) => handleChange("branch", e.target.value)}
            sx={{ bgcolor: "#fff", fontSize: 14 }}
          >
            <MenuItem value="">
              <em style={{ color: "#aaa", fontStyle: "normal" }}></em>
            </MenuItem>
            {branches.map((b) => (
              <MenuItem key={b} value={b} sx={{ fontSize: 14 }}>
                {t(`settings.ceo.general.landingPage.branches.${b}`)}
              </MenuItem>
            ))}
          </Select>
        </Box>

        {/* Section */}
        <Box mb={2}>
          <Typography fontSize={13} mb={0.5}>
            {t("settings.ceo.general.landingPage.section")}
          </Typography>
          <Select
            fullWidth
            size="small"
            displayEmpty
            value={form.section}
            onChange={(e) => handleChange("section", e.target.value)}
            sx={{ bgcolor: "#f5f6fa", fontSize: 14 }}
          >
            <MenuItem value=""></MenuItem>
            {sections.map((s) => (
              <MenuItem key={s} value={s} sx={{ fontSize: 14 }}>
                {t(`settings.ceo.general.landingPage.sections.${s}`)}
              </MenuItem>
            ))}
          </Select>
        </Box>

        {/* Source */}
        <Box mb={3}>
          <Typography fontSize={13} mb={0.5}>
            {t("settings.ceo.general.landingPage.source")}
          </Typography>
          <Select
            fullWidth
            size="small"
            displayEmpty
            value={form.source}
            onChange={(e) => handleChange("source", e.target.value)}
            sx={{ bgcolor: "#f5f6fa", fontSize: 14 }}
          >
            <MenuItem value=""></MenuItem>
            {sources.map((s) => (
              <MenuItem key={s} value={s} sx={{ fontSize: 14 }}>
                {t(`settings.ceo.general.landingPage.sources.${s}`)}
              </MenuItem>
            ))}
          </Select>
        </Box>

        {/* Create button */}
        <Button
          variant="contained"
          onClick={handleCreate}
          sx={{
            textTransform: "none",
            bgcolor: "#4db6c8",
            borderRadius: 5,
            px: 3,
            fontWeight: 500,
            "&:hover": { bgcolor: "#3aa3b5" },
          }}
        >
          {t("settings.ceo.general.landingPage.create")}
        </Button>
      </Paper>

      {/* Table */}
      <TableContainer component={Paper} variant="outlined" sx={{ maxWidth: "100%" }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "#fafafa" }}>
              <TableCell sx={{ fontWeight: 600, fontSize: 13, width: "35%" }}>
                {t("settings.ceo.general.landingPage.table.name")}
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: 13, width: "50%" }}>
                {t("settings.ceo.general.landingPage.table.slug")}
              </TableCell>
              <TableCell
                align="right"
                sx={{ fontWeight: 600, fontSize: 13, width: "15%" }}
              >
                {t("settings.ceo.general.landingPage.table.actions")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ py: 4, color: "#999", fontSize: 13 }}>
                  {t("settings.ceo.general.landingPage.table.noData")}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ fontSize: 13 }}>{row.name}</TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{row.slug}</TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      color="error"
                      sx={{ textTransform: "none", fontSize: 12 }}
                      onClick={() =>
                        setRows((prev) => prev.filter((r) => r.id !== row.id))
                      }
                    >
                      {t("settings.ceo.general.landingPage.table.delete")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default LandingPage;