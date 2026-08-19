"use client";
import { AlertTriangle } from "lucide-react";

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="modal-layer" onMouseDown={onCancel}>
      <div className="modal-card" style={{ maxWidth: 420 }} onMouseDown={(e) => e.stopPropagation()}>
        <div style={{ textAlign: "center", padding: "28px 28px 0" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: danger ? "var(--coral-100)" : "var(--amber-100)",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 16px",
              color: danger ? "var(--coral-600)" : "var(--amber-600)",
            }}
          >
            <AlertTriangle size={28} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>{title}</h3>
          <p style={{ color: "var(--slate-600)", fontSize: 14, lineHeight: 1.5, margin: 0 }}>{message}</p>
        </div>
        <div className="modal-actions" style={{ padding: "20px 28px 28px" }}>
          <button className="secondary-button" onClick={onCancel}>
            {cancelLabel || "Cancelar"}
          </button>
          <button
            className={danger ? "danger-button" : "primary-button"}
            onClick={onConfirm}
          >
            {confirmLabel || "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
