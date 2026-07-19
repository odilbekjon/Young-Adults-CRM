// src/pages/groups/styles.ts
import React from "react";

export const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #e0e0e0",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 13,
  color: "#1a1a1a",
  outline: "none",
  boxSizing: "border-box",
  background: "#fff",
  fontFamily: "inherit",
};

export const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: "#1a1a1a",
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
  background: "#fff",
  color: "#666",
  border: "1px solid #e0e0e0",
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

export const PAYMENT_METHODS_LEFT = ["Cash", "Card", "Bank account", "Payme"] as const;
export const PAYMENT_METHODS_RIGHT = ["Click", "Uzum", "Humo"] as const;