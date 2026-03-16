import { AppBar, Toolbar, Button, Box, Typography, Container } from "@mui/material";
import { useNavigate } from "react-router-dom";

export const Home = () => {
  const navigate = useNavigate();

  return (
    <Box className="min-h-screen bg-gradient-to-br from-[#0f2027] via-[#203a43] to-[#2c5364] text-white relative">
      
      {/* ===== HEADER ===== */}
      <AppBar position="static" elevation={0} sx={{ background: "transparent" }}>
        <Toolbar className="flex justify-between">
          <Typography variant="h6" className="font-bold tracking-wide">
            Young Adults
          </Typography>

          <Box className="flex items-center gap-3">
            <Typography className="text-sm hidden sm:block opacity-80">
              +998 90 417 47 56
            </Typography>

            <Button
              variant="outlined"
              size="small"
              className="!text-white !border-white/60"
            >
              UZ
            </Button>

            <Button
              variant="contained"
              size="small"
              className="!bg-cyan-500 hover:!bg-cyan-600"
              onClick={() => navigate("/signup")}
            >
              Kirish
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* ===== HERO ===== */}
      <Container maxWidth="md">
        <Box className="flex flex-col items-center justify-center text-center mt-36">
          
          <Typography
            variant="h3"
            className="font-bold mb-4 leading-tight"
          >
            Zamonaviy kasblar <br />
            kelajagingiz uchun
          </Typography>

          <Typography
                variant="body1"
                component="div"
                className="max-w-xl mx-10 opacity-80"
                sx={{
                    maxWidth: 560,
                    opacity: 0.8,
                    marginTop:5,
                    marginBottom:5,
                }}
                >
                Young Adults — kompyuter savodxonligi, frontend va IT yo‘nalishlarida
                sifatli ta’lim beruvchi zamonaviy o‘quv markazi.
                </Typography>

          <Button
            variant="contained"
            size="large"
            className="!bg-cyan-500 hover:!bg-cyan-600 px-12 py-3 text-base"
            onClick={() => navigate("/dashboard")}
          >
            CRM tizimiga kirish
          </Button>
        </Box>
      </Container>

      {/* ===== FOOTER ===== */}
      <Box className="absolute bottom-4 w-full text-center text-sm opacity-60">
        © 2024 Young Adults Education Center
      </Box>
    </Box>
  );
};
