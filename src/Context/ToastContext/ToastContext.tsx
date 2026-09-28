import { createContext, useCallback, useContext, useState, ReactNode } from "react";
import { Snackbar, Alert, type AlertColor } from "@mui/material";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ToastContextValue {
  showToast: (message: string, severity?: AlertColor) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

interface ToastState {
  message: string;
  severity: AlertColor;
  key: number;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
};

// ─── Provider ─────────────────────────────────────────────────────────────────

interface ProviderProps {
  children: ReactNode;
}

export const ToastProvider = ({ children }: ProviderProps) => {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, severity: AlertColor = "success") => {
    setToast({ message, severity, key: Date.now() });
  }, []);

  const success = useCallback((message: string) => showToast(message, "success"), [showToast]);
  const error = useCallback((message: string) => showToast(message, "error"), [showToast]);

  const handleClose = () => setToast(null);

  return (
    <ToastContext.Provider value={{ showToast, success, error }}>
      {children}
      <Snackbar
        key={toast?.key}
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        sx={{ mt: 1 }}
      >
        <Alert
          onClose={handleClose}
          severity={toast?.severity ?? "success"}
          variant="filled"
          sx={{
            fontSize: 13,
            fontWeight: 500,
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            // Brand accent for status/success toasts — the project has no
            // dedicated "brand yellow" token, so this reuses the existing
            // amber --color-warning var (light/dark aware) instead of MUI's
            // default green. Errors keep MUI's red for clear severity.
            ...((toast?.severity ?? "success") === "success" && {
              backgroundColor: "var(--color-warning)",
              color: "#1a2332",
              "& .MuiAlert-icon": { color: "#1a2332" },
              "& .MuiAlert-action .MuiIconButton-root": { color: "#1a2332" },
            }),
          }}
        >
          {toast?.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
};
