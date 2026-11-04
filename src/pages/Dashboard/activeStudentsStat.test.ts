import { describe, expect, it } from "vitest";
import type { ActiveStudentCount } from "../../hooks/useActiveStudentCount";
import { activeStudentsStat } from "./activeStudentsStat";

const exact = (patch: Partial<ActiveStudentCount>): ActiveStudentCount => ({
  count: null,
  provisional: null,
  isLoading: true,
  isError: false,
  ...patch,
});

describe("activeStudentsStat", () => {
  it("shows the exact figure as it is - no estimate mark - once it is known, whatever the backend says", () => {
    expect(activeStudentsStat(exact({ count: 380, provisional: 380, isLoading: false }), { count: 412, isLoading: false })).toEqual({
      value: 380,
      loading: false,
      approximate: false,
      refining: false,
    });
  });

  it("shows an exact 0 as 0, not as 'unknown'", () => {
    expect(activeStudentsStat(exact({ count: 0, provisional: 0, isLoading: false }), { count: 40, isLoading: false })).toMatchObject({
      value: 0,
      approximate: false,
    });
  });

  it("shows the backend's figure at once, marked as an estimate that is being refined, while the exact one loads", () => {
    expect(activeStudentsStat(exact({}), { count: 412, isLoading: false })).toEqual({ value: 412, loading: false, approximate: true, refining: true });
  });

  it("prefers the memberships already read over the backend's figure", () => {
    expect(activeStudentsStat(exact({ provisional: 391 }), { count: 412, isLoading: false })).toEqual({
      value: 391,
      loading: false,
      approximate: true,
      refining: true,
    });
  });

  it("shows the provisional figure even when the backend's stats never came", () => {
    expect(activeStudentsStat(exact({ provisional: 391 }), { count: undefined, isLoading: false })).toMatchObject({ value: 391, approximate: true });
  });

  it("keeps the estimate marked, but stops 'refining', when the exact figure could not be had", () => {
    expect(activeStudentsStat(exact({ isLoading: false, isError: true }), { count: 412, isLoading: false })).toEqual({
      value: 412,
      loading: false,
      approximate: true,
      refining: false,
    });
  });

  it("shows a spinner while neither figure exists yet", () => {
    expect(activeStudentsStat(exact({}), { count: undefined, isLoading: true })).toMatchObject({ loading: true, approximate: false });
  });

  it("shows a spinner while the backend's figure is the only thing missing from a failed exact one", () => {
    expect(activeStudentsStat(exact({ isLoading: false, isError: true }), { count: undefined, isLoading: true })).toMatchObject({ loading: true });
  });

  it("shows 0 without a spinner when both figures failed (as the other tiles do)", () => {
    expect(activeStudentsStat(exact({ isLoading: false, isError: true }), { count: undefined, isLoading: false })).toEqual({
      value: 0,
      loading: false,
      approximate: false,
      refining: false,
    });
  });
});
