import { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Drawer,
  TextField,
  IconButton,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { MdClose, MdOutlineEdit, MdDeleteOutline } from "react-icons/md";

interface Room {
  id: number;
  name: string;
  capacity: number | null;
}

const initialRooms: Room[] = [
  { id: 16752, name: "1-Xona", capacity: null },
  { id: 16753, name: "2-xona", capacity: null },
  { id: 16754, name: "3-xona", capacity: null },
  { id: 16755, name: "4-xona", capacity: null },
  { id: 16756, name: "5-xona", capacity: null },
  { id: 22194, name: "6-xona", capacity: 30 },
  { id: 22202, name: "7- xona", capacity: 30 },
  { id: 22203, name: "8-xona", capacity: 30 },
  { id: 22204, name: "9 -xona", capacity: 30 },
  { id: 23290, name: "10", capacity: 60 },
];

interface FormState {
  name: string;
  capacity: string;
}

const defaultForm: FormState = { name: "", capacity: "" };

export const Rooms = () => {
  const [rooms, setRooms] = useState<Room[]>(initialRooms);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm);

  const openAddDrawer = () => {
    setEditingRoom(null);
    setForm(defaultForm);
    setDrawerOpen(true);
  };

  const openEditDrawer = (room: Room) => {
    setEditingRoom(room);
    setForm({ name: room.name, capacity: room.capacity !== null ? String(room.capacity) : "" });
    setDrawerOpen(true);
  };

  const handleDelete = (id: number) => {
    setRooms((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    const capacity = form.capacity.trim() ? parseInt(form.capacity) : null;

    if (editingRoom) {
      setRooms((prev) =>
        prev.map((r) => r.id === editingRoom.id ? { ...r, name: form.name, capacity } : r)
      );
    } else {
      const newRoom: Room = {
        id: Date.now(),
        name: form.name,
        capacity,
      };
      setRooms((prev) => [...prev, newRoom]);
    }
    setForm(defaultForm);
    setDrawerOpen(false);
  };

  return (
    <Box sx={{ p: 3, bgcolor: "#f5f5f5", minHeight: "100vh" }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5" fontWeight={400}>
          Rooms
        </Typography>
        <Button
          variant="contained"
          onClick={openAddDrawer}
          sx={{
            bgcolor: "#1a3f6f",
            borderRadius: 5,
            px: 3,
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: 1,
            "&:hover": { bgcolor: "#15345c" },
          }}
        >
          ADD NEW
        </Button>
      </Box>

      {/* Table */}
      <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: "#fafafa" }}>
              <TableCell sx={{ fontWeight: 600, fontSize: 13, color: "#333", width: "20%" }}>id</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: 13, color: "#333", width: "40%" }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: 13, color: "#333", width: "25%" }}>Room capacity</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, fontSize: 13, color: "#333", width: "15%" }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rooms.map((room) => (
              <TableRow key={room.id} sx={{ "&:hover": { bgcolor: "#fafafa" } }}>
                <TableCell sx={{ fontSize: 13, color: "#555" }}>{room.id}</TableCell>
                <TableCell sx={{ fontSize: 14 }}>{room.name}</TableCell>
                <TableCell sx={{ fontSize: 13, color: "#555" }}>
                  {room.capacity !== null ? room.capacity : ""}
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5 }}>
                    <IconButton size="small" onClick={() => openEditDrawer(room)} sx={{ color: "#555" }}>
                      <MdOutlineEdit size={18} />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(room.id)} sx={{ color: "#e53935" }}>
                      <MdDeleteOutline size={18} />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: 380, p: 0 } }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 3, py: 2.5 }}>
          <Typography fontWeight={600} fontSize={17}>
            {editingRoom ? "Edit room" : "Add new room"}
          </Typography>
          <IconButton size="small" onClick={() => setDrawerOpen(false)}>
            <MdClose size={20} />
          </IconButton>
        </Box>
        <Divider />

        <Box sx={{ px: 3, py: 3 }}>
          <Box mb={2.5}>
            <Typography fontSize={13} mb={0.8}>Name</Typography>
            <TextField
              fullWidth
              size="small"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              sx={{ "& .MuiOutlinedInput-root": { bgcolor: "#fff" } }}
            />
          </Box>

          <Box mb={3}>
            <Typography fontSize={13} mb={0.8}>Room capacity</Typography>
            <TextField
              fullWidth
              size="small"
              type="number"
              value={form.capacity}
              onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))}
              inputProps={{ min: 0 }}
              sx={{ "& .MuiOutlinedInput-root": { bgcolor: "#fff" } }}
            />
          </Box>

          <Button
            variant="contained"
            onClick={handleSubmit}
            sx={{
              bgcolor: "#5b7fa6",
              borderRadius: 5,
              px: 3,
              textTransform: "none",
              fontWeight: 600,
              fontSize: 15,
              "&:hover": { bgcolor: "#4a6d92" },
            }}
          >
            Submit
          </Button>
        </Box>
      </Drawer>
    </Box>
  );
};