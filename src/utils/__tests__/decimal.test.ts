import { describe, expect, it } from "vitest";
import { decimalToNumber } from "../decimal";

// decimal.js stores digits in base-1e7 words: the first word holds
// (e mod 7) + 1 digits, every later word exactly 7.
const decimalJs = (s: 1 | -1, e: number, d: number[]) => ({ s, e, d });

describe("decimalToNumber", () => {
  describe("plain values", () => {
    it("passes finite numbers through", () => {
      expect(decimalToNumber(150000)).toBe(150000);
      expect(decimalToNumber(0)).toBe(0);
      expect(decimalToNumber(-12.5)).toBe(-12.5);
    });

    it("parses numeric strings", () => {
      expect(decimalToNumber("150000")).toBe(150000);
      expect(decimalToNumber("12.5")).toBe(12.5);
      expect(decimalToNumber(" 42 ")).toBe(42);
    });

    it("rejects empty, blank and non-numeric strings and non-finite numbers", () => {
      expect(decimalToNumber("")).toBeNull();
      expect(decimalToNumber("   ")).toBeNull();
      expect(decimalToNumber("abc")).toBeNull();
      expect(decimalToNumber(Number.NaN)).toBeNull();
      expect(decimalToNumber(Infinity)).toBeNull();
    });

    it("rejects values that are not numeric at all", () => {
      expect(decimalToNumber(null)).toBeNull();
      expect(decimalToNumber(undefined)).toBeNull();
      expect(decimalToNumber(true)).toBeNull();
      expect(decimalToNumber([])).toBeNull();
    });
  });

  describe("decimal.js objects", () => {
    it("reads a whole number held in one word", () => {
      expect(decimalToNumber(decimalJs(1, 5, [150000]))).toBe(150000);
      expect(decimalToNumber(decimalJs(1, 3, [1234]))).toBe(1234);
    });

    it("reads a number above 10 000 000, which spans several words (reading d[0] alone would give 1)", () => {
      // 12 000 000 -> e = 7, words [1, 2000000]
      expect(decimalToNumber(decimalJs(1, 7, [1, 2000000]))).toBe(12000000);
      // 1 234 567 890 -> e = 9, so the first word holds 3 digits: [123, 4567890]
      expect(decimalToNumber(decimalJs(1, 9, [123, 4567890]))).toBe(1234567890);
    });

    it("pads every later word to 7 digits", () => {
      // 10 000 005 -> e = 7, words [1, 5] means 1|0000005
      expect(decimalToNumber(decimalJs(1, 7, [1, 5]))).toBe(10000005);
    });

    it("reads fractions", () => {
      // 12345678.9 -> e = 7, words [1, 2345678, 9000000]
      expect(decimalToNumber(decimalJs(1, 7, [1, 2345678, 9000000]))).toBe(12345678.9);
      // 0.5 -> e = -1, words [5000000]
      expect(decimalToNumber(decimalJs(1, -1, [5000000]))).toBe(0.5);
    });

    it("applies the sign", () => {
      expect(decimalToNumber(decimalJs(-1, 5, [150000]))).toBe(-150000);
      expect(decimalToNumber(decimalJs(-1, 7, [1, 2000000]))).toBe(-12000000);
    });

    it("reads zero", () => {
      expect(decimalToNumber(decimalJs(1, 0, [0]))).toBe(0);
    });

    it("returns null for objects that are not decimal.js shaped", () => {
      expect(decimalToNumber({})).toBeNull();
      expect(decimalToNumber({ s: 1, e: 3, d: [] })).toBeNull();
      expect(decimalToNumber({ s: 1, d: [1234] })).toBeNull();
      expect(decimalToNumber({ s: 1, e: "3", d: [1234] })).toBeNull();
      expect(decimalToNumber({ s: 1, e: 3, d: "1234" })).toBeNull();
    });
  });
});
