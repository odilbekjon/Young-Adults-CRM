import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseApi } from "../../app/api/baseApi";
import { store } from "../../app/store";
import { setSelectedBranchId } from "../../app/store/branchSlice";
import { stubFetch } from "../../test/fetchStub";
import { answerWith, IELTS_GROUP, renderGroups } from "./groupsTestKit";

// Each test renders the whole page (MUI table, drawer, selects) - slow enough to
// brush the default 5 s when the suite runs in parallel.
vi.setConfig({ testTimeout: 20_000 });

const group = (id: string, name: string, extra: Record<string, unknown> = {}) => ({ ...IELTS_GROUP, id, name, ...extra });

// In the order a server might send them: neither alphabetical nor by number.
const FROM_SERVER = [
  group("g1", "beta 10"),
  group("g2", "Zulu"),
  group("g3", "alpha"),
  group("g4", "Beta 2"),
  group("g5", "Alpha 1"),
];

// The names in the table, top to bottom.
const names = () =>
  Array.from(document.querySelectorAll("tbody tr"))
    .map((row) => row.querySelectorAll("td")[1]?.textContent ?? "")
    .filter(Boolean);

const AZ = ["alpha", "Alpha 1", "Beta 2", "beta 10", "Zulu"];

beforeEach(() => {
  sessionStorage.clear();
  store.dispatch(baseApi.util.resetApiState());
  store.dispatch(setSelectedBranchId(null));
});

describe("Groups: listed in alphabetical order", () => {
  it("is A to Z by name - ignoring case, numbers counted as numbers - whatever order the server sends", async () => {
    stubFetch(answerWith(FROM_SERVER));
    renderGroups();

    await screen.findByText("Zulu");

    expect(names()).toEqual(AZ);
  });

  it("also when the saved sort of an older tab is empty", async () => {
    sessionStorage.setItem("ya-crm:state:groups:sortKey", JSON.stringify(""));
    stubFetch(answerWith(FROM_SERVER));
    renderGroups();

    await screen.findByText("Zulu");

    expect(names()).toEqual(AZ);
  });

  it("the Group header reverses it (Z to A) and back", async () => {
    stubFetch(answerWith(FROM_SERVER));
    renderGroups();
    await screen.findByText("Zulu");

    fireEvent.click(screen.getByText("Group"));
    await waitFor(() => expect(names()).toEqual([...AZ].reverse()));

    fireEvent.click(screen.getByText("Group"));
    await waitFor(() => expect(names()).toEqual(AZ));
  });

  it("sorting by another column keeps groups that tie on it in alphabetical order", async () => {
    const dayShift = (name: string, id: string, students: number) =>
      group(id, name, { students: Array.from({ length: students }, (_, i) => ({ id: `${id}-s${i}` })) });
    stubFetch(answerWith([dayShift("Delta", "d", 1), dayShift("Charlie", "c", 2), dayShift("Bravo", "b", 1), dayShift("Alpha", "a", 2)]));
    renderGroups();
    await screen.findByText("Delta");

    fireEvent.click(screen.getByText("Students"));

    // fewest students first; the two groups of each size stay A to Z
    await waitFor(() => expect(names()).toEqual(["Bravo", "Delta", "Alpha", "Charlie"]));
  });

  it("numbers the rows in the order shown", async () => {
    stubFetch(answerWith(FROM_SERVER));
    renderGroups();
    await screen.findByText("Zulu");

    const firstCells = Array.from(document.querySelectorAll("tbody tr")).map((row) => row.querySelector("td")?.textContent);
    expect(firstCells).toEqual(["1.", "2.", "3.", "4.", "5."]);
    expect(names()[0]).toBe("alpha");
  });
});
