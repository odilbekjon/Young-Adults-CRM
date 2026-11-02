import { createPortal } from "react-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { submitOnEnter } from "../submitOnEnter";

// A surface like a modal root: Enter anywhere inside it should press the primary action.
const renderSurface = (onSubmit: () => void, disabled = false, outerKeyDown: () => void = () => {}) =>
  render(
    <div onKeyDown={outerKeyDown}>
      <div data-testid="surface" onKeyDown={submitOnEnter(onSubmit, disabled)}>
        <input aria-label="text" />
        <input aria-label="search" data-no-enter-submit />
        <input aria-label="combo-input" role="combobox" />
        <div aria-label="combo-div" role="combobox" tabIndex={0} />
        <div aria-label="expanded" aria-expanded="true" tabIndex={0} />
        <input aria-label="checkbox" type="checkbox" />
        <textarea aria-label="notes" />
        <select aria-label="pick"><option>a</option></select>
        <button>Save</button>
        <a href="/somewhere">link</a>
        <div role="menuitem" tabIndex={0}>menu item</div>
        <div contentEditable suppressContentEditableWarning aria-label="editable" />
        <input
          aria-label="prevents"
          onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
        />
        {createPortal(<input aria-label="portaled" />, document.body)}
      </div>
    </div>,
  );

const pressEnter = (label: string, init: KeyboardEventInit = {}) =>
  fireEvent.keyDown(screen.getByLabelText(label), { key: "Enter", ...init });

describe("submitOnEnter", () => {
  it("submits on Enter in a plain text input and swallows the key", () => {
    const onSubmit = vi.fn();
    const outer = vi.fn();
    renderSurface(onSubmit, false, outer);
    // fireEvent returns false when preventDefault() was called
    expect(pressEnter("text")).toBe(false);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();
  });

  it("submits for a checkbox input too (Enter has no meaning there)", () => {
    const onSubmit = vi.fn();
    renderSurface(onSubmit);
    pressEnter("checkbox");
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("submits from a combobox that is a real text input", () => {
    const onSubmit = vi.fn();
    renderSurface(onSubmit);
    pressEnter("combo-input");
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("ignores keys other than Enter", () => {
    const onSubmit = vi.fn();
    renderSurface(onSubmit);
    fireEvent.keyDown(screen.getByLabelText("text"), { key: "a" });
    fireEvent.keyDown(screen.getByLabelText("text"), { key: " " });
    fireEvent.keyDown(screen.getByLabelText("text"), { key: "Escape" });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("leaves Enter alone where it already has a meaning", () => {
    const onSubmit = vi.fn();
    renderSurface(onSubmit);
    for (const label of ["notes", "pick", "combo-div", "expanded", "search", "editable"]) {
      pressEnter(label);
    }
    fireEvent.keyDown(screen.getByRole("button", { name: "Save" }), { key: "Enter" });
    fireEvent.keyDown(screen.getByRole("link", { name: "link" }), { key: "Enter" });
    fireEvent.keyDown(screen.getByRole("menuitem"), { key: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not fire with a modifier key held", () => {
    const onSubmit = vi.fn();
    renderSurface(onSubmit);
    pressEnter("text", { shiftKey: true });
    pressEnter("text", { ctrlKey: true });
    pressEnter("text", { altKey: true });
    pressEnter("text", { metaKey: true });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not fire for a held-down (repeating) key", () => {
    const onSubmit = vi.fn();
    renderSurface(onSubmit);
    pressEnter("text", { repeat: true });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not fire for the Enter that ends an IME composition", () => {
    const onSubmit = vi.fn();
    renderSurface(onSubmit);
    pressEnter("text", { isComposing: true });
    pressEnter("text", { keyCode: 229 });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not fire when a field already handled the key (defaultPrevented)", () => {
    const onSubmit = vi.fn();
    renderSurface(onSubmit);
    pressEnter("prevents");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("ignores keys pressed in a portal rendered outside the surface", () => {
    const onSubmit = vi.fn();
    renderSurface(onSubmit);
    pressEnter("portaled");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("while disabled it does not submit but still consumes the key", () => {
    const onSubmit = vi.fn();
    const outer = vi.fn();
    renderSurface(onSubmit, true, outer);
    expect(pressEnter("text")).toBe(false);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(outer).not.toHaveBeenCalled();
  });

  it("lets Enter bubble to an outer handler when it is ignored", () => {
    const onSubmit = vi.fn();
    const outer = vi.fn();
    renderSurface(onSubmit, false, outer);
    pressEnter("notes");
    expect(onSubmit).not.toHaveBeenCalled();
    expect(outer).toHaveBeenCalledTimes(1);
  });
});
