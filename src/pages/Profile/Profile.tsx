import { useState } from "react";
import { Box, Typography, Button, Avatar, Chip, Modal, TextField } from "@mui/material";
import { MdEdit } from "react-icons/md";
import profileImage from "../../assets/profile.png"; // rasm yo'lini moslashtir

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  borderRadius: 2,
  boxShadow: 24,
  p: 4,
};

const ProfilePage = () => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "Andrew",
    surname: "Smith",
    jobTitle: "CEO",
    telegram: "@andrewsmiith",
    phone: "99 772-45-58",
  });

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
};

  const handleSubmit = () => {
    console.log("Updated Data:", formData);
    handleClose();
  };

  return (
    <Box
      sx={{
        minHeight: "80vh",
        display: "flex",
        alignItems: "center",
        p: 4,
      }}
    >
      <Box
        sx={{
          width: 380,
          bgcolor: "#fff",
          borderRadius: 3,
          boxShadow: 3,
          overflow: "hidden",
        }}
      >
        {/* ===== TOP SECTION ===== */}
        <Box
          sx={{
            bgcolor: "#aab4c3",
            p: 3,
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Avatar
            src={profileImage}
            sx={{
              width: 90,
              height: 90,
              border: "4px solid #fff",
            }}
          />

          <Button
            variant="contained"
            startIcon={<MdEdit size={18} />}
            sx={{
              textTransform: "none",
              borderRadius: 2,
            }}
            onClick={handleOpen}
          >
            Edit Profile
          </Button>
        </Box>

        {/* ===== BOTTOM SECTION ===== */}
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={600}>
            {formData.name} {formData.surname}
          </Typography>

          <Chip
            label={formData.jobTitle}
            size="small"
            sx={{
              mt: 1,
              bgcolor: "#1976d2",
              color: "#fff",
            }}
          />

          <Box sx={{ mt: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Telegram:
            </Typography>
            <Typography
              sx={{
                color: "#1976d2",
                fontWeight: 500,
              }}
            >
              {formData.telegram}
            </Typography>
          </Box>

          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Phone:
            </Typography>
            <Typography
              sx={{
                color: "#1976d2",
                fontWeight: 500,
              }}
            >
              {formData.phone}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* ===== EDIT MODAL ===== */}
      <Modal open={open} onClose={handleClose}>
        <Box sx={modalStyle}>
          <Typography variant="h6" component="h2" gutterBottom>
            Edit Profile
          </Typography>

          <TextField
            fullWidth
            label="Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Surname"
            name="surname"
            value={formData.surname}
            onChange={handleChange}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Job Title"
            name="jobTitle"
            value={formData.jobTitle}
            onChange={handleChange}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Telegram Username"
            name="telegram"
            value={formData.telegram}
            onChange={handleChange}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Phone Number"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            margin="normal"
          />

          <Button
            variant="contained"
            color="primary"
            fullWidth
            sx={{ mt: 2 }}
            onClick={handleSubmit}
          >
            Send
          </Button>
        </Box>
      </Modal>
    </Box>
  );
};

export default ProfilePage;