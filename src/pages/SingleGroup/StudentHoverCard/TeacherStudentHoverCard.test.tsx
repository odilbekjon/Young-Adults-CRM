import { act, fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../../test/renderWithStore";
import { TeacherStudentHoverCard, type TeacherStudentCardData } from "./TeacherStudentHoverCard";
import { useStudentCardTrigger } from "./useStudentCardTrigger";

// What a TEACHER session's roster row can carry. The balance (and a note) are
// deliberately part of the object handed to the card: whatever the backend sends,
// none of it may reach the DOM.
const debtorRow = {
  name: "Ali Valiyev",
  phone: "+998915179774",
  debtor: true,
  balance: -150000,
  comment: "Pays late",
  joinedAt: "2026-09-10T00:00:00.000Z",
  paymentStartDate: "2026-09-05",
};

// A roster row may carry far more than the card's own fields (balance, note, ...).
type RosterRow = TeacherStudentCardData & Record<string, unknown>;

const Harness = ({ student }: { student: RosterRow }) => {
  const { open, triggerProps, cardProps, anchorRef } = useStudentCardTrigger<HTMLDivElement>();
  return (
    <>
      <div data-testid="row" {...triggerProps}>Ali Valiyev</div>
      <TeacherStudentHoverCard student={student} open={open} anchorRef={anchorRef} {...cardProps} />
    </>
  );
};

const renderRow = (student: RosterRow) => {
  renderWithStore(<Harness student={student} />);
  return screen.getByTestId("row");
};

const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const card = () => screen.queryByRole("tooltip");

describe("TeacherStudentHoverCard", () => {
  describe("what the card shows", () => {
    it("shows the debtor status, the formatted phone, the day joined and the day billing became active", () => {
      const row = renderRow(debtorRow);
      fireEvent.focus(row);

      const tip = within(screen.getByRole("tooltip"));
      expect(tip.getByText("Balance status")).toBeTruthy();
      expect(tip.getByText("Debtor")).toBeTruthy();
      expect(tip.getByText("Phone")).toBeTruthy();
      expect(tip.getByText("(91) 517-97-74")).toBeTruthy();
      expect(tip.getByText("Joined date")).toBeTruthy();
      expect(tip.getByText("10.09.2026")).toBeTruthy();
      expect(tip.getByText("Activated at")).toBeTruthy();
      expect(tip.getByText("05.09.2026")).toBeTruthy();
    });

    it("never puts the balance amount, a currency or the note anywhere in the page, whatever the row carries", () => {
      const row = renderRow(debtorRow);
      fireEvent.focus(row);

      expect(screen.getByRole("tooltip")).toBeTruthy();
      const everything = document.body.innerHTML;
      expect(everything).not.toMatch(/150\p{Z}?[,.]?000/u);
      expect(everything).not.toMatch(/UZS|so'm|сум/i);
      expect(everything).not.toContain("Pays late");
      // No text, title or aria attribute carries a signed number either.
      expect(everything).not.toMatch(/(title|aria-[a-z]+)="[^"]*\d{4,}[^"]*"/);
    });

    it("says 'No debt' (and not 'Debtor') for a student who does not owe", () => {
      const row = renderRow({ ...debtorRow, debtor: false, balance: 250000 });
      fireEvent.focus(row);

      const tip = within(screen.getByRole("tooltip"));
      expect(tip.getByText("No debt")).toBeTruthy();
      expect(tip.queryByText("Debtor")).toBeNull();
      expect(document.body.innerHTML).not.toMatch(/250\p{Z}?[,.]?000/u);
    });

    it("shows a dash for everything the backend did not send", () => {
      const row = renderRow({ phone: null, debtor: null, joinedAt: null, paymentStartDate: null });
      fireEvent.focus(row);

      const tip = screen.getByRole("tooltip");
      expect(within(tip).queryByText("Debtor")).toBeNull();
      expect(within(tip).queryByText("No debt")).toBeNull();
      // balance status, phone, joined, activated
      expect(within(tip).getAllByText("—")).toHaveLength(4);
    });

    it("offers no link to the student profile", () => {
      const row = renderRow(debtorRow);
      fireEvent.focus(row);

      expect(within(screen.getByRole("tooltip")).queryByRole("link")).toBeNull();
      expect(screen.getByRole("tooltip").textContent).not.toMatch(/profile/i);
    });
  });

  describe("how it opens and closes", () => {
    it("opens when the pointer rests on the row, and links the row to the card for screen readers", () => {
      vi.useFakeTimers();
      const row = renderRow(debtorRow);

      fireEvent.mouseEnter(row);
      expect(card()).toBeNull();
      advance(150);

      expect(card()).not.toBeNull();
      expect(row.getAttribute("aria-describedby")).toBe(card()?.id);
    });

    it("does not open for a pointer that only passes over the row", () => {
      vi.useFakeTimers();
      const row = renderRow(debtorRow);

      fireEvent.mouseEnter(row);
      advance(80);
      fireEvent.mouseLeave(row);
      advance(1000);

      expect(card()).toBeNull();
    });

    it("stays open while the pointer travels from the row into the card, and closes after it leaves", () => {
      vi.useFakeTimers();
      const row = renderRow(debtorRow);
      fireEvent.mouseEnter(row);
      advance(150);

      fireEvent.mouseLeave(row);
      advance(100);
      fireEvent.mouseEnter(screen.getByRole("tooltip"));
      advance(1000);
      expect(card()).not.toBeNull();

      fireEvent.mouseLeave(screen.getByRole("tooltip"));
      advance(200);
      expect(card()).toBeNull();
    });

    it("opens on keyboard focus, closes on blur and on Escape", () => {
      const row = renderRow(debtorRow);
      expect(row.tabIndex).toBe(0);

      fireEvent.focus(row);
      expect(card()).not.toBeNull();
      fireEvent.blur(row);
      expect(card()).toBeNull();

      fireEvent.focus(row);
      expect(card()).not.toBeNull();
      fireEvent.keyDown(document, { key: "Escape" });
      expect(card()).toBeNull();
    });

    it("opens on a tap and closes on a tap elsewhere, but not on a tap inside the card", () => {
      const row = renderRow(debtorRow);

      fireEvent.click(row);
      expect(card()).not.toBeNull();

      fireEvent.pointerDown(screen.getByRole("tooltip"));
      expect(card()).not.toBeNull();

      fireEvent.pointerDown(document.body);
      expect(card()).toBeNull();
    });
  });
});
