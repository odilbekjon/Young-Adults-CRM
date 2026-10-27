import { Box, Chip, CircularProgress, Stack, Typography } from "@mui/material";
import { MdOutlineComputer, MdOutlinePerson } from "react-icons/md";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";
import { useStudentHistoryQuery } from "../../../app/api/studentsApi";
import type { StudentHistoryEntry } from "../../../app/api/studentsApi/types";

const LINK_COLOR = "#185FA5";
const MUTED = "var(--color-text-muted)";

// Machine names ("STATUS_CHANGED") are translated, anything else is a sentence
// the backend already wrote. i18next also reads "." in a key as nesting, so
// only plain keys are looked up.
const MACHINE_KEY = /^[A-Z][A-Z0-9_]*$/;
const PLAIN_KEY = /^[A-Za-z0-9_]+$/;

const humanize = (raw: string) => {
  const words = raw
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_\-.]+/g, " ")
    .trim()
    .toLowerCase();
  return words ? words[0].toUpperCase() + words.slice(1) : "";
};

// Backend gives an ISO timestamp, shown as DD.MM.YYYY HH:mm:ss (24h) like the
// group and teacher history. An unparsable value is shown as-is.
const formatStamp = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

const linkSx = { color: LINK_COLOR, textDecoration: "none", "&:hover": { textDecoration: "underline" } };
const lineSx = { fontSize: 14, color: "var(--color-text-primary)" };
const centeredSx = { padding: 32, textAlign: "center", fontSize: 14 } as const;

const HistoryItem = ({ entry }: { entry: StudentHistoryEntry }) => {
  const { t } = useTranslation();

  const translate = (path: string, value: string) =>
    PLAIN_KEY.test(value) ? t(`${path}.${value}`, { defaultValue: humanize(value) }) : value;

  const label =
    entry.title && !MACHINE_KEY.test(entry.title)
      ? entry.title
      : translate("singleGroup.tabs.history.types", entry.title || entry.type);
  const statusLabel = (status: string) => translate("singleGroup.tabs.history.statuses", status.toUpperCase());
  const groupCode = entry.groupCode ?? (entry.groupId && entry.groupId.length <= 8 ? entry.groupId : null);
  const tr = entry.transition;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 1.5,
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "10px",
        px: 2,
        py: 1.5,
      }}
    >
      <Stack spacing={0.75} sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ fontSize: 15, lineHeight: 1.4, color: "var(--color-text-primary)", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
          {label || entry.detail || "—"}
        </Typography>

        {(entry.kind || entry.category) && (
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            {entry.kind && (
              <Chip size="small" variant="outlined" label={`${t("studentHistory.type")}: ${translate("studentHistory.types", entry.kind)}`} />
            )}
            {entry.category && (
              <Chip size="small" variant="outlined" label={`${t("studentHistory.category")}: ${translate("studentHistory.categories", entry.category)}`} />
            )}
          </Stack>
        )}

        {entry.groupName && (
          <Typography sx={lineSx}>
            {t("singleGroup.tabs.history.groupName")}:{" "}
            {entry.groupId ? (
              <Box component={RouterLink} to={`/groups/${entry.groupId}`} sx={linkSx}>
                {entry.groupName}
              </Box>
            ) : (
              <Box component="span" sx={{ color: LINK_COLOR }}>
                {entry.groupName}
              </Box>
            )}
          </Typography>
        )}

        {groupCode && entry.groupId && (
          <Typography sx={lineSx}>
            {t("singleGroup.tabs.history.group")}:{" "}
            <Box component={RouterLink} to={`/groups/${entry.groupId}`} sx={linkSx}>
              #{groupCode}
            </Box>
          </Typography>
        )}

        {label && entry.detail && <Typography sx={{ ...lineSx, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{entry.detail}</Typography>}

        {tr && (tr.from || tr.to) && (
          <Typography sx={lineSx}>
            {tr.from && tr.to ? (
              <>
                {statusLabel(tr.from)} {"=>"} {statusLabel(tr.to)}
              </>
            ) : (
              <>
                {t("singleGroup.tabs.history.fields.status", { defaultValue: "Status" })}:{" "}
                <Box component="span" sx={{ color: MUTED }}>
                  {statusLabel((tr.to ?? tr.from) as string)}
                </Box>
              </>
            )}
          </Typography>
        )}

        {entry.activatedFrom && (
          <Typography sx={lineSx}>
            {t("singleGroup.tabs.history.activatedFrom")}:{" "}
            <Box component="span" sx={{ color: MUTED }}>
              {entry.activatedFrom}
            </Box>
          </Typography>
        )}

        {entry.changes.map((c, i) => (
          <Typography key={`${c.key}-${i}`} sx={{ ...lineSx, overflowWrap: "anywhere" }}>
            {c.label ? `${PLAIN_KEY.test(c.key) ? t(`singleGroup.tabs.history.fields.${c.key}`, { defaultValue: c.label }) : c.label}: ` : ""}
            <Box component="span" sx={{ color: MUTED }}>
              {c.from ? `${c.from} => ${c.value}` : c.value}
            </Box>
          </Typography>
        ))}
      </Stack>

      <Stack spacing={0.25} sx={{ flexShrink: 0, alignItems: { xs: "flex-start", sm: "flex-end" }, fontSize: 13, color: MUTED }}>
        {entry.createdAt && <Box sx={{ color: "var(--color-text-secondary)", fontWeight: 500 }}>{formatStamp(entry.createdAt)}</Box>}
        {entry.actor && (
          <Stack direction="row" alignItems="center" spacing={0.5} title={t("studentHistory.performedBy")}>
            <MdOutlinePerson size={15} style={{ flexShrink: 0 }} />
            <span>{entry.actor}</span>
          </Stack>
        )}
        {entry.device && (
          <Stack direction="row" alignItems="center" spacing={0.5} title={t("studentHistory.device")}>
            <MdOutlineComputer size={15} style={{ flexShrink: 0 }} />
            <span>{entry.device}</span>
          </Stack>
        )}
      </Stack>
    </Box>
  );
};

// Mounted only while the History tab is open, so the request is not sent for
// a tab the staff member never looks at.
export const StudentHistoryTab = ({ studentId }: { studentId: string }) => {
  const { t } = useTranslation();
  const { data: entries, isLoading, isError } = useStudentHistoryQuery(studentId, { refetchOnMountOrArgChange: true });

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress size={26} />
      </Box>
    );
  }
  if (isError) {
    return <div style={{ ...centeredSx, color: "#ef4444" }}>{t("studentHistory.loadError")}</div>;
  }
  if (!entries || entries.length === 0) {
    return <div style={{ ...centeredSx, color: MUTED }}>{t("studentHistory.emptyState")}</div>;
  }

  return (
    <Stack spacing={1.25}>
      {entries.map((entry) => (
        <HistoryItem key={entry.id} entry={entry} />
      ))}
    </Stack>
  );
};
