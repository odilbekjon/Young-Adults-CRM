import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useDropStaleFilter } from "./useDropStaleFilter";

type Props = { value: string; options: string[] | undefined; branchKey: string | null };

const setup = (initial: Props) => {
  const onStale = vi.fn();
  const view = renderHook((props: Props) => useDropStaleFilter({ ...props, onStale }), { initialProps: initial });
  return { onStale, ...view };
};

describe("useDropStaleFilter", () => {
  it("drops a saved value that is not among the loaded options", () => {
    const { onStale } = setup({ value: "c-grammar", options: ["c-ielts"], branchKey: "b-ielts" });

    expect(onStale).toHaveBeenCalledTimes(1);
  });

  it("keeps a value that is among the options", () => {
    const { onStale } = setup({ value: "c-ielts", options: ["c-ielts", "c-other"], branchKey: "b-ielts" });

    expect(onStale).not.toHaveBeenCalled();
  });

  it("judges nothing while the options are still loading", () => {
    const { onStale, rerender } = setup({ value: "c-grammar", options: undefined, branchKey: "b-ielts" });
    expect(onStale).not.toHaveBeenCalled();

    rerender({ value: "c-grammar", options: ["c-ielts"], branchKey: "b-ielts" });
    expect(onStale).toHaveBeenCalledTimes(1);
  });

  it("drops the value as soon as the branch changes, before the new options arrive", () => {
    const { onStale, rerender } = setup({ value: "c-ielts", options: ["c-ielts"], branchKey: "b-ielts" });
    expect(onStale).not.toHaveBeenCalled();

    rerender({ value: "c-ielts", options: undefined, branchKey: "b-grammar" });

    expect(onStale).toHaveBeenCalledTimes(1);
  });

  it("does not treat the first render as a branch change", () => {
    const { onStale } = setup({ value: "c-ielts", options: undefined, branchKey: null });

    expect(onStale).not.toHaveBeenCalled();
  });

  it("does nothing without a value", () => {
    const { onStale, rerender } = setup({ value: "", options: ["c-ielts"], branchKey: "b-ielts" });
    rerender({ value: "", options: [], branchKey: "b-grammar" });

    expect(onStale).not.toHaveBeenCalled();
  });
});
