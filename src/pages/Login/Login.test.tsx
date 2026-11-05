import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { store } from "../../app/store";
import { logout } from "../../app/store/authSlice";
import { setSelectedBranchId } from "../../app/store/branchSlice";
import { jsonResponse, readFormData, stubFetch } from "../../test/fetchStub";
import { renderWithStore } from "../../test/renderWithStore";
import LoginPage from "./Login";

vi.setConfig({ testTimeout: 20_000 });

const LOGIN_OK = (role: string) => ({
  success: true,
  message: "ok",
  data: { user: { id: "u1", email: "t@ya.uz", phone: "+998901234567", role }, token: "tok-1", refreshToken: "ref-1" },
});

const fill = (identifier: string, password: string) => {
  fireEvent.change(screen.getByLabelText(/Email or phone number/), { target: { value: identifier } });
  fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: password } });
};
const submit = () => fireEvent.click(screen.getByRole("button", { name: "Login" }));

beforeEach(() => {
  store.dispatch(logout());
});
afterEach(() => {
  act(() => {
    store.dispatch(logout());
  });
});

describe("Login page", () => {
  it("signs a teacher in with a phone typed the way it is read out, sending the password untouched", async () => {
    const { requests } = stubFetch(() => jsonResponse(LOGIN_OK("TEACHER")));
    renderWithStore(<LoginPage />);

    fill("  +998 (90) 123-45-67 ", " pass 123 ");
    submit();

    await waitFor(() => expect(store.getState().auth.token).toBe("tok-1"));
    expect(store.getState().auth.role).toBe("TEACHER");
    expect(requests).toHaveLength(1);
    expect(await readFormData(requests[0])).toEqual([
      ["identifier", "+998901234567"],
      ["password", " pass 123 "],
    ]);
  });

  it("starts the new session with no branch selected, whoever it is (a branch left by an earlier session is not inherited)", async () => {
    localStorage.setItem("selectedBranchId", "branch-of-an-earlier-ceo");
    store.dispatch(setSelectedBranchId("branch-of-an-earlier-ceo"));
    stubFetch(() => jsonResponse(LOGIN_OK("ADMIN")));
    renderWithStore(<LoginPage />);

    fill("director@ya.uz", "secret1");
    submit();

    await waitFor(() => expect(store.getState().auth.token).toBe("tok-1"));
    expect(store.getState().branch.selectedBranchId).toBeNull();
    expect(localStorage.getItem("selectedBranchId")).toBeNull();
  });

  it("shows the backend's wrong-credentials message for a 401, after trying the equivalent spellings", async () => {
    const { requests } = stubFetch(() =>
      jsonResponse({ success: false, error: ["Login yoki parol noto'g'ri"], statusCode: 401 }, { status: 401 }),
    );
    renderWithStore(<LoginPage />);

    fill("901234567", "wrong-one");
    submit();

    expect(await screen.findByText("Login yoki parol noto'g'ri")).toBeTruthy();
    expect(requests).toHaveLength(2); // +998901234567, then 901234567
    expect(store.getState().auth.token).toBeNull();
  });

  it("falls back to the stock wrong-login-or-password text when a 401 carries no message", async () => {
    stubFetch(() => new Response("", { status: 401 }));
    renderWithStore(<LoginPage />);

    fill("teacher@ya.uz", "wrong-one");
    submit();

    expect(await screen.findByText("Incorrect login or password. Please try again.")).toBeTruthy();
  });

  it("does not call a broken server wrong credentials", async () => {
    stubFetch(() => new Response("", { status: 500 }));
    renderWithStore(<LoginPage />);

    fill("teacher@ya.uz", "secret1");
    submit();

    expect(await screen.findByText(/could not process the login/)).toBeTruthy();
    expect(screen.queryByText(/Incorrect login or password/)).toBeNull();
  });

  it("reports a failure to reach the server as a network problem", async () => {
    stubFetch(() => {
      throw new TypeError("Failed to fetch");
    });
    renderWithStore(<LoginPage />);

    fill("teacher@ya.uz", "secret1");
    submit();

    expect(await screen.findByText(/Network error/)).toBeTruthy();
  });

  it("does not call a failure after a successful login 'wrong login or password'", async () => {
    // The credentials were accepted, but the answer carries nothing to start a session with.
    stubFetch(() => jsonResponse({ success: true, message: "ok", data: { user: { id: "u1", role: "TEACHER" } } }));
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
    renderWithStore(<LoginPage />);

    fill("teacher@ya.uz", "secret1");
    submit();

    expect(await screen.findByText(/signed in, but the session could not be started/)).toBeTruthy();
    expect(screen.queryByText(/Incorrect login or password/)).toBeNull();
    expect(store.getState().auth.token).toBeNull();
    expect(logged).toHaveBeenCalled();
  });

  it("keeps the button off until there is both a login and a password", async () => {
    const { requests } = stubFetch(() => jsonResponse(LOGIN_OK("TEACHER")));
    renderWithStore(<LoginPage />);

    fill("   ", "secret1");
    expect((screen.getByRole("button", { name: "Login" }) as HTMLButtonElement).disabled).toBe(true);
    expect(requests).toHaveLength(0);
  });
});
