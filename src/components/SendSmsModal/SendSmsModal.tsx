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
  CircularProgress,
  MenuItem,
  Select,
} from "@mui/material";
import { MdClose } from "react-icons/md";
import {
  useSendSmsToStudentsMutation,
  useSendSmsToTeachersMutation,
  useSmsTemplatesQuery,
} from "../../app/api/smsApi";
import { useToast } from "../../Context/ToastContext";
import { extractApiError } from "../../utils";

interface SendSmsModalProps {
  open: boolean;
  onClose: () => void;
  /**
   * Real backend student ids this SMS will be sent to (POST /sms/send/
   * students). Pass an empty array for a recipient this can't target; Send
   * stays disabled rather than silently no-oping.
   */
  studentIds: string[];
  /**
   * Real backend teacher ids — when given (even empty), the SMS goes through
   * POST /sms/send/teachers instead and `studentIds` is ignored.
   */
  teacherIds?: string[];
  /** Kimga yuborilayapti (ixtiyoriy, title uchun) */
  recipientLabel?: string; // e.g. "student" | "staff" | "debtor"
  sender?: string;
}

const SMS_PER_CHAR = 160;

export const SendSmsModal = ({
  open,
  onClose,
  studentIds,
  teacherIds,
  recipientLabel = "student",
  sender = "3700",
}: SendSmsModalProps) => {
  const toast = useToast();
  const [sendToStudents, { isLoading: isSendingStudents }] = useSendSmsToStudentsMutation();
  const [sendToTeachers, { isLoading: isSendingTeachers }] = useSendSmsToTeachersMutation();
  const isLoading = isSendingStudents || isSendingTeachers;
  const { data: templates } = useSmsTemplatesQuery(undefined, { skip: !open });
  const [message, setMessage] = useState("");
  const [templateId, setTemplateId] = useState("");

  const recipientIds = teacherIds ?? studentIds;
  const symbolCount = message.length;
  const smsCount = symbolCount === 0 ? 1 : Math.ceil(symbolCount / SMS_PER_CHAR);
  const canSend = message.trim().length > 0 && recipientIds.length > 0 && !isLoading;

  const handleClose = () => {
    setMessage("");
    setTemplateId("");
    onClose();
  };

  // Picking a template only fills the textarea (the text can still be edited
  // before sending); the message itself is what gets sent.
  const handlePickTemplate = (id: string) => {
    setTemplateId(id);
    const picked = (templates ?? []).find((tpl) => tpl.id === id);
    if (picked) setMessage(picked.content);
  };

  const handleSend = async () => {
    if (!canSend) return;
    try {
      if (teacherIds !== undefined) {
        await sendToTeachers({ teacherIds, text: message.trim() }).unwrap();
      } else {
        await sendToStudents({ studentIds, text: message.trim() }).unwrap();
      }
      toast.success("SMS sent");
      handleClose();
    } catch (err) {
      const detail = extractApiError(err);
      toast.error(detail ? `Failed to send SMS: ${detail}` : "Failed to send SMS");
    }
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

        {/* Saved templates (GET /sms/templates) */}
        {(templates ?? []).length > 0 && (
          <Select
            size="small"
            displayEmpty
            fullWidth
            value={templateId}
            onChange={(e) => handlePickTemplate(e.target.value)}
            disabled={isLoading}
            sx={{ fontSize: 14 }}
          >
            <MenuItem value="">
              <em style={{ fontStyle: "normal", color: "#9ca3af" }}>Choose a template</em>
            </MenuItem>
            {(templates ?? []).map((tpl) => (
              <MenuItem key={tpl.id} value={tpl.id}>
                {tpl.title}
              </MenuItem>
            ))}
          </Select>
        )}

        {/* Textarea */}
        <TextField
          multiline
          rows={5}
          fullWidth
          placeholder="Enter a message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={isLoading}
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
            {recipientIds.length} selected {recipientLabel}
            {recipientIds.length !== 1 ? "s" : ""}
          </Typography>
        </Box>

        {/* Send button */}
        <Button
          variant="contained"
          onClick={handleSend}
          disabled={!canSend}
          startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : undefined}
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
