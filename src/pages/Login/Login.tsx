import { Box, Grid, Typography, TextField, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import loginImage from "../../assets/login.png"; // rasm yo'lini moslashtir

interface LoginForm {
  phone: string;
  password: string;
}

const LoginPage = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState<LoginForm>({
    phone: "",
    password: "",
  });

  const handleChange =
    (field: keyof LoginForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({
        ...prev,
        [field]: e.target.value,
      }));
    };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("Login data:", form);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        mt: 5,
      }}
    >
      <Grid
        container
        sx={{
          maxWidth: 1100,
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        {/* ===== LEFT SIDE ===== */}
        <Grid item xs={12} md={5}>
          <Box
            sx={{
              p: 5,
              height: "80%",
              border: "3px solid #1976d2",
              borderRadius: 2,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              mr: { md: 4 },
            }}
          >
            {/* Language button */}
            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="outlined"
                size="small"
                sx={{ textTransform: "none" }}
              >
                Eng
              </Button>
            </Box>

            <Typography
              variant="h5"
              sx={{
                textAlign: "center",
                mt: 4,
                mb: 4,
                fontWeight: 600,
                color: "#1976d2",
              }}
            >
              Sign in
            </Typography>

            {/* 🔥 FORM */}
            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Phone number"
                placeholder="+998"
                required
                margin="normal"
                value={form.phone}
                onChange={handleChange("phone")}
              />

              <TextField
                fullWidth
                type="password"
                label="Password"
                required
                margin="normal"
                value={form.password}
                onChange={handleChange("password")}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{
                  mt: 3,
                  py: 1.3,
                  borderRadius: 2,
                }}
              >
                Next
              </Button>
            </Box>

            <Typography
              sx={{
                mt: 3,
                fontSize: 14,
              }}
            >
              Don’t have an account?{" "}
              <Box
                component="span"
                sx={{
                  color: "#1976d2",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
                onClick={() => navigate("/signup")}
              >
                Fill out an application
              </Box>
            </Typography>
          </Box>
        </Grid>

        {/* ===== RIGHT SIDE ===== */}
        <Grid item xs={false} md={7}>
          <Box
            component="img"
            src={loginImage}
            alt="login"
            sx={{
              width: "100%",
              height: "80%",
              objectFit: "cover",
              borderRadius: 2,
            }}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default LoginPage;