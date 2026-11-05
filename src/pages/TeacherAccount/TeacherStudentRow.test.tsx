import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TeacherPortalGroupStudent } from "../../app/api/teacherPortalApi/types";
import { jsonResponse, stubFetch } from "../../test/fetchStub";
import { renderWithStore } from "../../test/renderWithStore";
import { TeacherStudentRow } from "./TeacherStudentRow";

const student: TeacherPortalGroupStudent = {
  id: "s1",
  name: "Ali Valiyev",
  phone: "+998915179774",
  status: "ACTIVE",
  balance: -150000,
  debtor: true,
  createdAt: "2026-01-02T00:00:00.000Z",
  activatedAt: "2026-01-01",
  joinedAt: "2026-09-10T00:00:00.000Z",
  paymentStartDate: "2026-09-05",
  comment: "Pays late",
};

describe("TeacherStudentRow (Account page roster)", () => {
  it("opens the teacher card with only the debtor status, phone and this group's two dates", async () => {
    const { requests } = stubFetch(() => jsonResponse({ data: [] }));
    renderWithStore(<TeacherStudentRow student={student} />);

    fireEvent.focus(screen.getByText("Ali Valiyev"));
    const card = within(await screen.findByRole("tooltip"));

    expect(card.getByText("Debtor")).toBeTruthy();
    expect(card.getByText("(91) 517-97-74")).toBeTruthy();
    expect(card.getByText("10.09.2026")).toBeTruthy();
    expect(card.getByText("05.09.2026")).toBeTruthy();

    const everything = document.body.innerHTML;
    expect(everything).not.toMatch(/150\p{Z}?[,.]?000/u);
    expect(everything).not.toMatch(/UZS/);
    expect(everything).not.toContain("Pays late");
    // Nothing is asked from the staff student endpoints for a teacher.
    expect(requests).toEqual([]);
  });

  it("is not a link to the student profile", () => {
    renderWithStore(<TeacherStudentRow student={student} />);

    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Ali Valiyev").closest("a")).toBeNull();
  });
});
