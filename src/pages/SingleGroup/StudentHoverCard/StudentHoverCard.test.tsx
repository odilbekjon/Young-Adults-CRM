import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../../test/renderWithStore";
import type { StudentCardData } from "../types";
import { StudentHoverCard } from "./StudentHoverCard";

// The STAFF card. A teacher gets TeacherStudentHoverCard instead (see its test), so
// this pins down what staff keep: the balance amount and the profile link.
const student: StudentCardData = {
  id: 7,
  uid: "student-uid-1",
  name: "Ali Valiyev",
  phone: "+998915179774",
  active: true,
  groupStatus: "ACTIVE",
  balance: -150000,
  joinedAt: "10.09.2026",
  activatedAt: "05.09.2026",
};

describe("StudentHoverCard (staff)", () => {
  it("still shows the debtor badge, the balance amount, the dates and the profile link", () => {
    const onGoToProfile = vi.fn();
    renderWithStore(
      <StudentHoverCard student={student} anchorEl={document.createElement("div")} onClose={vi.fn()} onGoToProfile={onGoToProfile} />,
    );

    expect(screen.getByText("Debtor")).toBeTruthy();
    // The thousands separator is a locale-dependent space, so any separator is accepted.
    expect(document.body.textContent).toMatch(/150\p{Z}?[,.]?000\p{Z}?UZS/u);
    expect(screen.getByText("10.09.2026")).toBeTruthy();
    expect(screen.getByText("05.09.2026")).toBeTruthy();

    fireEvent.click(screen.getByText("Go to profile →"));
    expect(onGoToProfile).toHaveBeenCalledTimes(1);
  });
  it("lists the student's notes last, after the dates", () => {
    renderWithStore(
      <StudentHoverCard
        student={student}
        notes={[{ id: "n1", text: "Called the parents", date: "11.11.2026" }, { id: "n2", text: "Asked for a discount", date: "" }]}
        anchorEl={document.createElement("div")}
        onClose={vi.fn()}
        onGoToProfile={vi.fn()}
      />,
    );

    expect(screen.getByText("Note")).toBeTruthy();
    const text = document.body.textContent ?? "";
    expect(text.indexOf("Called the parents")).toBeGreaterThan(text.indexOf("05.09.2026"));
    expect(text.indexOf("Asked for a discount")).toBeGreaterThan(text.indexOf("Called the parents"));
    expect(text.indexOf("Go to profile")).toBeGreaterThan(text.indexOf("Asked for a discount"));
    expect(screen.getByText("11.11.2026")).toBeTruthy();
  });

  it("shows no note section when there is no note", () => {
    renderWithStore(
      <StudentHoverCard student={student} anchorEl={document.createElement("div")} onClose={vi.fn()} onGoToProfile={vi.fn()} />,
    );
    expect(screen.queryByText("Note")).toBeNull();
  });
});
