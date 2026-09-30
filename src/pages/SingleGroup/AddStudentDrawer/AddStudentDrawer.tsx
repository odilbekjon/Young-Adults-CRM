import { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { CircularProgress, Dialog, Grow } from "@mui/material";
import { MdClose, MdSearch, MdCheckCircle, MdAcUnit } from "react-icons/md";
import { DatePickerField } from "../DatePickerField";
import { useAllStudentsQuery } from "../../../app/api/studentsApi";
import type { RootState } from "../../../app/store";

export interface AddStudentOption {
  id: string;
  name: string;
  phone: string;
}

// What the modal hands back on submit — mirrors POST /student-groups' own
// optional fields (joinedAt, customPrice, discountReason). status /
// paymentStartDate are deliberately not exposed here: SingleGroup always
// creates the membership on PROBATION (no payment start date) and freezes it
// right after, so a new student never reads as active until staff explicitly
// activate them.
export interface AddStudentPayload {
  studentId: string;
  joinedAt?: string;
  customPrice?: number;
  discountReason?: string;
}

const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_RESULT_LIMIT = 20;

const pad = (n: number) => String(n).padStart(2, "0");
// Local calendar date (not toISOString(), which is UTC and rolls back a day
// for the first hours after midnight in UTC+5).
const todayLocalISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const digitsOnly = (s: string) => s.replace(/\D/g, "");

const initialsOf = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "var(--color-text-primary, #1a1a1a)",
  marginBottom: 6,
  display: "block",
};

const fieldStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  height: 40,
  border: "1px solid var(--color-border, #e0e0e0)",
  borderRadius: 8,
  padding: "0 12px",
  fontSize: 13.5,
  color: "var(--color-text-primary, #1a1a1a)",
  background: "var(--color-surface, #fff)",
  outline: "none",
  fontFamily: "inherit",
};

const submitBtn: React.CSSProperties = {
  background: "var(--color-primary, #185fa5)",
  color: "#fff",
  border: "none",
  borderRadius: 999,
  padding: "11px 32px",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  transition: "opacity 0.15s, background 0.15s",
};

const ghostBtn: React.CSSProperties = {
  background: "transparent",
  color: "var(--color-text-secondary, #666)",
  border: "1px solid var(--color-border, #e0e0e0)",
  borderRadius: 999,
  padding: "11px 24px",
  fontSize: 14,
  cursor: "pointer",
};

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

// Centered "Add student" modal — MUI Dialog with a Grow (fade + scale)
// transition (~220ms). The student is found by searching (GET /students?
// search=), not picked from a pre-loaded <select>: the old select only knew
// about the first 100 students of the branch, so anyone beyond that could
// never be added.
export const AddStudentDrawer = ({
  open, onClose, memberStatusById, onSubmit, isSubmitting,
}: {
  open: boolean;
  onClose: () => void;
  // studentId -> "active" (currently in this group, incl. frozen/trial) or
  // "archived" (has an INACTIVE/DELETED membership here) — such students are
  // still listed in the search results, just marked and not selectable.
  memberStatusById: Record<string, "active" | "archived">;
  onSubmit: (payload: AddStudentPayload) => void;
  isSubmitting?: boolean;
}) => {
  const { t } = useTranslation();
  const selectedBranchId = useSelector((s: RootState) => s.branch.selectedBranchId);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selected, setSelected] = useState<AddStudentOption | null>(null);
  const [joinedAt, setJoinedAt] = useState(todayLocalISO());
  const [customPrice, setCustomPrice] = useState("");
  const [discountReason, setDiscountReason] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query]);

  // Fresh form every time the modal opens (not on close, so the fields don't
  // visibly blank out during the exit animation).
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setDebouncedQuery("");
    setSelected(null);
    setJoinedAt(todayLocalISO());
    setCustomPrice("");
    setDiscountReason("");
  }, [open]);

  const {
    data: searchData, isFetching: isSearching, isError: searchFailed,
  } = useAllStudentsQuery(
    { page: 1, limit: SEARCH_RESULT_LIMIT, search: debouncedQuery || undefined, branchId: selectedBranchId ?? undefined },
    { skip: !open || Boolean(selected) },
  );

  // GET /students' `search` param isn't confirmed to be honored server-side
  // (see the same note in Header's SearchBar), so results are also narrowed
  // client-side by name / phone (digits-only for phone, so "90 123" matches
  // "+998 90 123 45 67").
  const results = useMemo(() => {
    const rows = searchData?.data ?? [];
    const q = debouncedQuery.toLowerCase();
    if (!q) return rows;
    const qDigits = digitsOnly(q);
    return rows.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.phone?.includes(q) ||
        (qDigits.length > 0 && digitsOnly(s.phone ?? "").includes(qDigits)),
    );
  }, [searchData, debouncedQuery]);

  const priceNumber = customPrice.trim() === "" ? undefined : Number(customPrice);
  const priceInvalid = priceNumber !== undefined && (!Number.isFinite(priceNumber) || priceNumber < 0);
  const canSubmit = Boolean(selected) && !priceInvalid && !isSubmitting;

  const handleSubmit = () => {
    if (!selected || !canSubmit) return;
    onSubmit({
      studentId: selected.id,
      joinedAt: joinedAt || undefined,
      customPrice: priceNumber,
      // The reason only means something alongside a custom price (Swagger:
      // "chegirma sababi, customPrice kiritilsa").
      discountReason: priceNumber !== undefined ? discountReason.trim() || undefined : undefined,
    });
  };

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      TransitionComponent={Grow}
      transitionDuration={{ enter: 240, exit: 160 }}
      maxWidth={false}
      PaperProps={{
        sx: {
          width: 560, maxWidth: "calc(100vw - 32px)", borderRadius: "16px",
          bgcolor: "var(--color-surface, #fff)", backgroundImage: "none",
          boxShadow: "0 24px 70px rgba(0,0,0,0.25)",
        },
      }}
    >
      {/* header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "20px 28px", borderBottom: "1px solid var(--color-border-subtle, #f0f0f0)",
      }}>
        <span style={{ fontSize: 19, fontWeight: 700, color: "var(--color-text-primary, #1a1a1a)" }}>
          {t("singleGroup.addStudentDrawer.title")}
        </span>
        <button
          type="button"
          onClick={handleClose}
          aria-label={t("singleGroup.addStudentDrawer.cancel")}
          style={{
            border: "none", background: "transparent", cursor: "pointer",
            color: "var(--color-text-muted, #888)", display: "flex", padding: 4, borderRadius: 6,
          }}
        >
          <MdClose size={22} />
        </button>
      </div>

      <div style={{ padding: "22px 28px 26px", display: "flex", flexDirection: "column", gap: 20 }}>
        {/* student: search, or the chosen student's card */}
        <div>
          <label style={labelStyle}>{t("singleGroup.addStudentDrawer.searchStudent")}</label>

          {selected ? (
            <div style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
              border: "1px solid var(--color-primary, #185fa5)", borderRadius: 10,
              background: "var(--color-primary-surface, #f0f7ff)",
            }}>
              <Avatar name={selected.name} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                  fontSize: 14, fontWeight: 600, color: "var(--color-text-primary, #1a1a1a)",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  {selected.name}
                </div>
                {selected.phone && (
                  <div style={{ fontSize: 12.5, color: "var(--color-text-secondary, #6b7a8d)" }}>{selected.phone}</div>
                )}
              </div>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => { setSelected(null); setTimeout(() => searchRef.current?.focus(), 0); }}
                style={{
                  border: "1px solid var(--color-border, #e0e0e0)", background: "var(--color-surface, #fff)",
                  color: "var(--color-primary, #185fa5)", borderRadius: 999, padding: "5px 14px",
                  fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                }}
              >
                {t("singleGroup.addStudentDrawer.change")}
              </button>
            </div>
          ) : (
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
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("singleGroup.addStudentDrawer.searchPlaceholder")}
                  disabled={isSubmitting}
                  style={{ ...fieldStyle, height: 42, paddingLeft: 38, paddingRight: 38 }}
                />
                {isSearching && (
                  <CircularProgress
                    size={16} thickness={5}
                    style={{ position: "absolute", right: 12, top: "50%", marginTop: -8 }}
                  />
                )}
              </div>

              <div style={{
                marginTop: 8, maxHeight: 200, overflowY: "auto",
                border: "1px solid var(--color-border, #e0e0e0)", borderRadius: 10,
                background: "var(--color-surface, #fff)",
              }}>
                {searchFailed ? (
                  <div style={{ padding: 14, fontSize: 13, color: "var(--color-danger, #d93f4f)" }}>
                    {t("singleGroup.addStudentDrawer.searchError")}
                  </div>
                ) : results.length === 0 ? (
                  <div style={{ padding: 14, fontSize: 13, color: "var(--color-text-muted, #9ca3af)" }}>
                    {isSearching ? t("singleGroup.addStudentDrawer.searching") : t("singleGroup.addStudentDrawer.noStudentsFound")}
                  </div>
                ) : (
                  results.map((s) => {
                    const memberStatus = memberStatusById[s.id];
                    const disabled = Boolean(memberStatus);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => setSelected({ id: s.id, name: s.name, phone: s.phone ?? "" })}
                        onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = "var(--color-surface-hover, #f0f4f9)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                        style={{
                          display: "flex", alignItems: "center", gap: 12, width: "100%",
                          padding: "9px 14px", border: "none", background: "transparent",
                          textAlign: "left", cursor: disabled ? "not-allowed" : "pointer",
                          opacity: disabled ? 0.55 : 1, fontFamily: "inherit",
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
                        {memberStatus && (
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0,
                            fontSize: 11.5, fontWeight: 600, padding: "3px 9px", borderRadius: 999,
                            background: "var(--color-surface-alt, #f5f6f8)", color: "var(--color-text-secondary, #6b7a8d)",
                          }}>
                            <MdCheckCircle size={13} />
                            {memberStatus === "archived"
                              ? t("singleGroup.addStudentDrawer.inGroupArchived")
                              : t("singleGroup.addStudentDrawer.alreadyInGroup")}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        {/* joinedAt */}
        <div>
          <label style={labelStyle}>{t("singleGroup.addStudentDrawer.startDate")}</label>
          <DatePickerField value={joinedAt} onChange={setJoinedAt} disabled={isSubmitting} />
        </div>

        {/* customPrice + discountReason (optional) */}
        <div>
          <label style={labelStyle}>
            {t("singleGroup.addStudentDrawer.customPrice")}{" "}
            <span style={{ fontWeight: 400, color: "var(--color-text-muted, #9ca3af)" }}>
              ({t("singleGroup.addStudentDrawer.optional")})
            </span>
          </label>
          <div style={{ position: "relative" }}>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={customPrice}
              onChange={(e) => setCustomPrice(e.target.value)}
              placeholder={t("singleGroup.addStudentDrawer.customPricePlaceholder")}
              disabled={isSubmitting}
              style={{
                ...fieldStyle, paddingRight: 52,
                borderColor: priceInvalid ? "var(--color-danger, #d93f4f)" : undefined,
              }}
            />
            <span style={{
              position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
              fontSize: 12, color: "var(--color-text-muted, #9ca3af)", pointerEvents: "none",
            }}>
              UZS
            </span>
          </div>
          {priceInvalid && (
            <div style={{ fontSize: 12, color: "var(--color-danger, #d93f4f)", marginTop: 4 }}>
              {t("singleGroup.addStudentDrawer.customPriceInvalid")}
            </div>
          )}
        </div>

        {priceNumber !== undefined && !priceInvalid && (
          <div>
            <label style={labelStyle}>{t("singleGroup.addStudentDrawer.discountReason")}</label>
            <input
              value={discountReason}
              onChange={(e) => setDiscountReason(e.target.value)}
              placeholder={t("singleGroup.addStudentDrawer.discountReasonPlaceholder")}
              disabled={isSubmitting}
              style={fieldStyle}
            />
          </div>
        )}

        {/* the business rule, stated up front so a frozen roster row isn't a surprise */}
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, lineHeight: 1.45,
          color: "var(--color-text-secondary, #6b7a8d)", background: "var(--color-surface-alt, #f5f6f8)",
          borderRadius: 8, padding: "9px 12px",
        }}>
          <MdAcUnit size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{t("singleGroup.addStudentDrawer.frozenNote")}</span>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" style={ghostBtn} onClick={handleClose} disabled={isSubmitting}>
            {t("singleGroup.addStudentDrawer.cancel")}
          </button>
          <button
            type="button"
            style={{ ...submitBtn, opacity: canSubmit ? 1 : 0.5, cursor: canSubmit ? "pointer" : "not-allowed" }}
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {isSubmitting ? "…" : t("singleGroup.addStudentDrawer.submit")}
          </button>
        </div>
      </div>
    </Dialog>
  );
};

export default AddStudentDrawer;
