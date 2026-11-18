import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../../test/renderWithStore";
import { FreezeModal } from "./FreezeModal";

beforeEach(() => {
  // Only the date is faked, so Testing Library's own timers keep running.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 5, 15, 12, 0));
});

const renderModal = () => {
  const onConfirm = vi.fn();
  renderWithStore(<FreezeModal open onClose={vi.fn()} student={null} onConfirm={onConfirm} />);
  return { onConfirm };
};

describe("FreezeModal", () => {
  it("starts with no date picked: staff enter it themselves", () => {
    renderModal();

    expect(screen.getByText("No date selected")).toBeTruthy();
    expect(screen.queryByText("15.06.2026")).toBeNull();
  });

  it("refuses to submit until a date is picked", () => {
    const { onConfirm } = renderModal();

    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(screen.getByText("Select a start date")).toBeTruthy();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
