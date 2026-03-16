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

const COURSES = ["Math", "English", "Physics", "Chemistry"];
const TEACHERS = ["John Doe", "Jane Smith", "Michael Brown", "Emily Johnson"];
const ROOMS = ["101", "102", "103", "104"];


export const Groups = () => {
  const [groups, setGroups] = useState(initialGroups);
  const [searchValue, setSearchValue] = useState("");
  const [open, setOpen] = useState(false);

  // New group form state
  const [form, setForm] = useState({
    name: "",
    course: "",
    teacher: "",
    days: "",
    room: "",
    students: 0,
  });

  // Filtered groups
  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(searchValue.toLowerCase())
  );

  // Handlers
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: name === "students" ? Number(value) : value });
  };

  const handleAddGroup = () => {
    const newGroup = { ...form, id: groups.length + 1 };
    setGroups([...groups, newGroup]);
    setForm({ name: "", course: "", teacher: "", days: "", room: "", students: 0 });
    setOpen(false);
  };

  return (
    <div className="pb-10">
      {/* Search + Add Button */}
      <Stack direction="row" sx={{ mt:2 }} justifyContent="space-between">
        <Paper sx={{ p: "2px 4px", display: "flex", alignItems: "center", width: 400 , mb:2}}>
          <InputBase
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            sx={{ ml: 1, flex: 1, boxShadow: "none", }}
            placeholder="Search Group"
          />
          <IconButton type="button" sx={{ p: "10px" }} aria-label="search">
            <IoSearchOutline size={20} />
          </IconButton>
        </Paper>
        <Button
          startIcon={<GoPlus />}
          variant="contained"
          color="primary"
          sx={{ boxShadow: "none", textTransform: "none", mr:2 , mb:2 }}
          onClick={handleOpen}
        >
          Add New Group
        </Button>
      </Stack>

      {/* Table */}
      <TableContainer sx={{ borderRadius: "8px", border: "1px solid #ccc" }}>
        <Table sx={{ minWidth: 650, bgcolor: "#fff" }}>
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>Group Name</TableCell>
              <TableCell>Course</TableCell>
              <TableCell>Teacher</TableCell>
              <TableCell>Days</TableCell>
              <TableCell>Room</TableCell>
              <TableCell align="center">Students</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredGroups.map((g, index) => (
              <TableRow key={g.id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{g.name}</TableCell>
                <TableCell>{g.course}</TableCell>
                <TableCell>{g.teacher}</TableCell>
                <TableCell>{g.days}</TableCell>
                <TableCell>{g.room}</TableCell>
                <TableCell align="center">{g.students}</TableCell>
              </TableRow>
            ))}
            {filteredGroups.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No data available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add Group Modal */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Group</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Group Name"
              name="name"
              value={form.name}
              onChange={handleChange}
              fullWidth
            />
            <TextField
              label="Course"
              name="course"
              value={form.course}
              onChange={handleChange}
              select
              fullWidth
            >
              {COURSES.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Teacher"
              name="teacher"
              value={form.teacher}
              onChange={handleChange}
              select
              fullWidth
            >
              {TEACHERS.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Days"
              name="days"
              value={form.days}
              onChange={handleChange}
              placeholder="Mon, Wed, Fri"
              fullWidth
            />
            <TextField
              label="Room"
              name="room"
              value={form.room}
              onChange={handleChange}
              select
              fullWidth
            >
              {ROOMS.map((r) => (
                <MenuItem key={r} value={r}>
                  {r}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Students"
              name="students"
              type="number"
              value={form.students}
              onChange={handleChange}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="contained" onClick={handleAddGroup}>
            Add Group
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};