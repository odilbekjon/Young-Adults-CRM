import { describe, expect, it } from "vitest";
import { compareNames, sortByName } from "../compareNames";

const names = (items: { name?: string | null }[]) => items.map((i) => i.name);
const named = (...list: (string | null | undefined)[]) => list.map((name) => ({ name }));

describe("compareNames", () => {
  it("puts A before Z", () => {
    expect(compareNames("Alpha", "Zulu")).toBeLessThan(0);
    expect(compareNames("Zulu", "Alpha")).toBeGreaterThan(0);
  });

  it("ignores case", () => {
    expect(compareNames("apple", "Banana")).toBeLessThan(0);
    expect(compareNames("Apple", "banana")).toBeLessThan(0);
    expect(compareNames("Apple", "apple")).toBe(0);
  });

  it("counts numbers as numbers", () => {
    expect(compareNames("Group 2", "Group 10")).toBeLessThan(0);
    expect(compareNames("B1", "B12")).toBeLessThan(0);
  });

  it("ignores accents and surrounding spaces", () => {
    expect(compareNames("Eagle", "Élite")).toBeLessThan(0);
    expect(compareNames("Élite", "Zebra")).toBeLessThan(0);
    expect(compareNames("  Alpha", "Alpha")).toBe(0);
  });

  it("orders Cyrillic names by the Cyrillic alphabet", () => {
    expect(compareNames("Арбуз", "Вишня")).toBeLessThan(0);
    expect(compareNames("Вишня", "Яблоко")).toBeLessThan(0);
  });

  it("treats a missing name as empty (first)", () => {
    expect(compareNames(undefined, "A")).toBeLessThan(0);
    expect(compareNames(null, null)).toBe(0);
  });
});

describe("sortByName", () => {
  it("returns a copy ordered A to Z and leaves the original alone", () => {
    const original = named("beta 10", "Zulu", "alpha", "Beta 2");

    const sorted = sortByName(original);

    expect(names(sorted)).toEqual(["alpha", "Beta 2", "beta 10", "Zulu"]);
    expect(names(original)).toEqual(["beta 10", "Zulu", "alpha", "Beta 2"]);
  });

  it("puts nameless items first instead of failing", () => {
    expect(names(sortByName(named("B", null, "A", undefined)))).toEqual([null, undefined, "A", "B"]);
  });
});
