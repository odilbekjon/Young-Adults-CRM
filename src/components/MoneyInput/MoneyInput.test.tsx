import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MoneyInput } from "./MoneyInput";

const Harness = ({ initial = "", onValue }: { initial?: string; onValue?: (digits: string) => void }) => {
  const [value, setValue] = useState(initial);
  return (
    <>
      <MoneyInput
        aria-label="amount"
        value={value}
        onChange={(digits) => { setValue(digits); onValue?.(digits); }}
      />
      <output data-testid="digits">{value}</output>
    </>
  );
};

const field = () => screen.getByLabelText("amount") as HTMLInputElement;
const digits = () => screen.getByTestId("digits").textContent;
const caretOf = (input: HTMLInputElement) => [input.selectionStart, input.selectionEnd];

// What the browser does for one edit: the field's text and caret change first, then an `input` event fires.
const browserEdit = (input: HTMLInputElement, text: string, caret: number, inputType = "insertText") => {
  input.focus();
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, text);
  input.setSelectionRange(caret, caret);
  fireEvent(input, new InputEvent("input", { bubbles: true, inputType }));
};

// Caret/selection first, as a user clicking into the field would.
const select = (input: HTMLInputElement, start: number, end = start) => {
  input.focus();
  input.setSelectionRange(start, end);
};

const type = (input: HTMLInputElement, chars: string) => {
  for (const ch of chars) {
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    browserEdit(input, input.value.slice(0, start) + ch + input.value.slice(end), start + 1);
  }
};

const backspace = (input: HTMLInputElement) => {
  const start = input.selectionStart ?? 0;
  const end = input.selectionEnd ?? start;
  if (start === end && start === 0) return;
  const from = start === end ? start - 1 : start;
  browserEdit(input, input.value.slice(0, from) + input.value.slice(end), from, "deleteContentBackward");
};

const del = (input: HTMLInputElement) => {
  const start = input.selectionStart ?? 0;
  const end = input.selectionEnd ?? start;
  if (start === end && start === input.value.length) return;
  const to = start === end ? end + 1 : end;
  browserEdit(input, input.value.slice(0, start) + input.value.slice(to), start, "deleteContentForward");
};

const paste = (input: HTMLInputElement, text: string) => {
  const notPrevented = fireEvent.paste(input, { clipboardData: { getData: () => text } });
  return notPrevented;
};

describe("MoneyInput", () => {
  it("is a numeric-keypad text field with a 0 placeholder, not a type=number box", () => {
    render(<Harness />);

    expect(field().type).toBe("text");
    expect(field().getAttribute("inputmode")).toBe("numeric");
    expect(field().placeholder).toBe("0");
    expect(field().value).toBe("");
  });

  it("passes the usual input props and styles through", () => {
    render(<MoneyInput value="" onChange={() => {}} aria-label="amount" disabled style={{ width: "100%" }} />);

    expect(field().disabled).toBe(true);
    expect(field().style.width).toBe("100%");
  });

  it("shows a given value grouped by thousands", () => {
    render(<Harness initial="1250000" />);

    expect(field().value).toBe("1 250 000");
  });

  describe("typing", () => {
    it("groups the digits as they are typed and reports the bare digits", () => {
      const onValue = vi.fn();
      render(<Harness onValue={onValue} />);

      type(field(), "300000");

      expect(field().value).toBe("300 000");
      expect(digits()).toBe("300000");
      expect(onValue).toHaveBeenLastCalledWith("300000");
      expect(onValue.mock.calls.every(([v]) => /^\d*$/.test(v))).toBe(true);
    });

    it("groups millions", () => {
      render(<Harness />);

      type(field(), "1250000");

      expect(field().value).toBe("1 250 000");
      expect(digits()).toBe("1250000");
    });

    it("keeps the caret at the end while typing at the end", () => {
      render(<Harness />);

      type(field(), "3000");

      expect(field().value).toBe("3 000");
      expect(caretOf(field())).toEqual([5, 5]);
    });

    it("typing in the middle keeps the caret next to the typed digit", () => {
      render(<Harness initial="1250000" />);
      select(field(), 3); // "1 2|50 000"

      type(field(), "9");

      expect(field().value).toBe("12 950 000");
      expect(caretOf(field())).toEqual([4, 4]); // "12 9|50 000" - behind the typed digit

      type(field(), "8");
      expect(field().value).toBe("129 850 000");
      expect(caretOf(field())).toEqual([5, 5]); // "129 8|50 000"
    });

    it("typing at the very start keeps the caret behind the typed digit", () => {
      render(<Harness initial="250" />);
      select(field(), 0);

      type(field(), "7");

      expect(field().value).toBe("7 250");
      expect(caretOf(field())).toEqual([1, 1]);
    });

    it("replaces a selection", () => {
      render(<Harness initial="1250000" />);
      select(field(), 2, 5); // "1 [250] 000"

      type(field(), "7");

      expect(field().value).toBe("17 000");
      expect(digits()).toBe("17000");
      expect(caretOf(field())).toEqual([2, 2]);
    });

    it("ignores letters, minus, e and separators and leaves the caret between the same digits", () => {
      render(<Harness initial="1250" />);
      select(field(), 3); // "1 2|50"

      for (const ch of ["a", "-", "e", "+", ",", ".", " "]) type(field(), ch);

      expect(field().value).toBe("1 250");
      expect(digits()).toBe("1250");
      expect(caretOf(field())).toEqual([3, 3]); // still behind the "2"
    });

    it("an empty field stays empty when only junk is typed", () => {
      render(<Harness />);

      type(field(), "abc-e");

      expect(field().value).toBe("");
      expect(digits()).toBe("");
    });
  });

  describe("leading zeros", () => {
    it('keeps a lone "0"', () => {
      render(<Harness />);

      type(field(), "0");

      expect(field().value).toBe("0");
      expect(digits()).toBe("0");
    });

    it('turns "007" into "7"', () => {
      render(<Harness />);

      type(field(), "007");

      expect(field().value).toBe("7");
      expect(digits()).toBe("7");
    });

    it('turns "000" into "0" and a digit after the 0 replaces it', () => {
      render(<Harness />);

      type(field(), "000");
      expect(digits()).toBe("0");

      type(field(), "5");
      expect(digits()).toBe("5");
      expect(field().value).toBe("5");
    });
  });

  describe("deleting", () => {
    it("Backspace in the middle removes the digit left of the caret and keeps the caret there", () => {
      render(<Harness initial="1250000" />);
      select(field(), 4); // "1 25|0 000"

      backspace(field());

      expect(field().value).toBe("120 000");
      expect(digits()).toBe("120000");
      expect(caretOf(field())).toEqual([2, 2]); // "12|0 000"
    });

    it("Delete in the middle removes the digit right of the caret and keeps the caret there", () => {
      render(<Harness initial="1250000" />);
      select(field(), 3); // "1 2|50 000"

      del(field());

      expect(field().value).toBe("120 000");
      expect(digits()).toBe("120000");
      expect(caretOf(field())).toEqual([2, 2]);
    });

    it("Backspace right behind a space removes the digit before it, not nothing", () => {
      render(<Harness initial="1250000" />);
      select(field(), 2); // "1 |250 000"

      backspace(field());

      expect(field().value).toBe("250 000");
      expect(digits()).toBe("250000");
      expect(caretOf(field())).toEqual([0, 0]);
    });

    it("Delete right in front of a space removes the digit after it, not nothing", () => {
      render(<Harness initial="1250000" />);
      select(field(), 1); // "1| 250 000"

      del(field());

      expect(field().value).toBe("150 000");
      expect(digits()).toBe("150000");
      expect(caretOf(field())).toEqual([1, 1]);
    });

    it("Backspace at the end walks back through the whole number", () => {
      render(<Harness initial="1250" />);
      select(field(), 5);

      backspace(field());
      expect(field().value).toBe("125");
      backspace(field());
      backspace(field());
      expect(field().value).toBe("1");
      backspace(field());
      expect(field().value).toBe("");
      expect(digits()).toBe("");
    });

    it("clearing the field (select all + delete) gives an empty value", () => {
      render(<Harness initial="1250000" />);
      select(field(), 0, 9);

      backspace(field());

      expect(field().value).toBe("");
      expect(digits()).toBe("");
    });

    it("a selection spanning separators is deleted like any other text", () => {
      render(<Harness initial="1250000" />);
      select(field(), 3, 7); // "1 2[50 0]00"

      del(field());

      expect(field().value).toBe("1 200");
      expect(digits()).toBe("1200");
      expect(caretOf(field())).toEqual([3, 3]); // "1 2|00"
    });
  });

  describe("pasting", () => {
    it.each(["300 000", "300,000", "300000", "300\u00a0000", "300\u202f000", "300.000", "300 000 UZS"])("%j gives 300 000", (text) => {
      render(<Harness />);

      paste(field(), text);

      expect(field().value).toBe("300 000");
      expect(digits()).toBe("300000");
    });

    it("handles the paste itself (no second, raw change reaches the field)", () => {
      render(<Harness />);

      expect(paste(field(), "300,000")).toBe(false); // preventDefault was called
    });

    it("drops a pasted fraction instead of multiplying the number", () => {
      render(<Harness />);

      paste(field(), "1 500,50");

      expect(digits()).toBe("1500");
    });

    it("pastes at the caret and puts the caret behind the pasted digits", () => {
      render(<Harness initial="1000" />);
      select(field(), 1); // "1| 000"

      paste(field(), "250");

      expect(field().value).toBe("1 250 000");
      expect(caretOf(field())).toEqual([5, 5]);
    });

    it("replaces the selection", () => {
      render(<Harness initial="1250000" />);
      select(field(), 0, 9);

      paste(field(), "5 000");

      expect(field().value).toBe("5 000");
      expect(digits()).toBe("5000");
    });

    it("ignores a paste without digits", () => {
      render(<Harness initial="1250" />);
      select(field(), 0, 5);

      paste(field(), "abc");

      expect(field().value).toBe("1 250");
      expect(digits()).toBe("1250");
    });

    it("normalises leading zeros", () => {
      render(<Harness />);

      paste(field(), "007");

      expect(field().value).toBe("7");
    });
  });

  describe("max length", () => {
    it("takes at most 12 digits, typed or pasted", () => {
      render(<Harness />);

      type(field(), "1234567890123456");
      expect(digits()).toBe("123456789012");
      expect(field().value).toBe("123 456 789 012");

      select(field(), 0, field().value.length);
      paste(field(), "9".repeat(30));
      expect(digits()).toBe("9".repeat(12));
    });

    it("a digit typed in the middle of a full field is refused and the caret stays", () => {
      render(<Harness initial="123456789012" />);
      select(field(), 3); // "12|3 456 789 012"

      type(field(), "9");

      expect(digits()).toBe("123456789012");
      expect(caretOf(field())).toEqual([3, 3]);
    });

    it("honours a custom maxDigits", () => {
      const Short = () => {
        const [v, setV] = useState("");
        return <MoneyInput aria-label="amount" value={v} onChange={setV} maxDigits={4} />;
      };
      render(<Short />);

      type(field(), "12345");

      expect(field().value).toBe("1 234");
    });
  });
});
