import type { ComponentProps } from "react";
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../../test/renderWithStore";
import { ActivateModal } from "./ActivateModal";

type Props = ComponentProps<typeof ActivateModal>;

const renderModal = (overrides: Partial<Props> = {}) => {
  const props: Props = { open: true, onClose: vi.fn(), onConfirm: vi.fn(), ...overrides };
  renderWithStore(<ActivateModal {...props} />);
  return { props };
};

const confirmButton = () => screen.getByRole("button", { name: /^(Submit|Activating\.\.\.)$/ }) as HTMLButtonElement;

// Activating a frozen / archived member is a plain confirmation: no billing start
// date is asked for, so none can be sent.
describe("ActivateModal", () => {
  it("asks for no date", () => {
    renderModal();

    expect(screen.queryByText(/^\d{2}\.\d{2}\.\d{4}$/)).toBeNull();
  });

  it("confirms with no argument", () => {
    const { props } = renderModal();

    fireEvent.click(confirmButton());
    expect(props.onConfirm).toHaveBeenCalledTimes(1);
    expect(props.onConfirm).toHaveBeenCalledWith();
  });

  it("confirms on Enter too", () => {
    const { props } = renderModal();

    fireEvent.keyDown(screen.getByText("Activate student"), { key: "Enter" });
    expect(props.onConfirm).toHaveBeenCalledTimes(1);
  });

  it("is blocked while saving: the button is disabled, says so, and Enter does nothing", () => {
    const { props } = renderModal({ isSaving: true });

    expect(confirmButton().disabled).toBe(true);
    expect(confirmButton().textContent).toBe("Activating...");
    fireEvent.click(confirmButton());
    fireEvent.keyDown(screen.getByText("Activate student"), { key: "Enter" });
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it("renders nothing while closed", () => {
    renderModal({ open: false });

    expect(screen.queryByText("Activate student")).toBeNull();
  });
});
