import { describe, expect, it } from "vitest";
import { BALANCE_STATUS_COLOR, classifyBalance, formatUZS, getBalanceColor } from "../balance";

describe("classifyBalance", () => {
  it("calls a negative balance a debt", () => {
    expect(classifyBalance(-1)).toBe("debtor");
    expect(classifyBalance(-250000)).toBe("debtor");
  });

  it("calls a positive balance a credit", () => {
    expect(classifyBalance(1)).toBe("creditor");
    expect(classifyBalance(0.01)).toBe("creditor");
  });

  it("calls zero, a missing balance and negative zero paid", () => {
    expect(classifyBalance(0)).toBe("paid");
    expect(classifyBalance(-0)).toBe("paid");
    expect(classifyBalance(null)).toBe("paid");
    expect(classifyBalance(undefined)).toBe("paid");
  });
});

describe("getBalanceColor", () => {
  it("maps each status to its own colour token", () => {
    expect(getBalanceColor(-5)).toBe(BALANCE_STATUS_COLOR.debtor);
    expect(getBalanceColor(5)).toBe(BALANCE_STATUS_COLOR.creditor);
    expect(getBalanceColor(0)).toBe(BALANCE_STATUS_COLOR.paid);
    expect(getBalanceColor(null)).toBe(BALANCE_STATUS_COLOR.paid);
  });

  it("uses a distinct colour for each status", () => {
    expect(new Set(Object.values(BALANCE_STATUS_COLOR)).size).toBe(3);
  });
});

describe("formatUZS", () => {
  it("groups thousands and appends the currency", () => {
    // The group separator depends on the ICU data (space or comma), so only its presence is checked.
    expect(formatUZS(1500000)).toMatch(/^1[\s,.]?500[\s,.]?000 UZS$/);
    expect(formatUZS(500)).toBe("500 UZS");
  });

  it("shows zero for a missing amount", () => {
    expect(formatUZS(null)).toBe("0 UZS");
    expect(formatUZS(undefined)).toBe("0 UZS");
    expect(formatUZS(0)).toBe("0 UZS");
  });

  it("keeps the sign of a debt", () => {
    expect(formatUZS(-2000)).toMatch(/^-2[\s,.]?000 UZS$/);
  });
});
