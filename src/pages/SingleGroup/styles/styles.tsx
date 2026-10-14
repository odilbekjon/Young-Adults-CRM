// src/pages/groups/styles.ts
import React from "react";

export const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 13,
  color: "var(--color-text-primary)",
  outline: "none",
  boxSizing: "border-box",
  background: "var(--color-surface)",
  fontFamily: "inherit",
};

export const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: "var(--color-text-primary)",
  marginBottom: 6,
  display: "block",
};

export const submitBtn: React.CSSProperties = {
  background: "#1a3a5c",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "11px 24px",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

export const cancelBtn: React.CSSProperties = {
  background: "var(--color-surface)",
  color: "var(--color-text-secondary)",
  border: "1px solid var(--color-border)",
  borderRadius: 10,
  padding: "11px 24px",
  fontSize: 14,
  cursor: "pointer",
};

export const paymentSubmitBtn: React.CSSProperties = {
  background: "#72c3d1",
  color: "#fff",
  border: "none",
  borderRadius: 999,
  padding: "12px 32px",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};