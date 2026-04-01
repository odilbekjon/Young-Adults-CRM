import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputBase,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  MenuItem,
} from "@mui/material";
import { IoSearchOutline } from "react-icons/io5";
import { GoPlus } from "react-icons/go";
import { useState } from "react";
import { initialGroups } from "../../constants/Groups";

/* ================= TYPES ================= */

type StatusType = "Active" | "Archive" | "Completed";

interface Group {
  id: number;
  name: string;
  course: string;
  teacher: string;
  days: string;
  room: string;
  students: number;
  status?: StatusType;
  startDate: string;
  endDate: string;
}

interface Filters {
  status: StatusType | "";
  teacher: string;
  course: string;
  days: string;
  startDate: string;
  endDate: string;
}

/* ================= STATIC ================= */

const COURSES = ["Math", "English", "Physics", "Chemistry"];
const TEACHERS = ["John Doe", "Jane Smith", "Michael Brown", "Emily Johnson"];
const ROOMS = ["101", "102", "103", "104"];

/* ================= COMPONENT ================= */

export const Groups = () => {
  const [groups, setGroups] = useState<Group[]>(initialGroups);
  const [searchValue, setSearchValue] = useState("");
  const [open, setOpen] = useState(false);

  const [filters, setFilters] = useState<Filters>({
    status: "",
    teacher: "",
    course: "",
    days: "",
    startDate: "",
    endDate: "",
  });

  const [form, setForm] = useState<Group>({
    id: 0,
    name: "",
    course: "",
    teacher: "",
    days: "",
    room: "",
    students: 0,
    status: "Active",
    startDate: "",
    endDate: "",
  });

  /* ================= FILTER ================= */

  const handleFilterChange = <K extends keyof Filters>(
    key: K,
    value: Filters[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const filteredGroups = groups.filter((g) => {
    return (
      g.name.toLowerCase().includes(searchValue.toLowerCase()) &&
      (!filters.status || g.status === filters.status) &&
      (!filters.teacher || g.teacher === filters.teacher) &&
      (!filters.course || g.course === filters.course) &&
      (!filters.days || g.days === filters.days) &&
      (!filters.startDate || g.startDate >= filters.startDate) &&
      (!filters.endDate || g.endDate <= filters.endDate)
    );
  });

  /* ================= HANDLERS ================= */

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: name === "students" ? Number(value) : value,
    }));
  };

  const handleAddGroup = () => {
    setGroups((prev) => [
      ...prev,
      { ...form, id: prev.length + 1 },
    ]);

    setOpen(false);
  };

  /* ================= UI ================= */

  return (
    <div className="pb-10">

      {/* FILTER BAR */}
      <Paper
        sx={{
          p: 2,
          mb: 2,
          borderRadius: 3,
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          alignItems: "center",
        }}
      >
        <TextField
          select
          size="small"
          label="Status"
          value={filters.status}
          onChange={(e) =>
            handleFilterChange("status", e.target.value as StatusType | "")
          }
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="Active">🟢 Active</MenuItem>
          <MenuItem value="Archive">🔴 Archive</MenuItem>
          <MenuItem value="Completed">🔵 Completed</MenuItem>
        </TextField>

        <TextField
          select
          size="small"
          label="Teacher"
          value={filters.teacher}
          onChange={(e) => handleFilterChange("teacher", e.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All</MenuItem>
          {TEACHERS.map((t) => (
            <MenuItem key={t} value={t}>{t}</MenuItem>
          ))}
        </TextField>

        <TextField
          select
          size="small"
          label="Course"
          value={filters.course}
          onChange={(e) => handleFilterChange("course", e.target.value)}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="">All</MenuItem>
          {COURSES.map((c) => (
            <MenuItem key={c} value={c}>{c}</MenuItem>
          ))}
        </TextField>

        <TextField
          select
          size="small"
          label="Days"
          value={filters.days}
          onChange={(e) => handleFilterChange("days", e.target.value)}
          sx={{ minWidth: 130 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="Odd">Odd</MenuItem>
          <MenuItem value="Even">Even</MenuItem>
        </TextField>

        <TextField
          type="date"
          size="small"
          value={filters.startDate}
          onChange={(e) => handleFilterChange("startDate", e.target.value)}
        />

        <TextField
          type="date"
          size="small"
          value={filters.endDate}
          onChange={(e) => handleFilterChange("endDate", e.target.value)}
        />

        <Button
          variant="outlined"
          onClick={() =>
            setFilters({
              status: "",
              teacher: "",
              course: "",
              days: "",
              startDate: "",
              endDate: "",
            })
          }
        >
          Reset
        </Button>
      </Paper>

      {/* SEARCH + ADD */}
      <Stack direction="row" justifyContent="space-between" mb={2}>
        <Paper sx={{ display: "flex", alignItems: "center", width: 300 }}>
          <InputBase
            placeholder="Search group..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            sx={{ ml: 1, flex: 1 }}
          />
          <IconButton>
            <IoSearchOutline />
          </IconButton>
        </Paper>

        <Button
          startIcon={<GoPlus />}
          variant="contained"
          onClick={() => setOpen(true)}
        >
          Add Group
        </Button>
      </Stack>

      {/* TABLE */}
      <TableContainer sx={{ borderRadius: 2, border: "1px solid #eee" }}>
        <Table>
          <TableHead sx={{ background: "#fafafa" }}>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Course</TableCell>
              <TableCell>Teacher</TableCell>
              <TableCell>Days</TableCell>
              <TableCell>Dates</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Room</TableCell>
              <TableCell>Students</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredGroups.map((g, i) => (
              <TableRow key={g.id} hover>
                <TableCell>{i + 1}</TableCell>
                <TableCell>{g.name}</TableCell>
                <TableCell>{g.course}</TableCell>
                <TableCell>{g.teacher}</TableCell>
                <TableCell>{g.days}</TableCell>
                <TableCell>
                  {g.startDate} <br /> {g.endDate}
                </TableCell>

                {/* STATUS BADGE */}
                <TableCell>
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 500,
                      color:
                        g.status === "Active"
                          ? "#2e7d32"
                          : g.status === "Archive"
                          ? "#d32f2f"
                          : "#1976d2",
                      background:
                        g.status === "Active"
                          ? "#e8f5e9"
                          : g.status === "Archive"
                          ? "#ffebee"
                          : "#e3f2fd",
                    }}
                  >
                    {g.status}
                  </span>
                </TableCell>

                <TableCell>{g.room}</TableCell>
                <TableCell>{g.students}</TableCell>
              </TableRow>
            ))}

            {filteredGroups.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  No groups found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* MODAL */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth>
        <DialogTitle>Add Group</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField name="name" label="Name" onChange={handleChange} />

            <TextField select name="course" label="Course" onChange={handleChange}>
              {COURSES.map((c) => (
                <MenuItem key={c} value={c}>{c}</MenuItem>
              ))}
            </TextField>

            <TextField select name="teacher" label="Teacher" onChange={handleChange}>
              {TEACHERS.map((t) => (
                <MenuItem key={t} value={t}>{t}</MenuItem>
              ))}
            </TextField>

            <TextField name="days" label="Days" onChange={handleChange} />

            <TextField type="date" name="startDate" onChange={handleChange} />
            <TextField type="date" name="endDate" onChange={handleChange} />

            <TextField select name="room" label="Room" onChange={handleChange}>
              {ROOMS.map((r) => (
                <MenuItem key={r} value={r}>{r}</MenuItem>
              ))}
            </TextField>

            <TextField name="students" type="number" label="Students" onChange={handleChange} />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddGroup}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};