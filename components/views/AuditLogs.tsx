"use client";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { SearchBar } from "../ui/SearchBar";

export function AuditLogs({
  logs,
  loading,
  onReload,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logs: any[];
  loading: boolean;
  onReload: () => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = logs.filter(
    (l) =>
      l.userName.toLowerCase().includes(query.toLowerCase()) ||
      l.action.toLowerCase().includes(query.toLowerCase()) ||
      l.details.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="surface" style={{ padding: 26, borderRadius: 22 }}>
      <div className="surface-title" style={{ padding: "0 0 14px" }}>
        <div>
          <p className="eyebrow">REGISTRO DE SEGURIDAD</p>
          <h2>Historial de Auditoría</h2>
          <p style={{ color: "var(--slate-500)", fontSize: 13, margin: "4px 0 0" }}>Operaciones críticas registradas en la base de datos.</p>
        </div>
      </div>

      <div className="section-toolbar" style={{ margin: "0 0 20px" }}>
        <div className="toolbar-group-left">
          <SearchBar value={query} onChange={setQuery} placeholder="Buscar por usuario, acción o detalles..." />
        </div>
        <div className="toolbar-group-right">
          <button className="secondary-button compact" onClick={onReload} disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {loading ? "Cargando..." : "Actualizar"}
          </button>
        </div>
      </div>

      <div className="responsive-table">
        <table style={{ width: "100%" }}>
          <thead>
            <tr>
              <th>Fecha/Hora</th>
              <th>Usuario</th>
              <th>Acción</th>
              <th>Detalles</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="empty-state" style={{ textAlign: "center", padding: 40, color: "var(--slate-500)" }}>
                  No se encontraron registros de auditoría.
                </td>
              </tr>
            ) : (
              filtered.map((l, i) => (
                <tr key={i}>
                  <td data-label="Fecha/Hora">{new Date(l.timestamp).toLocaleString("es-CL")}</td>
                  <td data-label="Usuario">
                    <strong>{l.userName}</strong>
                  </td>
                  <td data-label="Acción" style={{ color: "var(--teal-700)", fontWeight: 700 }}>
                    {l.action}
                  </td>
                  <td data-label="Detalles" style={{ color: "var(--slate-600)" }}>
                    {l.details}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
