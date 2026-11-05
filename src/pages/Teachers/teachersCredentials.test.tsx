import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { API_BASE_URL, baseApi } from "../../app/api/baseApi";
import { store } from "../../app/store";
import { setSelectedBranchId } from "../../app/store/branchSlice";
import { BranchProvider } from "../../Context/BranchContext";
import { DataProvider } from "../../Context/DataContext";
import { ToastProvider } from "../../Context/ToastContext";
import { jsonResponse, readFormData, stubFetch, type SentRequest } from "../../test/fetchStub";
import { renderWithStore } from "../../test/renderWithStore";
import { Teachers } from "./Teachers";

// The login a teacher is handed is the phone and password saved in this drawer,
// so the drawer must save them in the shape the login looks them up by.
vi.setConfig({ testTimeout: 20_000 });

const BRANCH = "b-grammar";
const path = (request: SentRequest) => request.url.replace(API_BASE_URL, "");
// A teacher saved before the form normalized phones: typed with spaces, no +998.
const LEGACY_TEACHER = {
  id: "t1", name: "Olim Karimov", phone: "90 123 45 67", email: null, photo: null, gender: "MALE", birthdate: null,
  status: "ACTIVE", branches: [{ id: BRANCH, name: "Grammar Campus" }],
};

const backend = (request: SentRequest) => {
  const p = path(request);
  if (request.method === "GET") {
    if (p.startsWith("/teachers/t1/for-edit")) return jsonResponse({ success: true, data: LEGACY_TEACHER });
    if (p.startsWith("/teachers")) return jsonResponse({ success: true, data: [LEGACY_TEACHER], meta: { total: 1, page: 1, limit: 100, totalPages: 1 } });
    return jsonResponse({ success: true, data: [], meta: { total: 0, page: 1, limit: 100, totalPages: 1 } });
  }
  return jsonResponse({ success: true, data: { id: "t-new" } });
};

const renderTeachers = () =>
  renderWithStore(
    <MemoryRouter>
      <DataProvider>
        <BranchProvider>
          <ToastProvider>
            <Teachers />
          </ToastProvider>
        </BranchProvider>
      </DataProvider>
    </MemoryRouter>,
  );

const field = (name: string) => document.querySelector<HTMLInputElement>(`input[name="${name}"]`)!;
const type = (name: string, value: string) => fireEvent.change(field(name), { target: { value } });
const writes = (requests: SentRequest[]) => requests.filter((r) => r.method !== "GET");

beforeEach(() => {
  store.dispatch(baseApi.util.resetApiState());
  store.dispatch(setSelectedBranchId(BRANCH));
});
afterEach(() => {
  act(() => {
    store.dispatch(setSelectedBranchId(null));
  });
});

describe("Teachers page - creating the login of a new teacher", () => {
  const openAdd = async () => {
    await screen.findByText("Olim Karimov");
    fireEvent.click(screen.getByRole("button", { name: /ADD NEW/ }));
    await waitFor(() => expect(field("phone")).toBeTruthy());
  };

  it("saves the phone as +998 and 9 digits and the password exactly as typed", async () => {
    const { requests } = stubFetch(backend);
    renderTeachers();
    await openAdd();

    type("phone", "90 765 43 21");
    type("name", "Aziz Nazarov");
    fireEvent.click(screen.getByText("+ Set password"));
    type("password", " abc123 ");
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => expect(writes(requests)).toHaveLength(1));
    const [post] = writes(requests);
    expect(post.method).toBe("POST");
    expect(path(post)).toBe("/teachers");
    expect(Object.fromEntries(await readFormData(post))).toMatchObject({
      name: "Aziz Nazarov",
      phone: "+998907654321",
      password: " abc123 ",
      branchIds: BRANCH,
    });
  });

  it("refuses a password the login would reject, before anything is sent, and shows why", async () => {
    const { requests } = stubFetch(backend);
    renderTeachers();
    await openAdd();

    type("phone", "907654321");
    type("name", "Aziz Nazarov");
    fireEvent.click(screen.getByText("+ Set password"));
    type("password", "abc");
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(await screen.findByText(/Password must be at least 6 characters/)).toBeTruthy();
    expect(writes(requests)).toHaveLength(0);
  });

  it("opens the folded password box to show that error", async () => {
    stubFetch(backend);
    renderTeachers();
    await openAdd();

    type("phone", "907654321");
    type("name", "Aziz Nazarov");
    fireEvent.click(screen.getByText("+ Set password")); // open, type, fold it away again
    type("password", "abc");
    fireEvent.click(screen.getByText("− Hide password"));
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(await screen.findByText(/Password must be at least 6 characters/)).toBeTruthy();
    expect(screen.getByText("− Hide password")).toBeTruthy();
  });

  it("refuses a phone that is not 9 digits", async () => {
    const { requests } = stubFetch(backend);
    renderTeachers();
    await openAdd();

    type("phone", "90 765");
    type("name", "Aziz Nazarov");
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(await screen.findByText("Enter the 9 digits of the phone number after +998")).toBeTruthy();
    expect(writes(requests)).toHaveLength(0);
  });

  it("reminds that a teacher without a password cannot log in, and creates one with no password when none is set", async () => {
    const { requests } = stubFetch(backend);
    renderTeachers();
    await openAdd();

    expect(screen.getByText(/Without a password they cannot log in/)).toBeTruthy();
    type("phone", "907654321");
    type("name", "Aziz Nazarov");
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => expect(writes(requests)).toHaveLength(1));
    expect(Object.fromEntries(await readFormData(writes(requests)[0]))).not.toHaveProperty("password");
  });

  it("lets the admin read the password back before handing it over", async () => {
    stubFetch(backend);
    renderTeachers();
    await openAdd();

    fireEvent.click(screen.getByText("+ Set password"));
    type("password", "abc123");
    expect(field("password").type).toBe("password");
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(field("password").type).toBe("text");
    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(field("password").type).toBe("password");
  });
});

describe("Teachers page - editing a teacher saved with an odd phone", () => {
  it("shows the digits after +998 and saves the number back in the shape the login expects", async () => {
    const { requests } = stubFetch(backend);
    const { container } = renderTeachers();
    await screen.findByText("Olim Karimov");

    fireEvent.click(container.querySelector("tbody tr button")!);
    fireEvent.click(await screen.findByText(/Edit/));
    await waitFor(() => expect(field("phone")).toBeTruthy());
    expect(field("phone").value).toBe("901234567");

    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => expect(writes(requests)).toHaveLength(1));
    const [patch] = writes(requests);
    expect(patch.method).toBe("PATCH");
    expect(path(patch)).toBe("/teachers/t1");
    const fields = Object.fromEntries(await readFormData(patch));
    expect(fields).toMatchObject({ phone: "+998901234567" });
    // no password typed: the current one stays
    expect(fields).not.toHaveProperty("password");
  });
});
