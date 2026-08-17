import { Box, CircularProgress, Paper, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useGroupCommentsQuery } from "../../../app/api/groupsApi";

interface Props {
  groupId: string;
}

export const Comments = ({ groupId }: Props) => {
  const { t } = useTranslation();
  const { data: comments, isLoading, isError } = useGroupCommentsQuery(groupId, { skip: !groupId });

  return (
    <Box>
      <Typography variant="h6" fontWeight={600} mb={2}>
        {t("singleGroup.tabs.comments.title")}
      </Typography>

      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress size={26} />
        </Box>
      ) : isError ? (
        <Typography sx={{ color: "#e53935", fontSize: 13, textAlign: "center", py: 4 }}>
          {t("singleGroup.tabs.comments.loadError")}
        </Typography>
      ) : !comments || comments.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: "center", color: "#999", borderRadius: 2 }}>
          {t("singleGroup.tabs.comments.noCommentsYet")}
        </Paper>
      ) : (
        comments.map((c) => (
          <Paper key={c.id} sx={{ p: 2, mb: 1, borderRadius: 2 }}>
            <Typography fontSize={13}>{c.text}</Typography>
            {(c.author || c.createdAt) && (
              <Typography fontSize={11} color="text.secondary" mt={0.5}>
                {[c.author, c.createdAt ? new Date(c.createdAt).toLocaleString() : null]
                  .filter(Boolean)
                  .join(" · ")}
              </Typography>
            )}
          </Paper>
        ))
      )}
    </Box>
  );
};
