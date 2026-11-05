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
});
