/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { ThemeProvider as MuiThemeProvider, createTheme } from "@mui/material/styles";

export type ThemeMode = "light" | "dark";

const STORAGE_KEY = "appTheme";

interface ThemeModeContextValue {
  mode: ThemeMode;
  toggleMode: () => void;
  setMode: (mode: ThemeMode) => void;
}

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

export const useThemeMode = (): ThemeModeContextValue => {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) throw new Error("useThemeMode must be used inside ThemeModeProvider");
  return ctx;
};

const getInitialMode = (): ThemeMode => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

interface ProviderProps {
  children: ReactNode;
}

export const ThemeModeProvider = ({ children }: ProviderProps) => {
  const [mode, setModeState] = useState<ThemeMode>(getInitialMode);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", mode === "dark");
  }, [mode]);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  const toggleMode = () => setMode(mode === "dark" ? "light" : "dark");

  const muiTheme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: { main: mode === "dark" ? "#4d9fe0" : "#185fa5" },
          background: {
            default: mode === "dark" ? "#0d1220" : "#f4f6fa",
            paper: mode === "dark" ? "#141a29" : "#ffffff",
          },
        },
        typography: { fontFamily: "Inter, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif" },
      }),
    [mode]
  );

  return (
    <ThemeModeContext.Provider value={{ mode, toggleMode, setMode }}>
      <MuiThemeProvider theme={muiTheme}>{children}</MuiThemeProvider>
    </ThemeModeContext.Provider>
  );
};
