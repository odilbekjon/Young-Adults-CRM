import { Box, Typography, TextField, Button, Stack, Paper } from "@mui/material";
import { useState } from "react";
export const Comments = () => {
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<string[]>([]);
  return (
    <Box>
      <Typography variant="h6" fontWeight={600} mb={2}>Comments</Typography>
      <Stack spacing={1} mb={2}>
        <TextField
          multiline rows={3} placeholder="Write a comment..."
          value={comment} onChange={(e) => setComment(e.target.value)}
        />
        <Button
          variant="contained" sx={{ alignSelf: "flex-end" }}
          onClick={() => { if (comment.trim()) { setComments((p) => [...p, comment]); setComment(""); } }}
        >
          Send
        </Button>
      </Stack>
      {comments.length === 0
        ? <Paper sx={{ p: 3, textAlign: "center", color: "#999", borderRadius: 2 }}>No comments yet</Paper>
        : comments.map((c, i) => (
          <Paper key={i} sx={{ p: 2, mb: 1, borderRadius: 2 }}>{c}</Paper>
        ))
      }
    </Box>
  );
};