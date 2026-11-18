import { describe, expect, it } from "vitest";
import { readGroupDebtor } from "../groupDebt";

describe("readGroupDebtor", () => {
  it("reads buQarzmi and its aliases", () => {
    expect(readGroupDebtor({ buQarzmi: true })).toBe(true);
    expect(readGroupDebtor({ buQarzmi: false })).toBe(false);
    expect(readGroupDebtor({ hasDebt: true })).toBe(true);
    expect(readGroupDebtor({ isDebtor: false })).toBe(false);
    expect(readGroupDebtor({ isDebt: true })).toBe(true);
  });

  it("lets the flag win over the amount", () => {
    expect(readGroupDebtor({ buQarzmi: false, debt: 400000 })).toBe(false);
    expect(readGroupDebtor({ buQarzmi: true, debt: 0 })).toBe(true);
  });

  it("falls back to the debt amount (number, string or decimal.js object)", () => {
    expect(readGroupDebtor({ debt: 400000 })).toBe(true);
    expect(readGroupDebtor({ debtAmount: "0" })).toBe(false);
    expect(readGroupDebtor({ groupDebt: { s: 1, e: 5, d: [250000] } })).toBe(true);
  });

  it("ignores the account-wide balance entirely", () => {
    expect(readGroupDebtor({ balance: -999999 })).toBeNull();
  });

  it("is null when no source says anything", () => {
    expect(readGroupDebtor({})).toBeNull();
    expect(readGroupDebtor(null, undefined)).toBeNull();
    expect(readGroupDebtor({ debt: null, buQarzmi: "yes" })).toBeNull();
  });

  it("tries each source in order and takes the first that says anything", () => {
    expect(readGroupDebtor({ name: "row" }, { buQarzmi: true })).toBe(true);
    expect(readGroupDebtor({ buQarzmi: false }, { buQarzmi: true })).toBe(false);
  });
});
