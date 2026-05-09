import { useState } from "react";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  TextField,
  Button,
  Stack,
  RadioGroup,
  FormControlLabel,
  Radio,
} from "@mui/material";
import { IoClose } from "react-icons/io5";

interface AddStudentDrawerProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; phone: string; dob: string; gender: string; comment: string }) => void;
}

export const AddStudentDrawer = ({ open, onClose, onSubmit }: AddStudentDrawerProps) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("male");
  const [comment, setComment] = useState("");

  const handleSubmit = () => {
    onSubmit({ name, phone: `+998 ${phone}`, dob, gender, comment });

    // reset
    setName("");
    setPhone("");
    setDob("");
    setGender("male");
    setComment("");

    onClose();
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: 420, borderRadius: "16px 0 0 16px" },
      }}
    >
      {/* HEADER */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ px: 3, py: 2.5, borderBottom: "1px solid #eee" }}
      >
        <Typography fontWeight={700} fontSize={18}>
          Add New User
        </Typography>
        <IconButton onClick={onClose}>
          <IoClose />
        </IconButton>
      </Stack>

      {/* BODY */}
      <Box sx={{ p: 3 }}>
        {/* Phone */}
        <Typography fontSize={13} mb={1}>Phone</Typography>
        <Stack direction="row" gap={1} mb={2}>
          <Box sx={{ px: 2, py: 1, border: "1px solid #ddd", borderRadius: 2 }}>
            +998
          </Box>
          <TextField
            fullWidth
            size="small"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </Stack>

        {/* Name */}
        <Typography fontSize={13} mb={1}>Name</Typography>
        <TextField
          fullWidth
          size="small"
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ mb: 2 }}
        />

        {/* DOB */}
        <Typography fontSize={13} mb={1}>Date of birth</Typography>
        <TextField
          type="date"
          fullWidth
          size="small"
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          sx={{ mb: 2 }}
        />

        {/* Gender */}
        <Typography fontSize={13} mb={1}>Gender</Typography>
        <RadioGroup row value={gender} onChange={(e) => setGender(e.target.value)}>
          <FormControlLabel value="male" control={<Radio />} label="Male" />
          <FormControlLabel value="female" control={<Radio />} label="Female" />
        </RadioGroup>

        {/* Comment */}
        <Typography fontSize={13} mt={2} mb={1}>Comment</Typography>
        <TextField
          fullWidth
          multiline
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />

        {/* Submit */}
        <Button
          fullWidth
          variant="contained"
          onClick={handleSubmit}
          sx={{
            mt: 3,
            py: 1.2,
            bgcolor: "#5c7fa3",
            borderRadius: "10px",
          }}
        >
          Submit
        </Button>
      </Box>
    </Drawer>
  );
};