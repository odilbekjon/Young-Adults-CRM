import { useTranslation } from "react-i18next";
import { MdRadioButtonChecked, MdRadioButtonUnchecked } from "react-icons/md";
import { useGroupByIdQuery } from "../../app/api/groupsApi/groupsApi";

export interface PaymentGroupOption {
  id: string;
  name: string;
  courseName?: string | null;
  // Membership status (ACTIVE / PROBATION / FROZEN) — shown as a small tag
  // when it isn't plain ACTIVE.
  status?: string | null;
  customPrice?: number | null;
}

// Course price arrives either as a plain number or as a serialized
// decimal.js object ({s, e, d: [base-1e7 words]}). The rest of the app reads
// `.d[0]`, which is only right below 10 000 000; this rebuilds the full
// value from the digit words so bigger prices don't get truncated.
const decimalToNumber = (raw: unknown): number | null => {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw === "string" && raw.trim() !== "") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  if (raw && typeof raw === "object") {
    const { s, e, d } = raw as { s?: unknown; e?: unknown; d?: unknown };
    if (Array.isArray(d) && d.length > 0 && typeof e === "number") {
      const digits = d.map((w, i) => (i === 0 ? String(w) : String(w).padStart(7, "0"))).join("");
      const n = Number(`${digits[0]}.${digits.slice(1) || "0"}e${e}`) * (s === -1 ? -1 : 1);
      if (Number.isFinite(n)) return n;
    }
    if (Array.isArray(d)) {
      const n = Number(d[0]);
      return Number.isFinite(n) ? n : null;
    }
  }
  return null;
};

const money = (n: number) => `${n.toLocaleString("ru-RU")} UZS`;

const GroupCard = ({ option, selected, onSelect, disabled }: {
  option: PaymentGroupOption;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}) => {
  const { t } = useTranslation();
  // The membership row has no course price, so it's read from the group
  // itself (GET /groups/{id}; cached — SingleGroup / StudentProfile already
  // load it).
  const { data } = useGroupByIdQuery(option.id);
  const detail = data?.data;
  const courseName = option.courseName || detail?.courseName || null;
  const coursePrice = decimalToNumber(detail?.coursePrice);
  const hasCustom = option.customPrice != null && option.customPrice !== coursePrice;
  const showStatus = option.status && option.status !== "ACTIVE";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      aria-pressed={selected}
      style={{
        display: "flex", alignItems: "flex-start", gap: 10, width: "100%", textAlign: "left",
        padding: "10px 12px", borderRadius: 10, fontFamily: "inherit",
        cursor: disabled ? "default" : "pointer",
        border: `1px solid ${selected ? "var(--color-primary, #185fa5)" : "var(--color-border, #e0e0e0)"}`,
        background: selected ? "var(--color-primary-surface, #f0f7ff)" : "var(--color-surface, #fff)",
      }}
    >
      {selected
        ? <MdRadioButtonChecked size={18} color="var(--color-primary, #185fa5)" style={{ flexShrink: 0, marginTop: 1 }} />
        : <MdRadioButtonUnchecked size={18} color="var(--color-text-muted, #9ca3af)" style={{ flexShrink: 0, marginTop: 1 }} />}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontSize: 13.5, fontWeight: 600, color: "var(--color-text-primary, #1a1a1a)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {option.name}
          </span>
          {showStatus && (
            <span style={{
              fontSize: 10.5, fontWeight: 600, padding: "2px 7px", borderRadius: 999, flexShrink: 0,
              background: "var(--color-surface-alt, #f5f6f8)", color: "var(--color-text-secondary, #6b7a8d)",
            }}>
              {t(`addPayment.groupStatus.${option.status}`, { defaultValue: option.status ?? "" })}
            </span>
          )}
        </div>
        {(courseName || coursePrice != null) && (
          <div style={{ fontSize: 12, color: "var(--color-text-secondary, #6b7a8d)", marginTop: 2 }}>
            {[courseName, coursePrice != null ? money(coursePrice) : null].filter(Boolean).join(" · ")}
          </div>
        )}
        {hasCustom && (
          <div style={{ fontSize: 12, color: "var(--color-text-secondary, #6b7a8d)", marginTop: 1 }}>
            {t("addPayment.customPrice")}: {money(option.customPrice as number)}
          </div>
        )}
      </div>
    </button>
  );
};

// Which of the student's groups this payment is for (POST /finance/payments'
// optional `groupId`). Purely presentational: the selection lives in the
// caller. Clicking the selected group again clears it (payment not tied to
// a group).
export const PaymentGroupPicker = ({ options, value, onChange, isLoading, isError, disabled }: {
  options: PaymentGroupOption[];
  value: string;
  onChange: (groupId: string) => void;
  isLoading?: boolean;
  isError?: boolean;
  disabled?: boolean;
}) => {
  const { t } = useTranslation();

  if (isLoading) {
    return <div style={{ fontSize: 13, color: "var(--color-text-muted, #9ca3af)" }}>{t("addPayment.groupsLoading")}</div>;
  }
  if (isError) {
    return <div style={{ fontSize: 13, color: "var(--color-danger, #d93f4f)" }}>{t("addPayment.groupsError")}</div>;
  }
  if (options.length === 0) {
    return <div style={{ fontSize: 13, color: "var(--color-text-muted, #9ca3af)" }}>{t("addPayment.noGroups")}</div>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {options.map((o) => (
        <GroupCard
          key={o.id}
          option={o}
          selected={o.id === value}
          disabled={disabled}
          onSelect={() => onChange(o.id === value ? "" : o.id)}
        />
      ))}
      {options.length > 1 && !value && (
        <div style={{ fontSize: 12, color: "var(--color-text-muted, #9ca3af)" }}>{t("addPayment.groupHint")}</div>
      )}
    </div>
  );
};
