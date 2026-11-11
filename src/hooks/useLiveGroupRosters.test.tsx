import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Group, StudentGroupRecord } from "../app/api/groupsApi/types";
import { createTestStore } from "../test/testStore";
import { jsonResponse, stubFetch, type SentRequest } from "../test/fetchStub";
import { liveRosterOf, useLiveGroupRosters } from "./useLiveGroupRosters";

const student = (id: string) => ({ id, name: `Student ${id}`, phone: `+99890000000${id}`, role: "STUDENT", photo: null });
const groupOf = (id: string, studentIds: string[]) => ({ id, students: studentIds.map(student) }) as unknown as Group;
const row = (studentId: string, groupId: string, status: string) =>
  ({ id: `${studentId}-${groupId}-${status}`, studentId, studentName: `Student ${studentId}`, studentPhone: "", groupId, status }) as unknown as StudentGroupRecord;
const idsOf = (roster: Array<{ id: string }> | undefined) => (roster ?? []).map((s) => s.id);

describe("liveRosterOf", () => {
  it("drops a listed student whose membership in this group is archived", () => {
    const roster = liveRosterOf(groupOf("g1", ["1", "2", "3"]), [row("1", "g1", "ACTIVE")], new Set(["2|g1"]));
    expect(idsOf(roster)).toEqual(["1", "3"]);
  });

  it("does not drop a student archived in another group only", () => {
    expect(idsOf(liveRosterOf(groupOf("g1", ["1"]), [], new Set(["1|g2"])))).toEqual(["1"]);
  });

  it("keeps a student who was removed and later added back", () => {
    const roster = liveRosterOf(groupOf("g1", ["1"]), [row("1", "g1", "ACTIVE")], new Set(["1|g1"]));
    expect(idsOf(roster)).toEqual(["1"]);
  });

  it("counts trial and frozen members, and adds a live member the list does not name yet", () => {
    const roster = liveRosterOf(groupOf("g1", ["1"]), [row("1", "g1", "FROZEN"), row("2", "g1", "PROBATION")], new Set());
    expect(idsOf(roster)).toEqual(["1", "2"]);
  });

  it("ignores archived rows and rows of another group among the live ones", () => {
    const roster = liveRosterOf(groupOf("g1", []), [row("1", "g1", "INACTIVE"), row("2", "g2", "ACTIVE"), row("3", "g1", "DELETED")], new Set());
    expect(roster).toEqual([]);
  });
});

describe("useLiveGroupRosters", () => {
  const paramsOf = (request: SentRequest) => new URL(request.url).searchParams;

  it("gives each group its roster without the archived members", async () => {
    const groups = [groupOf("g1", ["1", "2"]), groupOf("g2", ["2", "3"])];
    const store = createTestStore();
    const { requests } = stubFetch((request) => {
      const q = paramsOf(request);
      const status = q.get("status");
      const groupId = q.get("groupId");
      if (status === "INACTIVE") return jsonResponse({ data: [row("2", "g1", "INACTIVE")], meta: { totalPages: 1 } });
      if (status === "DELETED") return jsonResponse({ data: [row("3", "g2", "DELETED")], meta: { totalPages: 1 } });
      if (groupId === "g1") return jsonResponse({ data: [row("1", "g1", "ACTIVE")], meta: { totalPages: 1 } });
      return jsonResponse({ data: [row("2", "g2", "ACTIVE")], meta: { totalPages: 1 } });
    });
    const wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;
    const { result } = renderHook(() => useLiveGroupRosters(groups), { wrapper });

    await waitFor(() => {
      expect(idsOf(result.current.get("g1"))).toEqual(["1"]);
      expect(idsOf(result.current.get("g2"))).toEqual(["2"]);
    });
    expect(requests.every((r) => r.url.includes("/student-groups?"))).toBe(true);
  });

  it("sends no request when skipped", async () => {
    const groups = [groupOf("g1", ["1"])];
    const store = createTestStore();
    const { requests } = stubFetch(() => jsonResponse({ data: [] }));
    const wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;
    const { result } = renderHook(() => useLiveGroupRosters(groups, true), { wrapper });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(requests).toHaveLength(0);
    expect(idsOf(result.current.get("g1"))).toEqual(["1"]);
  });
});
