import { Box, Typography, TextField, Button, Stack, Paper } from "@mui/material";
import { useState } from "react";
import { useTranslation } from "react-i18next";
export const Comments = () => {
  const { t } = useTranslation();
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<string[]>([]);
  return (
    <Box>
      <Typography variant="h6" fontWeight={600} mb={2}>{t("singleGroup.tabs.comments.title")}</Typography>
      <Stack spacing={1} mb={2}>
        <TextField
          multiline rows={3} placeholder={t("singleGroup.tabs.comments.writeComment")}
          value={comment} onChange={(e) => setComment(e.target.value)}
        />
        <Button
          variant="contained" sx={{ alignSelf: "flex-end" }}
          onClick={() => { if (comment.trim()) { setComments((p) => [...p, comment]); setComment(""); } }}
        >
          {t("singleGroup.tabs.comments.send")}
        </Button>
      </Stack>
      {comments.length === 0
        ? <Paper sx={{ p: 3, textAlign: "center", color: "#999", borderRadius: 2 }}>{t("singleGroup.tabs.comments.noCommentsYet")}</Paper>
        : comments.map((c, i) => (
          <Paper key={i} sx={{ p: 2, mb: 1, borderRadius: 2 }}>{c}</Paper>
        ))
      }
    </Box>
  );
};