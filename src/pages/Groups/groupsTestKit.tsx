// Shared by the Groups page tests: a small two-branch world, a fake backend for
// it and the page rendered inside the app's real providers.
import { fireEvent, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { API_BASE_URL } from "../../app/api/baseApi";
import { BranchProvider } from "../../Context/BranchContext";
import { DataProvider } from "../../Context/DataContext";
import { ToastProvider } from "../../Context/ToastContext";
import { jsonResponse, type SentRequest } from "../../test/fetchStub";
import { renderWithStore } from "../../test/renderWithStore";
import { Groups } from "./Groups";

export const IELTS = "b-ielts";
export const GRAMMAR = "b-grammar";
// An active branch that has no course yet, and one that is closed.
export const NEW_BRANCH = "b-new";
export const CLOSED = "b-closed";

export const BRANCHES = [
  { id: IELTS, name: "YA IELTS Campus", status: "ACTIVE" },
  { id: GRAMMAR, name: "Grammar Campus", status: "ACTIVE" },
  { id: NEW_BRANCH, name: "New Campus", status: "ACTIVE" },
  { id: CLOSED, name: "Closed Campus", status: "INACTIVE" },
];

// GET /auth/me for a CEO (sees every branch) and for staff tied to given branches.
export const CEO_ME = { id: "u-ceo", role: "SUPERADMIN", roles: [], rolePermissions: [], branchIds: [], branches: [] };
export const staffMe = (...own: typeof BRANCHES) => ({
  id: "u-staff", role: "ADMIN", roles: ["ADMIN"], rolePermissions: [],
  branchIds: own.map((b) => b.id),
  branches: own.map((b) => ({ branchId: b.id, branch: b })),
});

const ieltsBranch = BRANCHES[0];
const grammarBranch = BRANCHES[1];

export const COURSES = [
  { id: "c-ielts", name: "IELTS Intensive", status: "ACTIVE", branchId: IELTS, branch: ieltsBranch, months: 3 },
  { id: "c-grammar", name: "Grammar Basic", status: "ACTIVE", branchId: GRAMMAR, branch: grammarBranch, months: 2 },
  { id: "c-ielts-old", name: "IELTS Archived", status: "INACTIVE", branchId: IELTS, branch: ieltsBranch },
];

export const ROOMS = [
  { id: "r-ielts", name: "Room A", status: "ACTIVE", branchId: IELTS, branch: ieltsBranch },
  { id: "r-grammar", name: "Room B", status: "ACTIVE", branchId: GRAMMAR, branch: grammarBranch },
];

// A running group of the Grammar Campus (its course belongs to that branch).
export const GRAMMAR_GROUP = {
  id: "g-grammar",
  name: "Grammar Evening",
  status: "ACTIVE",
  courseId: "c-grammar",
  roomId: null,
  days: [],
  time: null,
  weekOfStudy: null,
  trainingStart: null,
  trainingEnd: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  daysType: "OTHER",
  course: { id: "c-grammar", name: "Grammar Basic", branchId: GRAMMAR },
  room: null,
  teachers: [],
  students: [],
};

// The same group with a room of its branch and a teacher who is not in the
// header branch's teacher list.
export const GRAMMAR_GROUP_WITH_ROOM = {
  ...GRAMMAR_GROUP,
  roomId: "r-grammar",
  room: { id: "r-grammar", name: "Room B", branchId: GRAMMAR },
  teachers: [{ id: "t-own", name: "Olim", role: "TEACHER", photo: null, phone: "" }],
};

export const path = (request: SentRequest) => request.url.replace(API_BASE_URL, "");

export const answerWith = (groups: unknown[] = [], me?: unknown) => (request: SentRequest) => {
  const p = path(request);
  if (request.method === "GET") {
    if (p.startsWith("/auth/me")) return jsonResponse({ success: true, data: me });
    if (p.startsWith("/auth/sidebar")) return jsonResponse({ success: true, data: { allAccess: false, labels: [] } });
    if (p.startsWith("/courses/select")) return jsonResponse({ success: true, data: COURSES.map(({ id, name }) => ({ id, name })) });
    if (p.startsWith("/courses")) return jsonResponse({ success: true, data: COURSES });
    if (p.startsWith("/rooms")) return jsonResponse({ success: true, data: ROOMS });
    if (p.startsWith("/branches")) return jsonResponse({ success: true, data: BRANCHES });
    if (p.startsWith("/teachers/select")) return jsonResponse({ success: true, data: [{ id: "t1", name: "Aziz" }] });
    if (p.startsWith("/tags/select")) return jsonResponse({ success: true, data: [] });
    if (p.startsWith("/student-groups")) return jsonResponse({ success: true, data: [] });
    if (p.startsWith("/groups")) return jsonResponse({ success: true, data: groups, meta: { total: groups.length, page: 1, limit: 100, totalPages: 1 } });
  }
  return jsonResponse({ success: true, data: { id: "g-new" } });
};

export const renderGroups = () =>
  renderWithStore(
    <MemoryRouter>
      <DataProvider>
        <BranchProvider>
          <ToastProvider>
            <Groups />
          </ToastProvider>
        </BranchProvider>
      </DataProvider>
    </MemoryRouter>,
  );

export const field = (name: string) => document.querySelector<HTMLInputElement>(`input[name="${name}"]`)!;

// The visible dropdown of a MUI select is the element just before its hidden
// input (which carries the name and the value).
const dropdown = (name: string) => field(name).previousElementSibling as HTMLElement;

export const openSelect = (name: string) => fireEvent.mouseDown(dropdown(name));

export const optionTexts = () => screen.queryAllByRole("option").map((option) => option.textContent);

export const pickOption = (text: string) => fireEvent.click(screen.getByRole("option", { name: text }));

export const openAddDrawer = async () => {
  fireEvent.click(await screen.findByRole("button", { name: "Add New" }));
  await screen.findByText("Add New Group");
};

export const submit = () => fireEvent.click(screen.getByRole("button", { name: "Submit" }));

export const posts = (requests: SentRequest[]) => requests.filter((r) => r.method === "POST");
