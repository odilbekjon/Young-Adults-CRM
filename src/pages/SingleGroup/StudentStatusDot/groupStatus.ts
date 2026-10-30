import type { StudentGroupStatus } from "../../../app/api/groupsApi/types";

const GROUP_STATUSES: readonly string[] = ["PROBATION", "ACTIVE", "FROZEN", "INACTIVE", "DELETED"];

// A member's status in THIS group (GET /groups/{id} studentGroupStatus, GET
// /student-groups status). Anything the app doesn't know comes back undefined,
// so it is never mistaken for one of the five.
export const toGroupStatus = (raw?: string | null): StudentGroupStatus | undefined =>
  GROUP_STATUSES.includes(raw ?? "") ? (raw as StudentGroupStatus) : undefined;

const ARCHIVED_STYLE = {
  labelKey: "singleGroup.studentHoverCard.groupStatus.archived",
  background: "var(--color-surface-alt)",
  color: "var(--color-text-secondary)",
};

// Colours and label of each status, shared by the roster (a tinted name for a
// trial lesson / a frozen member) and the hover card (a chip for every status):
// PROBATION is light sky-blue, FROZEN dark blue. Dark text on the light blue and
// white on the dark one stay readable in both themes.
export const GROUP_STATUS_STYLE: Record<StudentGroupStatus, { labelKey: string; background: string; color: string }> = {
  PROBATION: { labelKey: "singleGroup.studentHoverCard.groupStatus.probation", background: "#bfe3fa", color: "#1a2332" },
  ACTIVE: { labelKey: "singleGroup.studentHoverCard.groupStatus.active", background: "var(--color-success-border)", color: "var(--color-success-text)" },
  FROZEN: { labelKey: "singleGroup.studentHoverCard.groupStatus.frozen", background: "#1e4d8c", color: "#ffffff" },
  INACTIVE: ARCHIVED_STYLE,
  DELETED: ARCHIVED_STYLE,
};
