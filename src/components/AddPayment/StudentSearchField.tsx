import { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { CircularProgress } from "@mui/material";
import { MdSearch } from "react-icons/md";
import { useAllStudentsQuery } from "../../app/api/studentsApi/studentsApi";
import type { RootState } from "../../app/store";
import { inputStyle } from "../../pages/SingleGroup/styles/styles";

export interface SearchedStudent {
  id: string;
  name: string;
  phone?: string;
  balance?: number;
}

const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_RESULT_LIMIT = 20;

const digitsOnly = (s: string) => s.replace(/\D/g, "");

const initialsOf = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";

const Avatar = ({ name }: { name: string }) => (
  <div
    style={{
      width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
      background: "var(--color-primary-surface, #f0f7ff)", color: "var(--color-primary, #185fa5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 12.5, fontWeight: 700,
    }}
  >
    {initialsOf(name)}
  </div>
);

// Search-as-you-type student picker (same pattern as SingleGroup's Add
// student modal): typing queries GET /students?search= (debounced, limit 20)
// instead of loading a fixed first-N list into a <select>, so any student can
// be found. The chosen student is shown as a card with a "Change" button.
export const StudentSearchField = ({ active, value, onChange, disabled }: {
  // Whether the surrounding form is open — the search query only runs while
  // it is, and the input is reset every time it (re)opens.
  active: boolean;
  value: SearchedStudent | null;
  onChange: (student: SearchedStudent | null) => void;
  disabled?: boolean;
}) => {
  const { t } = useTranslation();
  const selectedBranchId = useSelector((s: RootState) => s.branch.selectedBranchId);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    if (!active) return;
    setQuery("");
    setDebouncedQuery("");
  }, [active]);

  const { data, isFetching, isError } = useAllStudentsQuery(
    { page: 1, limit: SEARCH_RESULT_LIMIT, search: debouncedQuery || undefined, branchId: selectedBranchId ?? undefined },
    { skip: !active || Boolean(value) },
  );

  // GET /students' `search` param isn't confirmed to be honored server-side,
  // so results are also narrowed client-side by name / phone (digits-only for
  // phone, so "90 123" matches "+998 90 123 45 67").
  const results = useMemo(() => {
    const rows = data?.data ?? [];
    const q = debouncedQuery.toLowerCase();
    if (!q) return rows;
    const qDigits = digitsOnly(q);
    return rows.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.phone?.includes(q) ||
        (qDigits.length > 0 && digitsOnly(s.phone ?? "").includes(qDigits)),
    );
  }, [data, debouncedQuery]);

  if (value) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
        border: "1px solid var(--color-primary, #185fa5)", borderRadius: 10,
        background: "var(--color-primary-surface, #f0f7ff)",
      }}>
        <Avatar name={value.name} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: 14, fontWeight: 600, color: "var(--color-text-primary, #1a1a1a)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {value.name}
          </div>
          {value.phone && (
            <div style={{ fontSize: 12.5, color: "var(--color-text-secondary, #6b7a8d)" }}>{value.phone}</div>
          )}
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => { onChange(null); setTimeout(() => searchRef.current?.focus(), 0); }}
          style={{
            border: "1px solid var(--color-border, #e0e0e0)", background: "var(--color-surface, #fff)",
            color: "var(--color-primary, #185fa5)", borderRadius: 999, padding: "5px 14px",
            fontSize: 12.5, fontWeight: 600, cursor: disabled ? "default" : "pointer",
          }}
        >
          {t("addPayment.changeStudent")}
        </button>
      </div>
    );
  }

  return (
    <>
      <div style={{ position: "relative" }}>
        <MdSearch
          size={18}
          style={{
            position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
            color: "var(--color-text-muted, #9ca3af)", pointerEvents: "none",
          }}
        />
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("addPayment.searchPlaceholder")}
          disabled={disabled}
          style={{ ...inputStyle, paddingLeft: 38, paddingRight: 38 }}
        />
        {isFetching && (
          <CircularProgress
            size={16} thickness={5}
            style={{ position: "absolute", right: 12, top: "50%", marginTop: -8 }}
          />
        )}
      </div>

      <div style={{
        marginTop: 8, maxHeight: 220, overflowY: "auto",
        border: "1px solid var(--color-border, #e0e0e0)", borderRadius: 10,
        background: "var(--color-surface, #fff)",
      }}>
        {isError ? (
          <div style={{ padding: 14, fontSize: 13, color: "var(--color-danger, #d93f4f)" }}>
            {t("addPayment.studentError")}
          </div>
        ) : results.length === 0 ? (
          <div style={{ padding: 14, fontSize: 13, color: "var(--color-text-muted, #9ca3af)" }}>
            {isFetching ? t("addPayment.searching") : t("addPayment.noStudentsFound")}
          </div>
        ) : (
          results.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onChange({ id: s.id, name: s.name, phone: s.phone ?? "", balance: s.balance })}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-surface-hover, #f0f4f9)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              style={{
                display: "flex", alignItems: "center", gap: 12, width: "100%",
                padding: "9px 14px", border: "none", background: "transparent",
                textAlign: "left", cursor: "pointer", fontFamily: "inherit",
                borderBottom: "1px solid var(--color-border-subtle, #f0f0f0)",
              }}
            >
              <Avatar name={s.name} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                  fontSize: 13.5, fontWeight: 600, color: "var(--color-text-primary, #1a1a1a)",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  {s.name}
                </div>
                {s.phone && (
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary, #6b7a8d)" }}>{s.phone}</div>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </>
  );
};
