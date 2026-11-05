import { describe, expect, it } from "vitest";
import { renderWithStore } from "../../../test/renderWithStore";
import { StudentStatusDot } from "./StudentStatusDot";

const GREEN = "rgb(67, 160, 71)"; // #43a047
const RED = "rgb(229, 57, 53)"; // #e53935

const dotOf = (props: Parameters<typeof StudentStatusDot>[0]) => {
  const { container } = renderWithStore(<StudentStatusDot {...props} />);
  const dot = container.firstElementChild as HTMLElement;
  return getComputedStyle(dot);
};

const isEmptySlot = (style: CSSStyleDeclaration) => ["transparent", "rgba(0, 0, 0, 0)"].includes(style.backgroundColor);

describe("StudentStatusDot", () => {
  it("is green for an active student who owes nothing", () => {
    expect(dotOf({ active: true, balance: 0 }).backgroundColor).toBe(GREEN);
    expect(dotOf({ active: true, balance: 150000 }).backgroundColor).toBe(GREEN);
    expect(dotOf({ active: true }).backgroundColor).toBe(GREEN);
  });

  it("is red for a debtor, even an active one", () => {
    expect(dotOf({ active: true, balance: -1 }).backgroundColor).toBe(RED);
    expect(dotOf({ active: false, balance: -250000 }).backgroundColor).toBe(RED);
  });

  it("is an empty slot for a frozen or trial student who is not in debt", () => {
    expect(isEmptySlot(dotOf({ active: false }))).toBe(true);
    expect(isEmptySlot(dotOf({ active: false, balance: 0 }))).toBe(true);
    expect(isEmptySlot(dotOf({ active: false, balance: 5000 }))).toBe(true);
  });

  it("is always an empty slot for an archived student, whatever the balance", () => {
    expect(isEmptySlot(dotOf({ active: true, archived: true, balance: 0 }))).toBe(true);
    expect(isEmptySlot(dotOf({ active: true, archived: true, balance: -100 }))).toBe(true);
  });

  describe("when only a debtor flag is known (a TEACHER session is never sent the amount)", () => {
    it("is red for a student flagged as a debtor, even an active one", () => {
      expect(dotOf({ active: true, debtor: true }).backgroundColor).toBe(RED);
    });

    it("is red for a flagged debtor who is on a trial lesson or frozen (not billed)", () => {
      expect(dotOf({ active: false, debtor: true }).backgroundColor).toBe(RED);
    });

    it("is green for an active student flagged as not in debt", () => {
      expect(dotOf({ active: true, debtor: false }).backgroundColor).toBe(GREEN);
    });

    it("stays an empty slot for a trial or frozen student who is not in debt", () => {
      expect(isEmptySlot(dotOf({ active: false, debtor: false }))).toBe(true);
    });

    it("never draws a dot for an archived student, flagged or not", () => {
      expect(isEmptySlot(dotOf({ active: true, archived: true, debtor: true }))).toBe(true);
    });

    it("lets the flag decide over a balance, and falls back to the balance when there is no flag", () => {
      expect(dotOf({ active: true, balance: 5000, debtor: true }).backgroundColor).toBe(RED);
      expect(dotOf({ active: true, balance: -5000, debtor: false }).backgroundColor).toBe(GREEN);
      expect(dotOf({ active: true, balance: -5000, debtor: undefined }).backgroundColor).toBe(RED);
    });
  });

  it("keeps the same 8px size in every state so names stay aligned across rows", () => {
    const states = [
      { active: true },
      { active: true, balance: -10 },
      { active: false },
      { active: true, archived: true },
    ];
    for (const props of states) {
      const style = dotOf(props);
      expect(style.width).toBe("8px");
      expect(style.height).toBe("8px");
    }
  });
});
