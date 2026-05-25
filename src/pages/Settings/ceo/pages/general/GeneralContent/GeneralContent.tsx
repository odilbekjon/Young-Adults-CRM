import { useRef, useState } from "react";
import {
  TextField, Switch, Button, Typography, Box, Divider,
} from "@mui/material";
import { FiUpload } from "react-icons/fi";
import { MdAccessTime } from "react-icons/md";
import { themeColors } from "../Shared";

const GeneralContent = () => {
  const [companyName, setCompanyName] = useState("Young Adults");
  const [companyPhone, setCompanyPhone] = useState("915785930");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("20:00");
  const [lessonStartTime, setLessonStartTime] = useState(false);
  const [allStaffCoin, setAllStaffCoin] = useState(false);
  const [branchPBX, setBranchPBX] = useState(false);
  const [animation, setAnimation] = useState(true);
  const [selectedColor, setSelectedColor] = useState(1);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [ofertaFile, setOfertaFile] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const ofertaInputRef = useRef<HTMLInputElement>(null);

  return (
    <Box sx={{ flex: 1, p: 5, maxWidth: 900 }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 4, color: "#111827" }}>
        General settings
      </Typography>

      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px 40px" }}>
        {/* Company Name */}
        <Box>
          <Typography sx={{ fontSize: 13, color: "#4b5563", mb: 1 }}>
            Company Name <span style={{ color: "red" }}>*</span>
          </Typography>
          <TextField fullWidth size="small" value={companyName}
            onChange={(e) => setCompanyName(e.target.value)} sx={{ background: "#fff" }} />
        </Box>

        {/* Company Phone */}
        <Box>
          <Typography sx={{ fontSize: 13, color: "#4b5563", mb: 1 }}>
            Company Phone <span style={{ color: "red" }}>*</span>
          </Typography>
          <TextField fullWidth size="small" value={companyPhone}
            onChange={(e) => setCompanyPhone(e.target.value)} sx={{ background: "#fff" }} />
        </Box>

        {/* Start Time */}
        <Box>
          <Typography sx={{ fontSize: 13, color: "#4b5563", mb: 1 }}>
            Start time <span style={{ color: "red" }}>*</span>
          </Typography>
          <TextField fullWidth size="small" type="time" value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            InputProps={{ startAdornment: <MdAccessTime style={{ color: "#9ca3af", marginRight: 8 }} size={18} /> }}
            sx={{ background: "#fff" }} />
        </Box>

        {/* End Time */}
        <Box>
          <Typography sx={{ fontSize: 13, color: "#4b5563", mb: 1 }}>
            End time <span style={{ color: "red" }}>*</span>
          </Typography>
          <TextField fullWidth size="small" type="time" value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            InputProps={{ startAdornment: <MdAccessTime style={{ color: "#9ca3af", marginRight: 8 }} size={18} /> }}
            sx={{ background: "#fff" }} />
        </Box>

        {/* Toggles */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography sx={{ fontSize: 13, color: "#374151" }}>Lesson start time: (step 5 minutes)</Typography>
          <Switch checked={lessonStartTime} onChange={(e) => setLessonStartTime(e.target.checked)} size="small" />
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography sx={{ fontSize: 13, color: "#374151" }}>All staff can give coin</Typography>
          <Switch checked={allStaffCoin} onChange={(e) => setAllStaffCoin(e.target.checked)} size="small" />
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography sx={{ fontSize: 13, color: "#374151" }}>Branch specific onlinePBX</Typography>
          <Switch checked={branchPBX} onChange={(e) => setBranchPBX(e.target.checked)} size="small" />
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography sx={{ fontSize: 13, color: "#374151" }}>Animation</Typography>
          <Switch checked={animation} onChange={(e) => setAnimation(e.target.checked)} size="small"
            sx={{
              "& .MuiSwitch-switchBase.Mui-checked": { color: "#2196f3" },
              "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#2196f3" },
            }} />
        </Box>

        {/* Logo */}
        <Box>
          <Typography sx={{ fontSize: 13, color: "#374151", mb: 1.5 }}>Logo</Typography>
          <Box onClick={() => logoInputRef.current?.click()} sx={{
            cursor: "pointer", border: "2px dashed #d1d5db", borderRadius: "8px",
            width: 180, height: 130, display: "flex", alignItems: "center", justifyContent: "center",
            background: "#fafafa", overflow: "hidden",
            "&:hover": { borderColor: "#3b82f6" }, transition: "border-color 0.2s",
          }}>
            {logoPreview
              ? <img src={logoPreview} alt="logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              : <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", color: "#9ca3af" }}>
                  <FiUpload size={28} />
                  <Typography variant="caption" sx={{ mt: 1 }}>Upload logo</Typography>
                </Box>
            }
          </Box>
          <input ref={logoInputRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={(e) => { if (e.target.files?.[0]) setLogoPreview(URL.createObjectURL(e.target.files[0])); }} />
        </Box>

        {/* Theme color + Oferta */}
        <Box>
          <Typography sx={{ fontSize: 13, color: "#374151", mb: 2 }}>Select theme color</Typography>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            {themeColors.map((tc, idx) => (
              <Box key={idx} onClick={() => setSelectedColor(idx)} sx={{
                width: 36, height: 36, borderRadius: "50%", background: tc.color, cursor: "pointer",
                border: tc.border ? "2px solid #b0b0b0" : selectedColor === idx ? "3px solid #1976d2" : "2px solid transparent",
                boxShadow: selectedColor === idx ? "0 0 0 2px #90caf9" : "0 1px 4px rgba(0,0,0,0.15)",
                transform: selectedColor === idx ? "scale(1.15)" : "scale(1)",
                transition: "all 0.15s ease",
              }} />
            ))}
          </Box>

          <Box sx={{ mt: 4 }}>
            <Typography sx={{ fontSize: 13, color: "#374151", mb: 1.5 }}>Company Oferta</Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Button variant="contained" size="small" onClick={() => ofertaInputRef.current?.click()}
                sx={{ background: "#1976d2", textTransform: "none", fontSize: "0.85rem", px: 2.5 }}>
                Select file
              </Button>
              {ofertaFile && <Typography variant="caption" sx={{ color: "#6b7280" }}>{ofertaFile}</Typography>}
            </Box>
            <input ref={ofertaInputRef} type="file" style={{ display: "none" }}
              onChange={(e) => { if (e.target.files?.[0]) setOfertaFile(e.target.files[0].name); }} />
          </Box>
        </Box>
      </Box>

      <Divider sx={{ my: 4 }} />

      <Button variant="contained" sx={{
        background: "#E08C3A", textTransform: "none", fontWeight: 600,
        px: 4, py: 1, fontSize: "0.95rem", "&:hover": { background: "#c97a2e" },
      }}>
        Save
      </Button>
    </Box>
  );
};

export default GeneralContent;