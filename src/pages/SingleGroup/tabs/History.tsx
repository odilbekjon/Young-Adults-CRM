import { Box, Divider, Stack, Typography } from "@mui/material";
import { MdOutlinePerson } from "react-icons/md";
import { useTranslation } from "react-i18next";
import { Student } from "../../../types/group";

interface Props {
  groupId: number;
  groupName: string;
  students?: Student[];
}

type HistoryEntry = {
  id: number;
  title: string;
  studentName?: string;
  studentPhone?: string;
  groupName: string;
  groupId: number;
  detail: string;
  timestamp: string;
  modifiedBy: string;
};

const buildMockHistory = (
  groupId: number,
  groupName: string,
  students: Student[]
): HistoryEntry[] => {
  const s0 = students[0];
  const s1 = students[1];

  return [
    {
      id: 1,
      title: "Status changed",
      studentName: s0?.name ?? "To'raqulova Zarina 2",
      studentPhone: s0?.phone ?? "(93) 928-88-12",
      groupName,
      groupId,
      detail: "Activated from: 2026-05-29",
      timestamp: "29.05.2026 18:32:23",
      modifiedBy: "Maksuda Abraykulova",
    },
    {
      id: 2,
      title: "Status changed",
      studentName: s1?.name ?? "Baratova Ruxshona",
      studentPhone: s1?.phone ?? "(99) 669-60-59",
      groupName,
      groupId,
      detail: "Active (Learns) => Archived",
      timestamp: "28.05.2026 14:15:08",
      modifiedBy: "Maksuda Abraykulova",
    },
    {
      id: 3,
      title: "Status changed",
      studentName: students[2]?.name ?? "Do'stnayeva Dilnura",
      studentPhone: students[2]?.phone ?? "(90) 111-22-33",
      groupName,
      groupId,
      detail: "Archived => Active (Learns)",
      timestamp: "27.05.2026 09:44:51",
      modifiedBy: "Admin User",
    },
  ];
};

const HistoryEntryRow = ({ entry }: { entry: HistoryEntry }) => {
  const { t } = useTranslation();
  return (
  <Box
    sx={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 3,
      py: 2.5,
      px: 0.5,
    }}
  >
    <Stack spacing={0.75} sx={{ minWidth: 0, flex: 1 }}>
      <Typography fontWeight={700} fontSize={15}>
        {entry.title}
      </Typography>

      {(entry.studentName || entry.studentPhone) && (
        <Stack direction="row" alignItems="center" spacing={0.75} flexWrap="wrap">
          <MdOutlinePerson size={16} color="#757575" />
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
        <Box component="span" sx={{ color: "#1976d2" }}>
          {entry.groupName}
        </Box>
      </Typography>

      <Typography fontSize={13} color="text.primary">
        {t("singleGroup.tabs.history.group")}:{" "}
        <Box component="span" sx={{ color: "#1976d2" }}>
          #{entry.groupId}
        </Box>
      </Typography>

      <Typography fontSize={13} color="text.primary">
        {entry.detail}
      </Typography>
    </Stack>

    <Stack spacing={0.5} alignItems="flex-end" sx={{ flexShrink: 0 }}>
      <Typography fontSize={12} color="text.secondary" whiteSpace="nowrap">
        {entry.timestamp}
      </Typography>
      <Typography fontSize={12} color="text.secondary" textAlign="right">
        {entry.modifiedBy}
      </Typography>
    </Stack>
  </Box>
  );
};

export const History = ({ groupId, groupName, students = [] }: Props) => {
  const { t } = useTranslation();
  const entries = buildMockHistory(groupId, groupName, students);

  return (
    <Box>
      <Typography variant="h6" fontWeight={600} mb={2}>
        {t("singleGroup.tabs.history.title")}
      </Typography>

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
            <HistoryEntryRow entry={entry} />
            {i < entries.length - 1 && <Divider />}
          </Box>
        ))}
      </Box>
    </Box>
  );
};
