import {
  Button,
  
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
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
  Menu,
  MenuItem,
  Radio,
  RadioGroup,
  FormControl,
  FormLabel,
} from "@mui/material";
import { IoSearchOutline } from "react-icons/io5";
import { GoPlus } from "react-icons/go";
import { BsThreeDotsVertical } from "react-icons/bs";
import { useState } from "react";
import { Teachers as initialTeachers } from "../../constants";

// Branch options
// const BRANCHES = ["Branch A", "Branch B", "Branch C"];

export const Teachers = () => {
  const [searchValue, setSearchValue] = useState("");
  const [open, setOpen] = useState(false);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(
    null
  );
  const openMenu = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>, id: number) => {
    setAnchorEl(event.currentTarget);
    setSelectedTeacherId(id);
  };
  const handleCloseMenu = () => setAnchorEl(null);

  interface Teacher {
  id: number;
  fullName: string;
  phone: string;
  telegram?: string;
  percent?: string;
  avatar?: string;
  branches?: string[];
  groups?: number;
  dob?: string;
  gender?: string;
}

const [teachers, setTeachers] = useState<Teacher[]>(initialTeachers);

  const [form, setForm] = useState({
    fullName: "",
    telegram: "",
    phone: "",
    password: "",
    percent: "",
    avatar: "",
    branches: [] as string[],
    dob: "",
    gender: "",
  });

  const filteredTeachers = teachers.filter((t) =>
    t.fullName.toLowerCase().includes(searchValue.toLowerCase())
  );

  const handleEdit = () => {
    const teacher = teachers.find((t) => t.id === selectedTeacherId) || null;
      if (teacher) {
        setForm({
          fullName: teacher.fullName,
          telegram: teacher.telegram || "",
          phone: teacher.phone,
          password: "",
          percent: teacher.percent || "",
          avatar: teacher.avatar || "",
          branches: teacher.branches || [],
          dob: teacher.dob || "",
          gender: teacher.gender || "",
        });
        setOpen(true);
      }
      handleCloseMenu();
  };

  const handleDelete = () => {
    setTeachers((prev) => prev.filter((t) => t.id !== selectedTeacherId));
    handleCloseMenu();
  };
  


  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type, checked, files } = target;

    if (name === "branches") {
      let updatedBranches = [...form.branches];
      if (checked) updatedBranches.push(value);
      else updatedBranches = updatedBranches.filter((b) => b !== value);
      setForm({ ...form, branches: updatedBranches });
    } else if (type === "file") {
      const file = files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          setForm({ ...form, avatar: reader.result as string });
        };
        reader.readAsDataURL(file);
      }
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleAddTeacher = () => {
    if (selectedTeacherId) {
      // Edit teacher
      setTeachers((prev) =>
        prev.map((t) =>
          t.id === selectedTeacherId
            ? { ...t, ...form, groups: t.groups || 0 }
            : t
        )
      );
    } else {
      // Add new
      const newTeacher = {
        id: teachers.length + 1,
        fullName: form.fullName,
        telegram: form.telegram,
        phone: form.phone,
        groups: 0,
        percent: form.percent,
        branches: form.branches,
        dob: form.dob,
        gender: form.gender,
      };
      setTeachers([...teachers, newTeacher]);
    }
    setForm({
      fullName: "",
      telegram: "",
      phone: "",
      password: "",
      percent: "",
      avatar: "",
      branches: [],
      dob: "",
      gender: "",
    });
    setOpen(false);
    setSelectedTeacherId(null);
  };

  return (
    <div className="mt-4">
      {/* Search + Add Button */}
      <Stack direction="row" sx={{ pb: 4 }} justifyContent="space-between">
        <Paper
          sx={{
            p: "2px 4px",
            display: "flex",
            alignItems: "center",
            width: 400,
          }}
        >
          <InputBase
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            sx={{ ml: 1, flex: 1, boxShadow: "none" }}
            placeholder="Search Teacher"
          />
          <IconButton type="button" sx={{ p: "10px" }} aria-label="search">
            <IoSearchOutline size={20} />
          </IconButton>
        </Paper>
        <Button
          startIcon={<GoPlus />}
          variant="contained"
          color="primary"
          sx={{ boxShadow: "none", textTransform: "none", mr: 2 }}
          onClick={handleOpen}
        >
          Add new teacher
        </Button>
      </Stack>

      {/* Table */}
      <TableContainer sx={{ borderRadius: "8px", border: "1px solid #ccc" }}>
        <Table sx={{ minWidth: 650, bgcolor: "#fff" }}>
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>Full name</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell align="center">Groups</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredTeachers.map((t, index) => (
              <TableRow key={t.id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <span>{t.fullName}</span>
                  </Stack>
                </TableCell>
                <TableCell>{t.phone}</TableCell>
                <TableCell align="center">{t.groups}</TableCell>
                <TableCell align="center">
                  <div
                    onClick={(e) => handleClick(e, t.id)}
                    style={{ display: "flex", justifyContent: "center", cursor: "pointer" }}
                  >
                    <BsThreeDotsVertical />
                  </div>
                  <Menu
                    anchorEl={anchorEl}
                    open={openMenu}
                    onClose={handleCloseMenu}
                    anchorOrigin={{
                      vertical: "bottom",
                      horizontal: "center",
                    }}
                    transformOrigin={{
                      vertical: "top",
                      horizontal: "center",
                    }}
                  >
                    <MenuItem onClick={handleEdit}>✏️ Edit</MenuItem>
                    <MenuItem onClick={handleDelete}>🗑 Delete</MenuItem>
                  </Menu>
                </TableCell>
              </TableRow>
            ))}
            {filteredTeachers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No data available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Teacher Modal */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedTeacherId ? "Edit Teacher" : "Add New Teacher"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Phone"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              fullWidth
            />
            <TextField
              label="Name"
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              fullWidth
            />
            <TextField
              label="Date of Birth"
              name="dob"
              type="date"
              value={form.dob}
              onChange={handleChange}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <FormControl>
              <FormLabel>Gender</FormLabel>
              <RadioGroup
                row
                name="gender"
                value={form.gender}
                onChange={handleChange}
              >
                <FormControlLabel value="Male" control={<Radio />} label="Male" />
                <FormControlLabel value="Female" control={<Radio />} label="Female" />
              </RadioGroup>
            </FormControl>
           
            <Button
              variant="outlined"
              type="button"
              onClick={() => setForm({ ...form, password: "" })}
            >
              + Set password
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="contained" onClick={handleAddTeacher}>
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};