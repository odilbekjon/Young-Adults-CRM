import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { baseApi } from "../../app/api/baseApi";
import { store } from "../../app/store";
import { jsonResponse, stubFetch } from "../../test/fetchStub";
import { renderWithStore } from "../../test/renderWithStore";
import { PaymentGroupPicker } from "./PaymentGroupPicker";

beforeEach(() => {
  store.dispatch(baseApi.util.resetApiState());
  stubFetch(() => jsonResponse({ success: true, data: {} }));
});

describe("PaymentGroupPicker", () => {
  it("offers the student's groups A to Z by name, whatever order they arrive in", () => {
    renderWithStore(
      <PaymentGroupPicker
        options={[
          { id: "1", name: "Zulu" },
          { id: "2", name: "beta 10" },
          { id: "3", name: "alpha" },
          { id: "4", name: "Beta 2" },
        ]}
        value=""
        onChange={() => undefined}
      />,
    );

    const shown = screen.getAllByRole("button").map((button) => button.textContent);
    expect(shown).toEqual(["alpha", "Beta 2", "beta 10", "Zulu"]);
  });
});
