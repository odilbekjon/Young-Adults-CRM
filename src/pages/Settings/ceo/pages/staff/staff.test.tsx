import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { API_BASE_URL, baseApi } from "../../../../../app/api/baseApi";
import { store } from "../../../../../app/store";
import { setSelectedBranchId } from "../../../../../app/store/branchSlice";
import { BranchProvider } from "../../../../../Context/BranchContext";
import { DataProvider } from "../../../../../Context/DataContext";
import { ToastProvider } from "../../../../../Context/ToastContext";
import { jsonResponse, readFormData, stubFetch, type SentRequest } from "../../../../../test/fetchStub";
import { renderWithStore } from "../../../../../test/renderWithStore";
import { Staff } from "./staff";

// Each test renders the whole page (MUI table, drawer, date picker) — slow enough
// to brush the default 5 s when the suite runs in parallel.
vi.setConfig({ testTimeout: 20_000 });

const path = (request: SentRequest) => request.url.replace(API_BASE_URL, "");

// One staff member (an ADMIN holding two positions, in two branches) and what
// the backend knows about them for the edit form.
const LIST_ROW = {
  id: "u1",
  name: "Jasur Aliyev",
  email: "jasur@example.com",
  phone: "+998901234567",
  role: "ADMIN",
  status: "ACTIVE",
  jobTitle: "Kassa menejer",
  rolePermission: { id: "rp-cashier", name: "Kassa Xodimi" },
  rolePermissions: [
    { id: "rp-cashier", name: "Kassa Xodimi" },
    { id: "rp-report", name: "Hisobot Ko'ruvchi" },
  ],
  branches: [
    { branchId: "b1", branch: { id: "b1", name: "Chilonzor", status: "ACTIVE" } },
    { branchId: "b2", branch: { id: "b2", name: "Yunusobod", status: "ACTIVE" } },
  ],
};

const FOR_EDIT = {
  id: "u1",
  name: "Jasur Aliyev",
  email: "jasur@example.com",
  phone: "+998901234567",
  rolePermissionId: "rp-cashier",
  jobTitle: "Kassa menejer",
  photo: null,
  gender: "MALE",
  birthdate: "1995-03-07T00:00:00.000Z",
  branchIds: ["b1", "b2"],
};

const BRANCHES = [
  { id: "b1", name: "Chilonzor", status: "ACTIVE" },
  { id: "b2", name: "Yunusobod", status: "ACTIVE" },
  { id: "b3", name: "Sergeli", status: "ACTIVE" },
  { id: "b4", name: "Closed branch", status: "INACTIVE" },
];

const POSITIONS = [
  { id: "rp-cashier", name: "Kassa Xodimi" },
  { id: "rp-report", name: "Hisobot Ko'ruvchi" },
  { id: "rp-ceo", name: "CEO" },
];

const answer = (request: SentRequest) => {
  const p = path(request);
  if (request.method === "GET") {
    if (p.startsWith("/users/u1/for-edit")) return jsonResponse({ success: true, data: FOR_EDIT });
    if (p.startsWith("/users")) return jsonResponse({ success: true, data: [LIST_ROW], meta: { total: 1, page: 1, limit: 10, totalPages: 1 } });
    if (p.startsWith("/branches")) return jsonResponse({ success: true, data: BRANCHES });
    if (p.startsWith("/role-permissions/select")) return jsonResponse({ success: true, data: POSITIONS });
  }
  return jsonResponse({ success: true, data: { id: "u-new" } });
};

const writes = (requests: SentRequest[]) => requests.filter((r) => r.method !== "GET");

const renderStaff = () =>
  renderWithStore(
    <MemoryRouter>
      <DataProvider>
        <BranchProvider>
          <ToastProvider>
            <Staff />
          </ToastProvider>
        </BranchProvider>
      </DataProvider>
    </MemoryRouter>,
  );

const input = (name: string) => document.querySelector<HTMLInputElement>(`input[name="${name}"]`)!;

const openEditDrawer = async () => {
  const row = (await screen.findByText("Jasur Aliyev")).closest("tr")!;
  const [, dots] = within(row).getAllByRole("button");
  fireEvent.click(dots);
  fireEvent.click(await screen.findByRole("menuitem", { name: "Edit" }));
};

const submit = () => fireEvent.click(screen.getByRole("button", { name: /^Submit$/ }));

beforeEach(() => {
  store.dispatch(baseApi.util.resetApiState());
  store.dispatch(setSelectedBranchId(null));
});

describe("Staff page: editing", () => {
  it("opens the edit drawer already filled in with everything known about the member", async () => {
    stubFetch(answer);
    renderStaff();

    await openEditDrawer();

    // personal data
    await waitFor(() => expect(input("name").value).toBe("Jasur Aliyev"));
    expect(input("phone").value).toBe("901234567"); // the +998 is the field's fixed prefix
    expect(input("email").value).toBe("jasur@example.com");
    expect(input("jobTitle").value).toBe("Kassa menejer");
    expect(screen.getByText("07.03.1995")).toBeTruthy();
    expect((screen.getByRole("radio", { name: "Male" }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("radio", { name: "Female" }) as HTMLInputElement).checked).toBe(false);
    // never the password
    expect(input("password").value).toBe("");
    expect(screen.getByText("Leave empty to keep the current password.")).toBeTruthy();
    // every position the member holds, and only those
    expect((screen.getByRole("checkbox", { name: "Kassa Xodimi" }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("checkbox", { name: "Hisobot Ko'ruvchi" }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("checkbox", { name: "CEO" }) as HTMLInputElement).checked).toBe(false);
    // branches by name, plus the account's role and status
    expect(screen.getByText("Chilonzor, Yunusobod")).toBeTruthy();
    expect(screen.getAllByText("ADMIN").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
  });

  it("shows a spinner instead of an empty form while the member is being loaded", async () => {
    let release: (() => void) | undefined;
    stubFetch(async (request) => {
      if (path(request).startsWith("/users/u1/for-edit")) await new Promise<void>((resolve) => (release = resolve));
      return answer(request);
    });
    renderStaff();

    await openEditDrawer();

    expect(await screen.findByRole("progressbar")).toBeTruthy();
    expect(document.querySelector('input[name="name"]')).toBeNull();
    expect((screen.getByRole("button", { name: /^Submit$/ }) as HTMLButtonElement).disabled).toBe(true);

    release?.();
    await waitFor(() => expect(input("name").value).toBe("Jasur Aliyev"));
  });

  it("saving without touching a field sends nothing: no PATCH, no password, no position calls", async () => {
    const { requests } = stubFetch(answer);
    renderStaff();
    await openEditDrawer();
    await waitFor(() => expect(input("name").value).toBe("Jasur Aliyev"));

    submit();

    await screen.findByText("Staff member updated");
    expect(writes(requests)).toHaveLength(0);
  });

  it("sends only the edited field, leaving the password and positions alone", async () => {
    const { requests } = stubFetch(answer);
    renderStaff();
    await openEditDrawer();
    await waitFor(() => expect(input("name").value).toBe("Jasur Aliyev"));

    fireEvent.change(input("jobTitle"), { target: { value: "Bosh kassir" } });
    submit();

    await screen.findByText("Staff member updated");
    const sent = writes(requests);
    expect(sent.map((r) => `${r.method} ${path(r)}`)).toEqual(["PATCH /users/u1"]);
    expect(await readFormData(sent[0])).toEqual([["jobTitle", "Bosh kassir"]]);
  });

  it("detaches only the position that was unticked and keeps the other", async () => {
    const { requests } = stubFetch(answer);
    renderStaff();
    await openEditDrawer();
    await waitFor(() => expect(input("name").value).toBe("Jasur Aliyev"));

    fireEvent.click(screen.getByRole("checkbox", { name: "Hisobot Ko'ruvchi" }));
    submit();

    await screen.findByText("Staff member updated");
    expect(writes(requests).map((r) => `${r.method} ${path(r)}`)).toEqual(["DELETE /role-permissions/rp-report/remove-user/u1"]);
  });

  it("starts the add form empty after an edit drawer was closed without saving", async () => {
    stubFetch(answer);
    renderStaff();
    await openEditDrawer();
    await waitFor(() => expect(input("name").value).toBe("Jasur Aliyev"));
    fireEvent.change(input("name"), { target: { value: "Edited but not saved" } });

    fireEvent.keyDown(document.querySelector(".MuiDrawer-root")!, { key: "Escape" });
    await waitFor(() => expect(document.querySelector('input[name="name"]')).toBeNull());
    fireEvent.click(await screen.findByRole("button", { name: /ADD NEW/i }));

    await waitFor(() => expect(input("name").value).toBe(""));
    expect(input("phone").value).toBe("");
    expect(input("jobTitle").value).toBe("");
    expect((screen.getByRole("checkbox", { name: "Kassa Xodimi" }) as HTMLInputElement).checked).toBe(false);
    expect(screen.queryByText("Leave empty to keep the current password.")).toBeNull();
  });
});

describe("Staff page: creating", () => {
  const pickPosition = (name: string) => fireEvent.click(screen.getByRole("checkbox", { name }));

  const openAdd = async () => {
    fireEvent.click(await screen.findByRole("button", { name: /ADD NEW/i }));
    await screen.findByRole("checkbox", { name: "CEO" });
  };

  it("attaches a CEO only to the branch selected in the header, never to every branch", async () => {
    store.dispatch(setSelectedBranchId("b2"));
    const { requests } = stubFetch(answer);
    renderStaff();
    await openAdd();

    fireEvent.change(input("name"), { target: { value: "New Ceo" } });
    fireEvent.change(input("phone"), { target: { value: "931112233" } });
    pickPosition("CEO");
    submit();

    await screen.findByText("Staff member added");
    const [post] = writes(requests);
    expect(`${post.method} ${path(post)}`).toBe("POST /users");
    const fields = await readFormData(post);
    expect(fields.filter(([k]) => k === "branchIds[]")).toEqual([["branchIds[]", "b2"]]);
    expect(fields).toContainEqual(["rolePermissionId", "rp-ceo"]);
    expect(fields).toContainEqual(["phone", "+998931112233"]);
  });

  it("with All branches selected, a CEO gets exactly the branches the creator ticked", async () => {
    const { requests } = stubFetch(answer);
    renderStaff();
    await openAdd();

    fireEvent.change(input("name"), { target: { value: "New Ceo" } });
    fireEvent.change(input("email"), { target: { value: "ceo@example.com" } });
    pickPosition("CEO");
    // the branch picker is there for a CEO like for everyone else; no branch is chosen for them
    expect(screen.getByText("Branches", { selector: "span" })).toBeTruthy();
    submit();

    await screen.findByText("Staff member added");
    const fields = await readFormData(writes(requests)[0]);
    expect(fields.some(([k]) => k === "branchIds[]")).toBe(false);
  });

  it("explains which branch a new account is going to when the header has one selected", async () => {
    store.dispatch(setSelectedBranchId("b1"));
    stubFetch(answer);
    renderStaff();
    await openAdd();

    expect(await screen.findByText(/will be added to the "Chilonzor" branch/)).toBeTruthy();
  });

  it("shows the problem next to the submit button when the form is not valid", async () => {
    const { requests } = stubFetch(answer);
    renderStaff();
    await openAdd();

    submit();

    expect((await screen.findAllByText("Name is required")).length).toBeGreaterThan(0);
    expect(writes(requests)).toHaveLength(0);
  });
});
