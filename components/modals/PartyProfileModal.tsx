"use client";
import { Edit, Trash2, X, Package } from "lucide-react";
import { Party, State, Movement } from "../../lib/types";
import { money, productName } from "../../lib/utils";
import { ExportActions } from "../ui/ExportActions";

export function PartyProfileModal({
  party,
  kind,
  state,
  onClose,
  onEdit,
  onDelete,
  onDeleteMovement,
  onEditMovement,
}: {
  party: Party;
  kind: "Cliente" | "Proveedor";
  state: State;
  onClose: () => void;
  onEdit: (party: Party) => void;
  onDelete: (partyId: string) => void;
  onDeleteMovement: (id: string) => void;
  onEditMovement: (m: Movement) => void;
}) {
  const partyMovements = state.movements.filter((m) => m.partyId === party.id);
  const totalAmount = partyMovements.reduce((s, m) => s + m.total, 0);
  const totalPaid = partyMovements.reduce((s, m) => s + m.paid, 0);
  const pendingBalance = partyMovements.reduce((s, m) => s + Math.max(0, m.total - m.paid), 0);

  const productCounts = partyMovements.reduce((acc, m) => {
    const pName = productName(m, state);
    acc[pName] = (acc[pName] || 0) + m.quantity;
    return acc;
  }, {} as Record<string, number>);

  const topProducts = Object.entries(productCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const report = partyMovements.map((m) => ({
    Fecha: m.date,
    Tipo: m.kind,
    Producto: `${productName(m, state)} · ${m.quantity} ${m.unit}`,
    "Forma de pago": m.paymentMethod,
    Total: money(m.total),
    Abono: money(m.paid),
    Saldo: money(m.total - m.paid),
  }));

  return (
    <div className="modal-layer">
      <div className="modal-card" style={{ maxWidth: 840, width: "95%" }}>
        <div className="party-profile-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="directory-avatar" style={{ width: 46, height: 46, fontSize: 18 }}>
                {party.name.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "var(--navy-900)" }}>{party.name}</h2>
                <p style={{ color: "var(--slate-500)", fontSize: 12, margin: "2px 0 0" }}>
                  RUT {party.rut || "Sin RUT"} · {party.phone || "Sin teléfono"} · {kind}
                </p>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span className={`badge-debt ${pendingBalance > 0 ? "pending" : "ok"}`}>
              {pendingBalance > 0 ? `Saldo Pendiente: ${money(pendingBalance)}` : "Al día sin deuda"}
            </span>
            <button className="secondary-button compact" onClick={() => { onClose(); onEdit(party); }} title={`Editar ${kind}`}>
              <Edit size={14} /> Editar
            </button>
            <button className="secondary-button compact danger-text" onClick={() => { onClose(); onDelete(party.id); }} title={`Eliminar ${kind}`}>
              <Trash2 size={14} /> Eliminar
            </button>
            <button className="icon-button" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="party-kpi-cards">
          <div className="party-kpi-card">
            <span className="kpi-label">Total Operado</span>
            <span className="kpi-val" style={{ color: "var(--teal-700)" }}>{money(totalAmount)}</span>
          </div>
          <div className="party-kpi-card">
            <span className="kpi-label">Total Pagado</span>
            <span className="kpi-val" style={{ color: "#10b981" }}>{money(totalPaid)}</span>
          </div>
          <div className="party-kpi-card">
            <span className="kpi-label">Saldo Pendiente</span>
            <span className="kpi-val" style={{ color: pendingBalance > 0 ? "#ef4444" : "var(--navy-900)" }}>{money(pendingBalance)}</span>
          </div>
        </div>

        {topProducts.length > 0 && (
          <div style={{ marginBottom: 20, background: "var(--ice-50)", padding: "12px 16px", borderRadius: 12, border: "1px solid var(--ice-200)" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--slate-500)", textTransform: "uppercase" }}>Productos más solicitados / suministrados:</span>
            <div style={{ display: "flex", gap: 16, marginTop: 6, flexWrap: "wrap" }}>
              {topProducts.map(([pName, qty]) => (
                <span key={pName} style={{ fontSize: 13, fontWeight: 600, color: "var(--navy-900)", display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <Package size={14} style={{ color: "var(--teal-600)" }} /> {pName}: {qty} unidades/cajas
                </span>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--navy-900)" }}>Historial de Transacciones ({partyMovements.length})</h3>
          <ExportActions title={`Ficha-${party.name}`} rows={report} />
        </div>

        <div className="responsive-table" style={{ maxHeight: 320, overflowY: "auto" }}>
          <table style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Producto</th>
                <th>Pago</th>
                <th>Total</th>
                <th>Abono</th>
                <th>Saldo</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {partyMovements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-state" style={{ textAlign: "center", padding: 24 }}>
                    No hay transacciones registradas para este {kind.toLowerCase()}.
                  </td>
                </tr>
              ) : (
                partyMovements.map((m) => (
                  <tr key={m.id}>
                    <td data-label="Fecha">{m.date}</td>
                    <td data-label="Tipo">
                      <span className={`badge-op ${m.kind === "Venta" ? "badge-op-venta" : "badge-op-compra"}`}>{m.kind}</span>
                    </td>
                    <td data-label="Producto">
                      <strong>{productName(m, state)}</strong> ({m.quantity} {m.unit})
                    </td>
                    <td data-label="Pago">{m.paymentMethod}</td>
                    <td data-label="Total">
                      <strong>{money(m.total)}</strong>
                    </td>
                    <td data-label="Abono">{money(m.paid)}</td>
                    <td data-label="Saldo">
                      <span className={`status ${m.total - m.paid <= 0 ? "paid" : "pending"}`}>{money(m.total - m.paid)}</span>
                    </td>
                    <td data-label="Acción">
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button className="icon-button danger-icon-button" onClick={() => onDeleteMovement(m.id)} title="Eliminar">
                          <Trash2 size={15} />
                        </button>
                        <button className="icon-button" onClick={() => onEditMovement(m)} title="Editar">
                          <Edit size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="modal-actions" style={{ marginTop: 20 }}>
          <button type="button" className="secondary-button" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
