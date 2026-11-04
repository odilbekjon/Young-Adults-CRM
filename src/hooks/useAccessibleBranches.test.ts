import { describe, expect, it } from "vitest";
import { activeOwnBranches, pickAccessibleBranches } from "./useAccessibleBranches";

const ielts = { id: "b-ielts", name: "YA IELTS Campus", status: "ACTIVE" };
const grammar = { id: "b-grammar", name: "Grammar Campus", status: "ACTIVE" };
const closed = { id: "b-closed", name: "Closed Campus", status: "INACTIVE" };
const all = [ielts, grammar, closed];

describe("activeOwnBranches", () => {
  it("lists the account's active branches", () => {
    expect(
      activeOwnBranches([
        { branchId: ielts.id, branch: ielts },
        { branchId: closed.id, branch: closed },
      ]),
    ).toEqual([ielts]);
  });

  it("is empty without an account", () => {
    expect(activeOwnBranches(undefined)).toEqual([]);
    expect(activeOwnBranches(null)).toEqual([]);
  });
});

describe("pickAccessibleBranches", () => {
  it("gives a CEO every active branch", () => {
    expect(pickAccessibleBranches({ isCeo: true, allBranches: all, ownBranches: [], branchIds: [] })).toEqual([ielts, grammar]);
  });

  it("gives anyone else the branches named on their account, even when GET /branches lists more", () => {
    expect(pickAccessibleBranches({ isCeo: false, allBranches: all, ownBranches: [grammar], branchIds: [ielts.id] })).toEqual([grammar]);
  });

  it("falls back to GET /branches filtered by the account's branchIds when /auth/me names none", () => {
    expect(pickAccessibleBranches({ isCeo: false, allBranches: all, ownBranches: [], branchIds: [ielts.id, closed.id] })).toEqual([ielts]);
  });

  it("offers nothing to an account without branches", () => {
    expect(pickAccessibleBranches({ isCeo: false, allBranches: all, ownBranches: [], branchIds: [] })).toEqual([]);
  });
});
