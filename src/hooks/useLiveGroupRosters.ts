import { useEffect, useMemo, useState } from "react";
import { useLazyStudentGroupsQuery } from "../app/api/groupsApi";
import type { Group, StudentGroupRecord } from "../app/api/groupsApi/types";
import { useAllStudentGroups } from "./useAllStudentGroups";

export interface RosterStudent {
  id: string;
  name: string;
  phone: string;
}

const isLiveMembership = (m: { status: string }) => m.status !== "INACTIVE" && m.status !== "DELETED";

// Who is in a group right now. GET /groups' own `students` list keeps naming a
// student after they left the group or were archived, so it is corrected with the
// memberships (GET /student-groups), the same way the group's own page does it:
//   - a listed student whose membership in THIS group is archived (INACTIVE /
//     DELETED) is dropped, unless a live membership says they are back in it;
//   - a live member the list does not name yet (just added) is put in;
//   - a listed student no membership row accounts for stays.
// Trial and frozen members are still members; only archived ones are out.
export const liveRosterOf = (
  group: Pick<Group, "id" | "students">,
  liveRows: StudentGroupRecord[],
  archivedKeys: Set<string>,
): RosterStudent[] => {
  const live = liveRows.filter((r) => r.studentId && isLiveMembership(r) && (!r.groupId || r.groupId === group.id));
  const liveIds = new Set(live.map((r) => r.studentId));
  const roster: RosterStudent[] = (group.students ?? [])
    .filter((s) => liveIds.has(s.id) || !archivedKeys.has(`${s.id}|${group.id}`))
    .map((s) => ({ id: s.id, name: s.name, phone: s.phone }));
  const listed = new Set(roster.map((s) => s.id));
  live.forEach((r) => {
    if (listed.has(r.studentId)) return;
    listed.add(r.studentId);
    roster.push({ id: r.studentId, name: r.studentName || "—", phone: r.studentPhone || "" });
  });
  return roster;
};

// The current roster of each of `groups`, by group id (see liveRosterOf). The
// archived memberships are the branch-wide lists the group page reads too (one
// cached copy); the live ones are asked for per group, which is why this is meant
// for a handful of groups (one teacher's), not for the whole Groups list.
export const useLiveGroupRosters = (groups: Group[], skip = false): Map<string, RosterStudent[]> => {
  const { rows: inactiveRows } = useAllStudentGroups("INACTIVE", 500, skip);
  const { rows: deletedRows } = useAllStudentGroups("DELETED", 500, skip);
  const [fetchMemberships] = useLazyStudentGroupsQuery();
  const [liveByGroup, setLiveByGroup] = useState<Record<string, StudentGroupRecord[]>>({});

  const idsKey = groups.map((g) => g.id).join("|");

  useEffect(() => {
    if (skip || !idsKey) return;
    let cancelled = false;
    idsKey.split("|").forEach((groupId) => {
      // Same arguments as the group page's own roster query, so a cached copy is reused.
      fetchMemberships({ groupId, limit: 500 }, true).unwrap().then(
        (res) => { if (!cancelled) setLiveByGroup((prev) => ({ ...prev, [groupId]: res.rows })); },
        () => { /* without it the archived lists alone still decide */ },
      );
    });
    return () => { cancelled = true; };
  }, [idsKey, skip, fetchMemberships]);

  const archivedKeys = useMemo(() => {
    const set = new Set<string>();
    [...inactiveRows, ...deletedRows].forEach((r) => {
      if (r.studentId && r.groupId) set.add(`${r.studentId}|${r.groupId}`);
    });
    return set;
  }, [inactiveRows, deletedRows]);

  return useMemo(
    () => new Map(groups.map((g) => [g.id, liveRosterOf(g, liveByGroup[g.id] ?? [], archivedKeys)])),
    [groups, liveByGroup, archivedKeys],
  );
};
