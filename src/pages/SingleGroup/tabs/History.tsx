import { Box, CircularProgress, Divider, Stack, Typography } from "@mui/material";
import { MdOutlinePerson } from "react-icons/md";
import { useTranslation } from "react-i18next";
import { useGroupHistoryQuery } from "../../../app/api/groupsApi";
import type { GroupHistoryEntry } from "../../../app/api/groupsApi/types";
import { formatDateTime } from "../../../utils";

interface Props {
  groupId: string;
  groupName: string;
}

const humanizeType = (type: string) =>
  type
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ") || "—";

const HistoryEntryRow = ({
  entry, groupName, groupId,
}: {
  entry: GroupHistoryEntry;
  groupName: string;
  groupId: string;
}) => {
  const { t } = useTranslation();
  const title = t(`singleGroup.tabs.history.types.${entry.type}`, {
    defaultValue: humanizeType(entry.type),
  });

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 3,
        py: 2.25,
        px: 0.5,
      }}
    >
      <Stack spacing={0.6} sx={{ minWidth: 0, flex: 1 }}>
        <Typography fontWeight={700} fontSize={15} color="#1a1a1a">
          {title}
        </Typography>

        {(entry.studentName || entry.studentPhone) && (
          <Stack direction="row" alignItems="center" spacing={0.75} flexWrap="wrap">
            <MdOutlinePerson size={15} color="#9e9e9e" />
            {entry.studentName && (
              <Typography fontSize={13} color="text.secondary">
                {entry.studentName}
              </Typography>
            )}
            {entry.studentName && entry.studentPhone && (
              <Typography fontSize={13} color="text.secondary">
                •
              </Typography>
            )}
            {entry.studentPhone && (
              <Typography fontSize={13} color="text.secondary">
                {entry.studentPhone}
              </Typography>
            )}
          </Stack>
        )}

        <Typography fontSize={13} color="text.primary">
          {t("singleGroup.tabs.history.groupName")}:{" "}
          <Box component="span" sx={{ color: "#1976d2", fontWeight: 500 }}>
            {groupName}
          </Box>
        </Typography>

        {groupId && (
          <Typography fontSize={13} color="text.secondary">
            {t("singleGroup.tabs.history.group")}: #{groupId}
          </Typography>
        )}

        {entry.detail && (
          <Typography fontSize={13} color="text.primary" sx={{ mt: 0.25 }}>
            {entry.detail}
          </Typography>
        )}
      </Stack>

      <Stack spacing={0.5} alignItems="flex-end" sx={{ flexShrink: 0 }}>
        {entry.createdAt && (
          <Typography fontSize={12.5} color="text.secondary" whiteSpace="nowrap">
            {formatDateTime(entry.createdAt)}
          </Typography>
        )}
        {entry.actor && (
          <Typography fontSize={12.5} color="text.secondary" textAlign="right" whiteSpace="nowrap">
            {entry.actor}
          </Typography>
        )}
      </Stack>
    </Box>
  );
};

export const History = ({ groupId, groupName }: Props) => {
  const { t } = useTranslation();
  const { data: entries, isLoading, isError } = useGroupHistoryQuery(groupId, { skip: !groupId });

  return (
    <Box>
      <Typography variant="h6" fontWeight={600} mb={2}>
        {t("singleGroup.tabs.history.title")}
      </Typography>

      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress size={26} />
        </Box>
      ) : isError ? (
        <Typography sx={{ color: "#e53935", fontSize: 13, textAlign: "center", py: 4 }}>
          {t("singleGroup.tabs.history.loadError")}
        </Typography>
      ) : !entries || entries.length === 0 ? (
        <Typography sx={{ color: "#9ca3af", fontSize: 13, textAlign: "center", py: 4 }}>
          {t("singleGroup.tabs.history.emptyState")}
        </Typography>
      ) : (
        <Box
          sx={{
            bgcolor: "#fff",
            borderRadius: 2,
            border: "1px solid #e0e0e0",
            px: 2.5,
          }}
        >
          {entries.map((entry, i) => (
            <Box key={entry.id}>
              <HistoryEntryRow entry={entry} groupName={groupName} groupId={groupId} />
              {i < entries.length - 1 && <Divider />}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};
