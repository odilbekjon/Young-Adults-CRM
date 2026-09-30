import { Box, CircularProgress, Stack, Typography } from "@mui/material";
import { MdOutlinePerson } from "react-icons/md";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";
import { useGroupHistoryQuery } from "../../../app/api/groupsApi";
import type { GroupHistoryEntry } from "../../../app/api/groupsApi/types";

interface Props {
  groupId: string;
  groupName: string;
}

const LINK_COLOR = "#185FA5";
const MUTED = "#8a8a8a";

const humanize = (raw: string) => {
  const words = raw
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_\-.]+/g, " ")
    .trim()
    .toLowerCase();
  return words ? words[0].toUpperCase() + words.slice(1) : "";
};

// Backend gives an ISO timestamp, shown as DD.MM.YYYY HH:mm:ss (24h). An
// unparsable value is shown as-is instead of "Invalid Date".
const formatStamp = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

const linkSx = { color: LINK_COLOR, textDecoration: "none", "&:hover": { textDecoration: "underline" } };

const HistoryEntryRow = ({
  entry,
  groupId,
  groupName,
}: {
  entry: GroupHistoryEntry;
  groupId: string;
  groupName: string;
}) => {
  const { t } = useTranslation();

  const title = t(`singleGroup.tabs.history.types.${entry.type}`, {
    defaultValue: humanize(entry.type) || "—",
  });

  const statusLabel = (status: string) =>
    t(`singleGroup.tabs.history.statuses.${status.toUpperCase()}`, {
      defaultValue: humanize(status) || status,
    });

  const changeLabel = (key: string, fallback: string) =>
    /^[A-Za-z0-9_]+$/.test(key)
      ? t(`singleGroup.tabs.history.fields.${key}`, { defaultValue: fallback })
      : fallback;

  const targetGroupId = entry.groupId ?? groupId;
  const targetGroupName = entry.groupName ?? groupName;
  // Raw UUIDs are noise — show the group's code, or a short numeric id.
  const groupCode = entry.groupCode ?? (entry.groupId && entry.groupId.length <= 8 ? entry.groupId : null);
  const hasStudent = !!(entry.studentName || entry.studentPhone);
  const tr = entry.transition;

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 3,
        py: 3.5,
        borderBottom: "1px solid #e8e8e8",
        "&:last-of-type": { borderBottom: "none" },
      }}
    >
      <Stack spacing={1} sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ fontSize: 20, lineHeight: 1.25, color: "#1f1f1f" }}>{title}</Typography>

        {hasStudent && (
          <Stack direction="row" alignItems="center" spacing={0.75} flexWrap="wrap" sx={{ fontSize: 14 }}>
            <MdOutlinePerson size={16} color={MUTED} style={{ flexShrink: 0 }} />
            {entry.studentName &&
              (entry.studentId ? (
                <Box component={RouterLink} to={`/students/${entry.studentId}`} sx={linkSx}>
                  {entry.studentName}
                </Box>
              ) : (
                <Box component="span" sx={{ color: LINK_COLOR }}>
                  {entry.studentName}
                </Box>
              ))}
            {entry.studentName && entry.studentPhone && <Box component="span" sx={{ color: "#555" }}>•</Box>}
            {entry.studentPhone && (
              <Box component="span" sx={{ color: LINK_COLOR }}>
                {entry.studentPhone}
              </Box>
            )}
          </Stack>
        )}

        {targetGroupName && (
          <Typography sx={{ fontSize: 14, color: "#1f1f1f" }}>
            {t("singleGroup.tabs.history.groupName")}:{" "}
            {targetGroupId ? (
              <Box component={RouterLink} to={`/groups/${targetGroupId}`} sx={linkSx}>
                {targetGroupName}
              </Box>
            ) : (
              <Box component="span" sx={{ color: LINK_COLOR }}>
                {targetGroupName}
              </Box>
            )}
          </Typography>
        )}

        {groupCode && (
          <Typography sx={{ fontSize: 14, color: "#1f1f1f" }}>
            {t("singleGroup.tabs.history.group")}:{" "}
            <Box component={RouterLink} to={`/groups/${targetGroupId}`} sx={linkSx}>
              #{groupCode}
            </Box>
          </Typography>
        )}

        {entry.detail && (
          <Typography sx={{ fontSize: 14, color: "#1f1f1f" }}>{entry.detail}</Typography>
        )}

        {tr && (tr.from || tr.to) && (
          <Typography sx={{ fontSize: 14, color: "#1f1f1f" }}>
            {tr.from && tr.to ? (
              <>
                {statusLabel(tr.from)} {"=>"} {statusLabel(tr.to)}
              </>
            ) : (
              <>
                {humanize("status")}:{" "}
                <Box component="span" sx={{ color: MUTED }}>
                  {statusLabel((tr.to ?? tr.from) as string)}
                </Box>
              </>
            )}
          </Typography>
        )}

        {entry.activatedFrom && (
          <Typography sx={{ fontSize: 14, color: "#1f1f1f" }}>
            {t("singleGroup.tabs.history.activatedFrom")}:{" "}
            <Box component="span" sx={{ color: MUTED }}>
              {entry.activatedFrom}
            </Box>
          </Typography>
        )}

        {entry.changes.map((c, i) => (
          <Typography key={`${c.key}-${i}`} sx={{ fontSize: 14, color: "#1f1f1f" }}>
            {c.label ? `${changeLabel(c.key, c.label)}: ` : ""}
            <Box component="span" sx={{ color: MUTED }}>
              {c.from ? `${c.from} => ${c.value}` : c.value}
            </Box>
          </Typography>
        ))}
      </Stack>

      <Box sx={{ textAlign: "right", flexShrink: 0, fontSize: 14, color: MUTED, lineHeight: 1.6 }}>
        {entry.createdAt && <div>{formatStamp(entry.createdAt)}</div>}
        {entry.actor && <div>{entry.actor}</div>}
      </Box>
    </Box>
  );
};

export const History = ({ groupId, groupName }: Props) => {
  const { t } = useTranslation();
  const { data: entries, isLoading, isError } = useGroupHistoryQuery(groupId, { skip: !groupId });

  return (
    <Box>
      <Typography variant="h6" fontWeight={600} mb={1}>
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
        <Box sx={{ bgcolor: "#fff" }}>
          {entries.map((entry) => (
            <HistoryEntryRow key={entry.id} entry={entry} groupId={groupId} groupName={groupName} />
          ))}
        </Box>
      )}
    </Box>
  );
};
