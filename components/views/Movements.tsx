"use client";
import { useState } from "react";
import { Plus, Trash2, Edit } from "lucide-react";
import { State, Movement } from "../../lib/types";
import { productName, partyName, movementRows as buildMovementRows, money } from "../../lib/utils";
import { SearchBar } from "../ui/SearchBar";
import { ExportActions } from "../ui/ExportActions";
import { DatePresetsToolbar } from "../ui/DatePresetsToolbar";

export function Movements({
  kind,
  state,
  globalSearch,
  onNew,
  onDeleteMovement,
  onEditMovement,
}: {
  kind: "Compra" | "Venta";
  state: State;
  globalSearch: string;
  onNew: () => void;
  onDeleteMovement: (id: string) => void;
  onEditMovement: (m: Movement) => void;
}) {
  const rows = state.movements.filter((m) => m.kind === kind);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const effectiveSearch = search || globalSearch;

  const filteredRows = rows.filter((m) => {
    const pName = productName(m, state);
    const partName = partyName(m, state);
    const matchSearch = pName.toLowerCase().includes(effectiveSearch.toLowerCase()) || partName.toLowerCase().includes(effectiveSearch.toLowerCase());
    const matchStart = startDate ? m.date >= startDate : true;
    const matchEnd = endDate ? m.date <= endDate : true;
    return matchSearch && matchStart && matchEnd;
  });

  return (
    <section className="surface data-surface">
      <div className="surface-title">
        <div>
          <p className="eyebrow">DETALLE POR FECHAS</p>
          <h2>{kind}s registradas</h2>
        </div>
      </div>

      <div className="section-toolbar">
        <div className="toolbar-group-left">
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar por producto o persona..." />
          <DatePresetsToolbar
            startDate={startDate}
            endDate={endDate}
            onRangeChange={(start, end) => {
              setStartDate(start);
              setEndDate(end);
            }}
          />
        </div>
        <div className="toolbar-group-right">
          <ExportActions title={`${kind}s`} rows={buildMovementRows(filteredRows, state, kind)} />
          <button className="primary-button compact" onClick={onNew}>
            <Plus size={15} />
            Nueva {kind.toLowerCase()}
          </button>
        </div>
      </div>

      <MovementTable rows={filteredRows} state={state} kind={kind} onDeleteMovement={onDeleteMovement} onEditMovement={onEditMovement} />
    </section>
  );
}

export function MovementTable({
  rows,
  state,
  kind,
  onDeleteMovement,
  onEditMovement,
}: {
  rows: Movement[];
  state: State;
  kind: "Compra" | "Venta";
  onDeleteMovement: (id: string) => void;
  onEditMovement: (m: Movement) => void;
}) {
  const partyLabel = kind === "Compra" ? "Proveedor" : "Cliente";
  return (
    <div className="responsive-table">
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>{partyLabel}</th>
            <th>Producto</th>
            <th>Notas</th>
            <th>Forma de pago</th>
            <th>Total</th>
            <th>Abono</th>
            <th>Saldo</th>
            <th>Usuario</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.id}>
              <td data-label="Fecha">{m.date}</td>
              <td data-label={partyLabel}>
                <strong>{partyName(m, state)}</strong>
              </td>
              <td data-label="Producto">
                {productName(m, state)} · {m.quantity} {m.unit}
              </td>
              <td data-label="Notas">{m.notes || "—"}</td>
              <td data-label="Forma de pago">{m.paymentMethod}</td>
              <td data-label="Total">
                <strong>{money(m.total)}</strong>
              </td>
              <td data-label="Abono">{money(m.paid)}</td>
              <td data-label="Saldo">
                <span className={`status ${m.total - m.paid <= 0 ? "paid" : "pending"}`}>{money(m.total - m.paid)}</span>
              </td>
              <td data-label="Usuario">{m.user}</td>
              <td data-label="Acciones">
                <div style={{ display: "flex", gap: "8px" }}>
                  <button className="icon-button danger-icon-button" onClick={() => onDeleteMovement(m.id)} title="Eliminar">
                    <Trash2 size={16} />
                  </button>
                  <button className="icon-button" onClick={() => onEditMovement(m)} title="Editar">
                    <Edit size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={10} className="empty-state">
                Aún no hay {kind.toLowerCase()}s registradas.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
