import { describe, expect, it } from "vitest";
import { activeOwnBranches, pickAccessibleBranches, resolveBranchSelection } from "./useAccessibleBranches";

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

  it("takes a branch whose status /auth/me leaves out as active, so a director is never left without a branch for that", () => {
    const noStatus = { id: "b-x", name: "No Status Campus" };
    expect(activeOwnBranches([{ branchId: noStatus.id, branch: noStatus as never }])).toEqual([noStatus]);
    expect(activeOwnBranches([{ branchId: ielts.id, branch: { ...ielts, status: "active" } }])).toEqual([{ ...ielts, status: "active" }]);
    expect(activeOwnBranches([{ branchId: "b-del", branch: { id: "b-del", name: "Gone", status: "DELETED" } }])).toEqual([]);
  });

  it("skips a reference without a branch to name", () => {
    expect(activeOwnBranches([{ branchId: "b-1" } as never])).toEqual([]);
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

describe("pickAccessibleBranches - last resort for an account whose branches nothing can name", () => {
  it("is off unless asked for", () => {
    expect(pickAccessibleBranches({ isCeo: false, allBranches: [], ownBranches: [], branchIds: ["b-1"] })).toEqual([]);
  });

  it("offers the branchIds under a generic name when /auth/me names no branch and GET /branches does not know them", () => {
    expect(
      pickAccessibleBranches({ isCeo: false, allBranches: [], ownBranches: [], branchIds: ["b-1"], idsOnlyFallback: true }),
    ).toEqual([{ id: "b-1", name: "Branch", status: "ACTIVE" }]);
    expect(
      pickAccessibleBranches({ isCeo: false, allBranches: [], ownBranches: [], branchIds: ["b-1", "b-2"], idsOnlyFallback: true }).map((b) => b.name),
    ).toEqual(["Branch 1", "Branch 2"]);
  });

  it("prefers the real names, and never offers a branch GET /branches lists as closed", () => {
    expect(
      pickAccessibleBranches({ isCeo: false, allBranches: all, ownBranches: [], branchIds: [ielts.id], idsOnlyFallback: true }),
    ).toEqual([ielts]);
    expect(
      pickAccessibleBranches({ isCeo: false, allBranches: all, ownBranches: [], branchIds: [closed.id], idsOnlyFallback: true }),
    ).toEqual([]);
  });

  it("changes nothing for a CEO or for an account /auth/me names branches for", () => {
    expect(pickAccessibleBranches({ isCeo: true, allBranches: all, ownBranches: [], branchIds: ["b-9"], idsOnlyFallback: true })).toEqual([ielts, grammar]);
    expect(pickAccessibleBranches({ isCeo: false, allBranches: all, ownBranches: [grammar], branchIds: ["b-9"], idsOnlyFallback: true })).toEqual([grammar]);
  });
});

describe("resolveBranchSelection", () => {
  const known = new Set(all.map((b) => b.id));
  const base = { isCeo: false, accountLoaded: true, accountFailed: false, branchListSettled: true, selectedBranchId: null as string | null, accessible: [grammar], listedBranchIds: known };

  describe("a branch director (not a CEO)", () => {
    it("gets their own branch when none is selected (a fresh login)", () => {
      expect(resolveBranchSelection(base)).toEqual({ type: "select", id: grammar.id, name: grammar.name });
    });

    it("gets their own branch instead of one left selected by an earlier session - even one GET /branches lists", () => {
      expect(resolveBranchSelection({ ...base, selectedBranchId: ielts.id })).toEqual({ type: "select", id: grammar.id, name: grammar.name });
      expect(resolveBranchSelection({ ...base, selectedBranchId: "gone-from-another-backend" })).toEqual({
        type: "select", id: grammar.id, name: grammar.name,
      });
    });

    it("keeps a selection that is theirs, whatever GET /branches says about it", () => {
      expect(resolveBranchSelection({ ...base, selectedBranchId: grammar.id })).toBeNull();
      expect(resolveBranchSelection({ ...base, selectedBranchId: grammar.id, listedBranchIds: new Set() })).toBeNull();
      expect(resolveBranchSelection({ ...base, selectedBranchId: grammar.id, listedBranchIds: undefined })).toBeNull();
    });

    it("may move between several branches of their own without being pulled back", () => {
      expect(resolveBranchSelection({ ...base, accessible: [grammar, ielts], selectedBranchId: ielts.id })).toBeNull();
    });

    it("waits while the account is loading - a valid persisted choice survives a reload", () => {
      expect(resolveBranchSelection({ ...base, accountLoaded: false, accessible: [], selectedBranchId: ielts.id })).toBeNull();
    });

    it("does not drop the selection while GET /branches, which may still name their branches, is loading", () => {
      expect(resolveBranchSelection({ ...base, branchListSettled: false, accessible: [], selectedBranchId: ielts.id })).toBeNull();
    });

    it("drops a leftover selection when the account is known to have no branch, or failed to load", () => {
      expect(resolveBranchSelection({ ...base, accessible: [], selectedBranchId: ielts.id })).toEqual({ type: "clear" });
      expect(resolveBranchSelection({ ...base, accountLoaded: false, accountFailed: true, accessible: [], selectedBranchId: ielts.id })).toEqual({ type: "clear" });
      expect(resolveBranchSelection({ ...base, accessible: [], selectedBranchId: null })).toBeNull();
    });
  });

  describe("a CEO", () => {
    const ceo = { ...base, isCeo: true, accessible: [ielts, grammar] };

    it("is left on 'All branches' or on any branch that exists", () => {
      expect(resolveBranchSelection({ ...ceo, selectedBranchId: null })).toBeNull();
      expect(resolveBranchSelection({ ...ceo, selectedBranchId: ielts.id })).toBeNull();
    });

    it("falls back to 'All branches' when the selected branch no longer exists", () => {
      expect(resolveBranchSelection({ ...ceo, selectedBranchId: "deleted" })).toEqual({ type: "clear" });
    });

    it("does not judge a selection before GET /branches has answered", () => {
      expect(resolveBranchSelection({ ...ceo, selectedBranchId: "deleted", listedBranchIds: undefined })).toBeNull();
    });
  });
});
