// src/pages/groups/StudentHoverCard.tsx
import { useEffect, useRef, useState } from "react";
import { StudentCardData } from "../types";

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
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!anchorEl || !student) return;
    const rect = anchorEl.getBoundingClientRect();
    const cardWidth = 300;
    let left = rect.right + 10;
    if (left + cardWidth > window.innerWidth - 12) left = rect.left - cardWidth - 10;
    setPos({ top: rect.top, left });
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

  const isDebtor = student.balance !== undefined && student.balance < 0;
  const isFrozen = !student.active;
  const today = new Date();
  const dateStr = `${today.getDate().toString().padStart(2, "0")}.${(today.getMonth() + 1).toString().padStart(2, "0")}.${today.getFullYear()}`;
  const mockPayments = isFrozen
    ? [
        { date: "15.05.2026", amount: 500000, label: "Cash" },
        { date: "01.04.2026", amount: 500000, label: "Payme" },
      ]
    : [];

  return (
    <div
      ref={cardRef}
      style={{
        position: "fixed",
        top: pos.top, left: pos.left,
        zIndex: 9999,
        width: 300,
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
          {student.active ? "Active (Learns)" : "Frozen (paused)"}
        </div>
        {isDebtor && (
          <span style={{
            display: "inline-block", marginTop: 6,
            background: "#e53935", color: "#fff",
            fontSize: 11, fontWeight: 600, borderRadius: 20, padding: "3px 10px",
          }}>
            Debtor
          </span>
        )}
      </div>

      {isFrozen && (
        <>
          <div style={{
            background: isDebtor ? "#fff5f5" : "#f1faf4",
            border: `1px solid ${isDebtor ? "#ffcdd2" : "#c8e6c9"}`,
            borderRadius: 10,
            padding: "12px 14px",
            marginBottom: 12,
          }}>
            <div style={{ fontSize: 11, color: "#888", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>
              {isDebtor ? "Qarzdorlik" : "Balans"}
            </div>
            <div style={{
              fontSize: 18, fontWeight: 700,
              color: isDebtor ? "#c62828" : "#2e7d32",
            }}>
              {student.balance !== undefined
                ? `${student.balance > 0 ? "+" : ""}${student.balance.toLocaleString()} UZS`
                : "—"}
            </div>
            {student.frozenAt && (
              <div style={{ fontSize: 11, color: "#888", marginTop: 6 }}>
                Muzlatilgan: {student.frozenAt}
              </div>
            )}
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "#aaa", marginBottom: 8, fontWeight: 600 }}>So'nggi to'lovlar</div>
            {mockPayments.length > 0 ? (
              mockPayments.map((p, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    fontSize: 12, padding: "6px 0",
                    borderBottom: idx < mockPayments.length - 1 ? "1px solid #f0f0f0" : "none",
                  }}
                >
                  <span style={{ color: "#555" }}>{p.date} · {p.label}</span>
                  <span style={{ fontWeight: 600, color: "#2e7d32" }}>+{p.amount.toLocaleString()} UZS</span>
                </div>
              ))
            ) : (
              <span style={{ fontSize: 12, color: "#bbb" }}>To'lovlar yo'q</span>
            )}
          </div>
        </>
      )}

      <hr style={{ border: "none", borderTop: "1px solid #f0f0f0", margin: "0 0 10px" }} />

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: "#aaa", marginBottom: 2 }}>Phone</div>
        <div style={{ fontSize: 13, color: "#1a1a1a", fontWeight: 500 }}>{student.phone}</div>
      </div>

      <hr style={{ border: "none", borderTop: "1px solid #f0f0f0", margin: "0 0 10px" }} />

      {!isFrozen && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: "#aaa", marginBottom: 4 }}>Balance</div>
          {student.balance !== undefined && student.balance !== 0 ? (
            <span style={{
              display: "inline-block",
              background: isDebtor ? "#e53935" : "#43a047",
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
        <div style={{ fontSize: 11, color: "#aaa", marginBottom: 2 }}>Added at</div>
        <div style={{ fontSize: 13, color: "#1a1a1a" }}>{student.addedAt || dateStr}</div>
      </div>

      <hr style={{ border: "none", borderTop: "1px solid #f0f0f0", margin: "0 0 10px" }} />

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: "#aaa", marginBottom: 2 }}>Activated at</div>
        <div style={{ fontSize: 13, color: "#1a1a1a" }}>{student.activatedAt || dateStr}</div>
      </div>

      <div style={{ textAlign: "right" }}>
        <span
          style={{ fontSize: 13, color: "#185FA5", cursor: "pointer", fontWeight: 600 }}
          onClick={onGoToProfile}
          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
        >
          Go to profile →
        </span>
      </div>
    </div>
  );
};

export default StudentHoverCard;