// src/components/SendSmsModal.tsx

import { useState } from "react";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  TextField,
  Button,
  Divider,
} from "@mui/material";
import { MdClose } from "react-icons/md";

interface SendSmsModalProps {
  open: boolean;
  onClose: () => void;
  /** Nechta student/recipient tanlangan */
  selectedCount?: number;
  /** Kimga yuborilayapti (ixtiyoriy, title uchun) */
  recipientLabel?: string; // e.g. "student" | "staff" | "debtor"
  sender?: string;
}

const SMS_PER_CHAR = 160;

export const SendSmsModal = ({
  open,
  onClose,
  selectedCount = 1,
  recipientLabel = "student",
  sender = "3700",
}: SendSmsModalProps) => {
  const [message, setMessage] = useState("");

  const symbolCount = message.length;
  const smsCount = symbolCount === 0 ? 1 : Math.ceil(symbolCount / SMS_PER_CHAR);

  const handleSend = () => {
    if (!message.trim()) return;
    // TODO: real API call
    console.log("Sending SMS:", { message, selectedCount, sender });
    setMessage("");
    onClose();
  };

  const handleClose = () => {
    setMessage("");
    onClose();
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={handleClose}
      PaperProps={{
        sx: {
          width: 400,
          p: 0,
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          px: 3,
          py: 2.5,
        }}
      >
        <Typography fontWeight={600} fontSize={17}>
          Send SMS to {recipientLabel}
        </Typography>
        <IconButton size="small" onClick={handleClose}>
          <MdClose size={20} />
        </IconButton>
      </Box>
      <Divider />

      {/* Body */}
      <Box sx={{ px: 3, py: 3, flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
        {/* Sender */}
        <Typography fontSize={15} color="text.secondary">
          Sender:{" "}
          <Box component="span" fontWeight={600} color="text.primary">
            {sender}
          </Box>
        </Typography>

        {/* Textarea */}
        <TextField
          multiline
          rows={5}
          fullWidth
          placeholder="Enter a message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          sx={{
            "& .MuiOutlinedInput-root": {
              fontSize: 14,
              alignItems: "flex-start",
            },
          }}
        />

        {/* Meta info */}
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography fontSize={12} color="text.secondary">
            {symbolCount} symbols ( ~ {smsCount} SMS )
          </Typography>
          <Typography fontSize={12} color="text.secondary">
            {selectedCount} selected {recipientLabel}
            {selectedCount !== 1 ? "s" : ""}
          </Typography>
        </Box>

        {/* Send button */}
        <Button
          variant="contained"
          onClick={handleSend}
          disabled={!message.trim()}
          sx={{
            alignSelf: "flex-start",
            bgcolor: "#4a7fa5",
            borderRadius: 5,
            px: 4,
            py: 1,
            textTransform: "none",
            fontWeight: 600,
            fontSize: 14,
            "&:hover": { bgcolor: "#3a6f95" },
            "&.Mui-disabled": { bgcolor: "#b0c4d8", color: "#fff" },
          }}
        >
          Send SMS
        </Button>
      </Box>
    </Drawer>
  );
};