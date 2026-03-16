import React, { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Avatar,
  Chip,
  Select,
  FormControl,
  InputLabel,
  Menu,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { MdMoreVert } from "react-icons/md";
import { students as studentData } from "../../constants/Students";

export const Students = () => {
  const [students, setStudents] = useState(studentData);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedStudent, setSelectedStudent] = useState<typeof students[0] | null>(null);
  const [openDialog, setOpenDialog] = useState(false);

  // === Dropdown Actions ===
  const handleMenuClick = (
  event: React.MouseEvent<HTMLElement>,
  student: typeof students[0] // yoki sizning student tipingiz
) => {
  setAnchorEl(event.currentTarget );
  setSelectedStudent(student);
};

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedStudent(null);
  };

  const handleEdit = () => {
    alert(`Editing ${selectedStudent?.name}`);
    handleMenuClose();
  };

  const handleDelete = () => {
    setStudents((prev) => prev.filter((s) => s.id !== selectedStudent?.id));
    handleMenuClose();
  };

  // === Add new student modal ===
  const handleOpenDialog = () => setOpenDialog(true);
  const handleCloseDialog = () => setOpenDialog(false);

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#f5f7fb", p: 4 }}>
      {/* ===== HEADER ===== */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700}>
          Talabalar
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Young Adults o‘quv markazi talabalar ro‘yxati
        </Typography>
      </Box>

      {/* ===== FILTERS ===== */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <TextField placeholder="Search student" size="small" />
        <FormControl size="small">
          <InputLabel>Finance status</InputLabel>
          <Select defaultValue="">
            <MenuItem value="">All</MenuItem>
            <MenuItem value="paid">Paid</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small">
          <InputLabel>Teacher</InputLabel>
          <Select defaultValue="">
            <MenuItem value="">All</MenuItem>
            <MenuItem value="shamsiddin">Shamsiddin</MenuItem>
            <MenuItem value="umar">Umar</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small">
          <InputLabel>Course</InputLabel>
          <Select defaultValue="">
            <MenuItem value="">All</MenuItem>
            <MenuItem value="it_bootcamp">IT Bootcamp</MenuItem>
            <MenuItem value="it_english">IT English</MenuItem>
          </Select>
        </FormControl>
        <Button variant="outlined">Reset Filter</Button>
        <Button variant="contained" color="primary" onClick={handleOpenDialog}>
          + Add new student
        </Button>
      </Box>

      {/* ===== TABLE ===== */}
      <Box sx={{ overflowX: "auto" }}>
        <Table sx={{ border: "1px solid #ddd", borderRadius: 1 }}>
          <TableHead sx={{ backgroundColor: "#f0f0f0" }}>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>Full Names</TableCell>
              <TableCell>Phone Number</TableCell>
              <TableCell>Groups</TableCell>
              <TableCell>Courses</TableCell>
              <TableCell>Teachers</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {students.map((student, index) => (
              <TableRow
                key={student.id}
                sx={{ borderBottom: "1px solid #ddd" }}
              >
                <TableCell>{index + 1}</TableCell>
                <TableCell sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Avatar>
                    {student.name[0] + (student.name.split(" ")[1] ? student.name.split(" ")[1][0] : "")}
                  </Avatar>
                  {student.name}
                </TableCell>
                <TableCell>{student.phone}</TableCell>
                <TableCell>
                  {student.groups.map((g) => (
                    <Chip key={g} label={g} size="small" sx={{ mr: 0.5 }} />
                  ))}
                </TableCell>
                <TableCell>
                  {student.courses.map((c) => (
                    <Chip key={c} label={c} size="small" sx={{ mr: 0.5 }} />
                  ))}
                </TableCell>
                <TableCell>{student.teacher}</TableCell>
                <TableCell align="center">
                  <IconButton onClick={(e) => handleMenuClick(e, student)}>
                    <MdMoreVert />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      {/* ===== DROPDOWN MENU ===== */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>Edit</MenuItem>
        <MenuItem onClick={handleDelete}>Delete</MenuItem>
      </Menu>

      {/* ===== ADD STUDENT DIALOG ===== */}
      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>Add New Student</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Full Name" sx={{ mt: 2 }} />
          <TextField fullWidth label="Phone Number" sx={{ mt: 2 }} />
          {/* Qo‘shimcha form fields */}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" color="primary">
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===== PAGINATION ===== */}
      <Box sx={{ mt: 3, display: "flex", justifyContent: "space-between" }}>
        <Typography>1-6 of {students.length}</Typography>
        <Box>
          <Button>{"<"}</Button>
          <Button>{">"}</Button>
        </Box>
      </Box>
    </Box>
  );
};