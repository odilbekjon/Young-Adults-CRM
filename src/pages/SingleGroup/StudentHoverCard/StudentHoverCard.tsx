// src/pages/groups/StudentHoverCard.tsx
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { StudentCardData } from "../types";
import { BALANCE_STATUS_COLOR, classifyBalance } from "../../../utils";

export const StudentHoverCard = ({
  student,
  anchorEl,
  onClose,
  onGoToProfile,
}: {
  student: StudentCardData | null;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onGoToProfile: () => void;
}) => {
  const { t } = useTranslation();
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 300 });

  useEffect(() => {
    if (!anchorEl || !student) return;
    const rect = anchorEl.getBoundingClientRect();
    const cardWidth = Math.min(300, window.innerWidth - 24);
    let left = rect.right + 10;
    if (left + cardWidth > window.innerWidth - 12) left = rect.left - cardWidth - 10;
    // Clamp horizontally too — the flip-left branch above can still run off
    // the left edge on a narrow viewport.
    left = Math.max(12, Math.min(left, window.innerWidth - cardWidth - 12));

    // Clamp vertically too — anchoring to the hovered row's own top edge
    // (as before) pushes the card off the bottom of the screen for rows
    // near the end of a long list. cardRef isn't mounted yet on this first
    // measurement, so a conservative estimate of its full (frozen-student)
    // height is used for the clamp.
    const estimatedCardHeight = cardRef.current?.offsetHeight ?? 440;
    const maxTop = window.innerHeight - estimatedCardHeight - 12;
    const top = Math.max(12, Math.min(rect.top, maxTop));

    setPos({ top, left, width: cardWidth });
  }, [anchorEl, student]);

  useEffect(() => {
    if (!student) return;
    const handler = (e: MouseEvent) => {
      if (
        cardRef.current && !cardRef.current.contains(e.target as Node) &&
        anchorEl && !anchorEl.contains(e.target as Node)
      ) onClose();
    };
    document.addEventListener("mousemove", handler);
    return () => document.removeEventListener("mousemove", handler);
  }, [student, anchorEl, onClose]);

  if (!student || !anchorEl) return null;

  const balanceColor = BALANCE_STATUS_COLOR[classifyBalance(student.balance)];
  const isDebtor = student.balance !== undefined && student.balance < 0;
  // Real account status (ACTIVE/INACTIVE/FROZEN/DEBTOR) once GET
  // /students/{id} resolves — a DEBTOR is still "active" (matches the
  // reference design: a debtor shows "Active (Learns)" plus a separate red
  // Debtor badge, not a distinct status label). Falls back to the group's
  // own `active` boolean during the brief pre-fetch window before real
  // status is known.
  const realStatus = student.status;
  const isFrozenStatus = realStatus ? realStatus === "FROZEN" : !student.active;
  const isInactiveStatus = realStatus === "INACTIVE";
  const showStatusBox = isFrozenStatus || isInactiveStatus;

  return (
    <div
      ref={cardRef}
      style={{
        position: "fixed",
        top: pos.top, left: pos.left,
        zIndex: 9999,
        width: pos.width,
        background: "#fff",
        border: "1px solid #e8e8e8",
        borderRadius: 12,
        boxShadow: "0 8px 32px rgba(0,0,0,0.13)",
        padding: "16px 20px 12px",
        animation: "fadeInCard 0.15s ease",
        pointerEvents: "auto",
      }}
    >
      <style>{`
        @keyframes fadeInCard {
          from { opacity: 0; transform: translateX(6px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a" }}>{student.name}</span>
          <span style={{ fontSize: 12, color: "#aaa" }}>(id:{student.id})</span>
        </div>
        <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
          {isInactiveStatus
            ? t("singleGroup.studentHoverCard.inactiveArchived")
            : isFrozenStatus
            ? t("singleGroup.studentHoverCard.frozenPaused")
            : t("singleGroup.studentHoverCard.activeLearns")}
        </div>
        {isDebtor && (
          <span style={{
            display: "inline-block", marginTop: 6,
            background: BALANCE_STATUS_COLOR.debtor, color: "#fff",
            fontSize: 11, fontWeight: 600, borderRadius: 20, padding: "3px 10px",
          }}>
            {t("singleGroup.studentHoverCard.debtor")}
          </span>
        )}
      </div>

      {showStatusBox && (
        <>
          <div style={{
            background: isDebtor ? "#fff5f5" : "#f1faf4",
            border: `1px solid ${isDebtor ? "#ffcdd2" : "#c8e6c9"}`,
            borderRadius: 10,
            padding: "12px 14px",
            marginBottom: 12,
          }}>
            <div style={{ fontSize: 11, color: "#888", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>
              {isDebtor ? t("singleGroup.studentHoverCard.debt") : t("singleGroup.studentHoverCard.balance")}
            </div>
            <div style={{
              fontSize: 18, fontWeight: 700,
              color: balanceColor,
            }}>
              {student.balance !== undefined
                ? `${student.balance > 0 ? "+" : ""}${student.balance.toLocaleString()} UZS`
                : "—"}
            </div>
            {isFrozenStatus && student.frozenAt && (
              <div style={{ fontSize: 11, color: "#888", marginTop: 6 }}>
                {t("singleGroup.studentHoverCard.frozenAt")}: {student.frozenAt}
              </div>
            )}
          </div>

        </>
      )}

      <hr style={{ border: "none", borderTop: "1px solid #f0f0f0", margin: "0 0 10px" }} />

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: "#aaa", marginBottom: 2 }}>{t("singleGroup.studentHoverCard.phone")}</div>
        <div style={{ fontSize: 13, color: "#1a1a1a", fontWeight: 500 }}>{student.phone}</div>
      </div>

      <hr style={{ border: "none", borderTop: "1px solid #f0f0f0", margin: "0 0 10px" }} />

      {!showStatusBox && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: "#aaa", marginBottom: 4 }}>{t("singleGroup.studentHoverCard.balance")}</div>
          {student.balance !== undefined && student.balance !== 0 ? (
            <span style={{
              display: "inline-block",
              background: balanceColor,
              color: "#fff", fontSize: 12, fontWeight: 600,
              borderRadius: 20, padding: "3px 10px",
            }}>
              {student.balance > 0 ? "+" : ""}
              {student.balance.toLocaleString()} UZS
            </span>
          ) : (
            <span style={{ fontSize: 12, color: "#bbb" }}>—</span>
          )}
        </div>
      )}

      <hr style={{ border: "none", borderTop: "1px solid #f0f0f0", margin: "0 0 10px" }} />

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: "#aaa", marginBottom: 2 }}>{t("singleGroup.studentHoverCard.addedAt")}</div>
        <div style={{ fontSize: 13, color: "#1a1a1a" }}>{student.addedAt || "—"}</div>
      </div>

      <hr style={{ border: "none", borderTop: "1px solid #f0f0f0", margin: "0 0 10px" }} />

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: "#aaa", marginBottom: 2 }}>{t("singleGroup.studentHoverCard.joinedAt")}</div>
        <div style={{ fontSize: 13, color: "#1a1a1a" }}>{student.joinedAt || "—"}</div>
      </div>

      {student.note && (
        <>
          <hr style={{ border: "none", borderTop: "1px solid #f0f0f0", margin: "0 0 10px" }} />
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: "#aaa", marginBottom: 2 }}>{t("singleGroup.studentHoverCard.note")}</div>
            <div style={{ fontSize: 13, color: "#1a1a1a", whiteSpace: "pre-wrap" }}>{student.note}</div>
          </div>
        </>
      )}

      {student.comments && student.comments.length > 0 && (() => {
        const sorted = [...student.comments].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        const visible = sorted.slice(0, 2);
        const extra = sorted.length - visible.length;
        return (
          <>
            <hr style={{ border: "none", borderTop: "1px solid #f0f0f0", margin: "0 0 10px" }} />
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: "#aaa", marginBottom: 4 }}>{t("singleGroup.studentHoverCard.comments")}</div>
              {visible.map((c) => (
                <div key={c.id} style={{ marginBottom: 6 }}>
                  <div style={{ fontSize: 13, color: "#1a1a1a", whiteSpace: "pre-wrap" }}>{c.text}</div>
                  {(c.author || c.createdAt) && (
                    <div style={{ fontSize: 11, color: "#aaa", marginTop: 1 }}>
                      {[c.author, c.createdAt ? new Date(c.createdAt).toLocaleDateString() : null].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </div>
              ))}
              {extra > 0 && (
                <div style={{ fontSize: 11.5, color: "#185FA5" }}>
                  {t("singleGroup.studentHoverCard.moreComments", { count: extra })}
                </div>
              )}
            </div>
          </>
        );
      })()}

      <hr style={{ border: "none", borderTop: "1px solid #f0f0f0", margin: "0 0 10px" }} />

      {/* Coins aren't tracked by the backend anywhere in this app yet — shown
          as a static 0 to match the reference design rather than a fetched
          value that doesn't exist. */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: "#aaa", marginBottom: 2 }}>{t("singleGroup.studentHoverCard.allCoins")}</div>
        <div style={{ fontSize: 13, color: "#1a1a1a", display: "flex", alignItems: "center", gap: 6 }}>
          <span aria-hidden>🪙</span> 0
        </div>
      </div>

      <div style={{ textAlign: "right" }}>
        <span
          style={{ fontSize: 13, color: "#185FA5", cursor: "pointer", fontWeight: 600 }}
          onClick={onGoToProfile}
          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
        >
          {t("singleGroup.studentHoverCard.goToProfile")}
        </span>
      </div>
    </div>
  );
};

export default StudentHoverCard;