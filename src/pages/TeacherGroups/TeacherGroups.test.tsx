import { screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { baseApi } from "../../app/api/baseApi";
import { store } from "../../app/store";
import { jsonResponse, stubFetch } from "../../test/fetchStub";
import { renderWithStore } from "../../test/renderWithStore";
import { TeacherGroups } from "./TeacherGroups";

beforeEach(() => {
  store.dispatch(baseApi.util.resetApiState());
});

const row = (id: string, name: string) => ({ id, name, courseName: "English", status: "ACTIVE", trainingEnd: "2099-12-31" });

describe("TeacherGroups", () => {
  it("lists the teacher's groups A to Z by name, whatever order the server sends", async () => {
    stubFetch(() =>
      jsonResponse({ data: [row("1", "Zulu"), row("2", "beta 10"), row("3", "alpha"), row("4", "Beta 2")] }),
    );
    renderWithStore(
      <MemoryRouter>
        <TeacherGroups />
      </MemoryRouter>,
    );

    await screen.findByText("Zulu");

    const shown = ["alpha", "Beta 2", "beta 10", "Zulu"].map((name) => screen.getByText(name));
    // each name sits below the previous one in the document
    shown.slice(1).forEach((el, i) => {
      expect(shown[i].compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });
});
