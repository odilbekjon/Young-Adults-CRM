import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { render, type RenderResult } from "@testing-library/react";
// The app's i18n instance (English is forced in setup.ts), shared by every useTranslation().
import "../i18n";
import { store } from "../app/store";

const withStore = (ui: ReactNode) => <Provider store={store}>{ui}</Provider>;

// Renders inside the app's real Redux store, so components and hooks that read
// auth/branch state or RTK Query run exactly as they do in the app. rerender()
// keeps the same provider around the new element.
export const renderWithStore = (ui: ReactNode): RenderResult => {
  const result = render(withStore(ui));
  return { ...result, rerender: (next: ReactNode) => result.rerender(withStore(next)) };
};
