import { useState } from "react";
import { Button, Typography, Box, TextField } from "@mui/material";

// ── Outlined card with border-label (PaymentMethods dan o'xshash) ──
const FieldCard = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <Box
    sx={{
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      pt: 2,
      pb: 3,
      px: 2.5,
      position: "relative",
      flex: 1,
    }}
  >
    <Typography
      sx={{
        position: "absolute",
        top: -10,
        left: 12,
        background: "#fff",
        px: 0.5,
        fontSize: 12,
        color: "#6b7280",
      }}
    >
      {title}
    </Typography>
    {children}
  </Box>
);

const Communication = () => {
  // PlayMobile SMS
  const [pmUsername, setPmUsername] = useState("");
  const [pmPassword, setPmPassword] = useState("");
  const [pmNickname, setPmNickname] = useState("3700");

  // Eskiz SMS
  const [eskizEmail, setEskizEmail] = useState("yigitali.abdullaev@gmail.com");
  const [eskizSecret, setEskizSecret] = useState("••••••••••••••••••••••••••••••••••••");
  const [eskizNickname, setEskizNickname] = useState("");

  return (
    <Box sx={{ flex: 1, p: 5, maxWidth: 1200 }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 4, color: "#111827" }}>
        Communication
      </Typography>

      {/* ── 2 cards side by side ── */}
      <Box sx={{ display: "flex", gap: 3, alignItems: "flex-start", mb: 4 }}>

        {/* PlayMobile SMS */}
        <FieldCard title="PlayMobile SMS">
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, mt: 0.5 }}>
            <Box>
              <Typography sx={{ fontSize: 13, color: "#374151", mb: 0.8 }}>
                PlayMobile gateway username
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={pmUsername}
                onChange={(e) => setPmUsername(e.target.value)}
                sx={{ background: "#fff", "& .MuiOutlinedInput-root": { fontSize: 13 } }}
              />
            </Box>

            <Box>
              <Typography sx={{ fontSize: 13, color: "#374151", mb: 0.8 }}>
                PlayMobile gateway password
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="password"
                value={pmPassword}
                onChange={(e) => setPmPassword(e.target.value)}
                sx={{ background: "#fff", "& .MuiOutlinedInput-root": { fontSize: 13 } }}
              />
            </Box>

            <Box>
              <Typography sx={{ fontSize: 13, color: "#374151", mb: 0.8 }}>
                PlayMobile Nickname
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={pmNickname}
                onChange={(e) => setPmNickname(e.target.value)}
                sx={{ background: "#fff", "& .MuiOutlinedInput-root": { fontSize: 13 } }}
              />
            </Box>
          </Box>
        </FieldCard>

        {/* Eskiz SMS */}
        <FieldCard title="Eskiz SMS">
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, mt: 0.5 }}>
            <Box>
              <Typography sx={{ fontSize: 13, color: "#374151", mb: 0.8 }}>
                Eskiz email (login)
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={eskizEmail}
                onChange={(e) => setEskizEmail(e.target.value)}
                sx={{ background: "#fff", "& .MuiOutlinedInput-root": { fontSize: 13 } }}
              />
            </Box>

            <Box>
              <Typography sx={{ fontSize: 13, color: "#374151", mb: 0.8 }}>
                Eskiz secret key (password)
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="password"
                value={eskizSecret}
                onChange={(e) => setEskizSecret(e.target.value)}
                sx={{ background: "#fff", "& .MuiOutlinedInput-root": { fontSize: 13 } }}
              />
            </Box>

            <Box>
              <Typography sx={{ fontSize: 13, color: "#374151", mb: 0.8 }}>
                Eskiz nickname
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={eskizNickname}
                onChange={(e) => setEskizNickname(e.target.value)}
                sx={{ background: "#fff", "& .MuiOutlinedInput-root": { fontSize: 13 } }}
              />
            </Box>
          </Box>
        </FieldCard>

      </Box>

      {/* ── Save ── */}
      <Button
        variant="contained"
        sx={{
          background: "#1e3a5f",
          textTransform: "none",
          fontWeight: 600,
          px: 3,
          py: 1,
          borderRadius: "24px",
          fontSize: "0.9rem",
          "&:hover": { background: "#162d4a" },
        }}
      >
        Save
      </Button>
    </Box>
  );
};

export default Communication;