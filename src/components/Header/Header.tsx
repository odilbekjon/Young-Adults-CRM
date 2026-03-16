import { Box, Typography, Button } from "@mui/material";
import { FiGlobe } from "react-icons/fi";
import logo from "../../assets/logo.svg";
import { useNavigate } from "react-router-dom";


const Header = () => {
    const navigate = useNavigate();
  return (
    <Box
      sx={{
        width: "100%",
        bgcolor: "#fff",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 1000,
        mb: 4,
        borderRadius: "8px",
        px: 4,
        py: 2,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Box
        component="img"
        src={logo}
        alt="EduManSim Logo"
        sx={{
            height: 50,
            width: "auto",
            objectFit: "contain",
            cursor: "pointer",
        }}
/>

      {/* RIGHT SIDE */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
        }}
      >
        {/* Phone */}
        <Typography sx={{ fontSize: "14px" }}>
          (90) 417-47-56
        </Typography>

        {/* Language Button */}
        <Button
          variant="outlined"
          size="small"
          startIcon={<FiGlobe size={16} />}
          sx={{
            textTransform: "none",
            borderRadius: "8px",
          }}
        >
          Eng
        </Button>

        {/* Login Button */}
        <Button
          variant="contained"
          onClick={() => navigate("/login")}
          size="small"
          sx={{
            textTransform: "none",
            borderRadius: "8px",
            px: 3,
          }}
        >
          Log in
        </Button>
      </Box>
    </Box>
  );
};

export default Header;