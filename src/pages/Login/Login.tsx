import { Box, Button, TextField, Typography, Alert, InputAdornment, IconButton } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import logo from "../../assets/logo_ya.png";
import blackLogo from "../../assets/logo_ya_black.png"


const LANGS = ["EN", "RU", "UZ", "ID"];

const CORRECT_PHONE = "915179774";
const CORRECT_PASSWORD = "1111";

const LoginPage = () => {
  const navigate = useNavigate();

  const [lang, setLang] = useState("EN");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = () => {
    const cleaned = phone.replace(/\s/g, "");
    if (cleaned === CORRECT_PHONE && password === CORRECT_PASSWORD) {
      setError("");
      navigate("/dashboard");
    } else {
      setError("Telefon raqam yoki parol noto'g'ri. Qaytadan urinib ko'ring.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#b0bec5]">
      <Box sx={{ width:"50%",  bgcolor: "transparent", display: "flex", flexDirection: "column", mx: "auto",   }}>

      
      <Box className="bg-gray-800 w-full h-36 rounded-2xl">
          <img className="block mx-auto mt-5" src={logo} width={300} alt="Logo" />
      </Box>

  
      <Box sx={{ bgcolor: "white", mt: 1.5, px: 2.5, py: 2, borderRadius: 3 }}>
        <Typography sx={{ fontWeight: 600, fontSize: 15 }}>Young Adults LLC</Typography>
        <Typography sx={{ fontSize: 14, color: "text.secondary", mt: 0.5 }}>Always step ahead !</Typography>
      </Box>

      {/* LOGIN CARD */}
      <Box sx={{ bgcolor: "white",  mt: 1, mb: 3, px: 2.5, py: 3, borderRadius: 3 }}>

       
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mb: 2 }}>
          {LANGS.map((l) => (
            <Button
              key={l}
              onClick={() => setLang(l)}
              size="small"
              sx={{
                minWidth: 0,
                px: 1,
                py: 0.2,
                fontSize: 13,
                fontWeight: lang === l ? 700 : 400,
                color: lang === l ? "#1e2a3a" : "text.secondary",
                textTransform: "none",
                bgcolor: "transparent",
                "&:hover": { bgcolor: "transparent" },
              }}
            >
              {l}
            </Button>
          ))}
        </Box>

        <Box sx={{ display: "flex", gap: 3 }}>
          
          <Box sx={{ display: { xs: "none", sm: "flex" }, alignItems: "center", gap: 1, flexShrink: 0, pt: 1 }}>
            <img src={blackLogo} width={100} alt="logo" />
            
          </Box>

          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 600, fontSize: 18, mb: 2 }}>Login</Typography>
            
            {error && (
              <Alert severity="error" sx={{ mb: 2, fontSize: 13 }}>
                {error}
              </Alert>
            )}

          
            <TextField
              fullWidth
              label="Phone"
              required
              size="small"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="99 891 51 79"
              inputProps={{ maxLength: 12 }}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Box
                      sx={{
                        pr: 1.5,
                        mr: 0.5,
                        borderRight: "1px solid",
                        borderColor: "divider",
                        fontSize: 14,
                        fontWeight: 500,
                        color: "text.primary",
                        whiteSpace: "nowrap",
                      }}
                    >
                      +998
                    </Box>
                  </InputAdornment>
                ),
              }}
            />

           
            <TextField
              fullWidth
              label="Password"
              required
              size="small"
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              sx={{ mb: 2.5 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPass((p) => !p)} edge="end">
                      {showPass ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              variant="contained"
              onClick={handleLogin}
              sx={{
                bgcolor: "#1e3a5f",
                color: "white",
                borderRadius: "24px",
                px: 4,
                py: 1.2,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 1,
                textTransform: "uppercase",
                "&:hover": { bgcolor: "#1565c0" },
              }}
            >
              Login
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
    </div>
  );
};

export default LoginPage;