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

const branches = ["Branch 1", "Branch 2", "Branch 3"];
const sections = ["Section 1", "Section 2", "Section 3"];
const sources = ["Source 1", "Source 2", "Source 3"];

const LandingPage = () => {
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
    if (!form.name.trim()) newErrors.name = "Name is required";
    if (!form.slug.trim()) newErrors.slug = "Slug is required";
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
        Landing page
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
          Create a landing page
        </Typography>

        {/* Name */}
        <Box mb={2}>
          <Typography fontSize={13} mb={0.5}>
            *Name
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
            *Slug
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
            Branch
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
                {b}
              </MenuItem>
            ))}
          </Select>
        </Box>

        {/* Section */}
        <Box mb={2}>
          <Typography fontSize={13} mb={0.5}>
            Section
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
                {s}
              </MenuItem>
            ))}
          </Select>
        </Box>

        {/* Source */}
        <Box mb={3}>
          <Typography fontSize={13} mb={0.5}>
            Source
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
                {s}
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
          Create
        </Button>
      </Paper>

      {/* Table */}
      <TableContainer component={Paper} variant="outlined" sx={{ maxWidth: "100%" }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "#fafafa" }}>
              <TableCell sx={{ fontWeight: 600, fontSize: 13, width: "35%" }}>
                Name
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: 13, width: "50%" }}>
                Slug
              </TableCell>
              <TableCell
                align="right"
                sx={{ fontWeight: 600, fontSize: 13, width: "15%" }}
              >
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ py: 4, color: "#999", fontSize: 13 }}>
                  No Data
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
                      Delete
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