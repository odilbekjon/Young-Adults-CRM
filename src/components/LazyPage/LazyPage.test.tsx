import { lazy } from "react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
// The app's i18n instance (English is forced in setup.ts).
import "../../i18n";
import { LazyPage } from "./LazyPage";

// A page whose code "arrives" when the test says so.
const deferredPage = (label: string) => {
  let arrive!: () => void;
  const Page = lazy(
    () =>
      new Promise<{ default: () => JSX.Element }>((resolve) => {
        arrive = () => resolve({ default: () => <p>{label}</p> });
      }),
  );
  return { Page, arrive: () => arrive() };
};

describe("LazyPage", () => {
  it("shows a spinner while the page's code is downloading, then the page", async () => {
    const { Page, arrive } = deferredPage("Students page");
    render(
      <MemoryRouter>
        <LazyPage>
          <Page />
        </LazyPage>
      </MemoryRouter>,
    );

    expect(screen.getByRole("progressbar")).toBeTruthy();
    expect(screen.queryByText("Students page")).toBeNull();

    arrive();
    expect(await screen.findByText("Students page")).toBeTruthy();
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("replaces a page that cannot be loaded with a message and a reload button", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const Broken = lazy(() => Promise.reject(new TypeError("Failed to fetch dynamically imported module")));
    render(
      <MemoryRouter>
        <LazyPage>
          <Broken />
        </LazyPage>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/couldn't be loaded/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reload" })).toBeTruthy();
  });

  it("clears the failure once the user moves to another page", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const Broken = lazy(() => Promise.reject(new Error("boom")));
    render(
      <MemoryRouter initialEntries={["/broken"]}>
        <Link to="/fine">go</Link>
        <Routes>
          <Route path="/broken" element={<LazyPage><Broken /></LazyPage>} />
          <Route path="/fine" element={<LazyPage><p>Fine page</p></LazyPage>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText(/couldn't be loaded/i)).toBeTruthy();

    fireEvent.click(screen.getByText("go"));

    expect(await screen.findByText("Fine page")).toBeTruthy();
    expect(screen.queryByText(/couldn't be loaded/i)).toBeNull();
  });
});
