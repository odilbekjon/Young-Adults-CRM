import React, { useState } from "react";
import Header from "../../components/Header/Header";
import {
  Box,
  Grid,
  TextField,
  Button,
  Typography,
  Paper,
  Divider,
  IconButton,
} from "@mui/material";
import { FiPhone, FiMail } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
interface FormData {
  name: string;
  surname: string;
  phone: string;
  email: string;
  company: string;
}

const SignUp = () => {
    const navigate = useNavigate();
    
  const [formData, setFormData] = useState<FormData>({
    name: "",
    surname: "",
    phone: "",
    email: "",
    company: "",
  });

  const handleChange =
    (field: keyof FormData) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));
    };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log("SUBMITTED:", formData);
  };

  return (
    <>
    <Header />
    <Box sx={{ minHeight: "100vh", bgcolor: "#f5f7fa", p: 6, pt: 15 }}>
      <Grid container spacing={6}>
        {/* FORM */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 4, borderRadius: 3 }}>
            <Typography variant="h5" textAlign="center" mb={3}>
              Fill out an application
            </Typography>

            {/* 🔥 FORM WRAPPER */}
            <Box
              component="form"
              onSubmit={handleSubmit}
              noValidate
            >
              <TextField
                fullWidth
                label="Name"
                required
                margin="normal"
                value={formData.name}
                onChange={handleChange("name")}
              />

              <TextField
                fullWidth
                label="Surname"
                required
                margin="normal"
                value={formData.surname}
                onChange={handleChange("surname")}
              />

              <TextField
                fullWidth
                label="Phone number"
                required
                margin="normal"
                value={formData.phone}
                onChange={handleChange("phone")}
              />

              <TextField
                fullWidth
                label="Email"
                required
                type="email"
                margin="normal"
                value={formData.email}
                onChange={handleChange("email")}
              />

              <TextField
                fullWidth
                label="Company name"
                required
                margin="normal"
                value={formData.company}
                onChange={handleChange("company")}
              />

              {/* 🔥 type="submit" MUHIM */}
              <Button
                type="submit"
                variant="contained"
                fullWidth
                sx={{ mt: 3, py: 1.3 }}
              >
                Send
              </Button>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="body2">
                Are you already registered?
              </Typography>

              <Button variant="outlined" size="small" onClick={() => navigate("/login")}>
                Log in
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* RIGHT SIDE */}
        <Grid item sx={
            {
                mt:30

            }
        }  xs={12} md={6}>
          <Typography variant="h5" mb={2}>
            SIgn up and get 14 days for free!
          </Typography>

          <Typography mb={3}>
            Fill out the form and our manager will contact you to discuss all the details and answer your questions.
          </Typography>

          <Divider sx={{ mb: 3 }} />

          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <IconButton sx={{ bgcolor: "#eef2f6", mr: 2 }}>
              <FiPhone />
            </IconButton>
            <Typography>(90) 295 70 07</Typography>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center" }}>
            <IconButton sx={{ bgcolor: "#eef2f6", mr: 2 }}>
              <FiMail />
            </IconButton>
            <Typography>youngadults@gmail.com</Typography>
          </Box>
        </Grid>
      </Grid>
    </Box>
    </>
  );
};

export default SignUp;