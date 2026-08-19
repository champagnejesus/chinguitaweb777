"use client";
import { useState } from "react";
import { RefreshCw, Plus, Trash2, Edit, User, ShieldAlert, Filter } from "lucide-react";
import { SearchBar } from "../ui/SearchBar";

// Helper for badges
function getActionBadge(action: string) {
  const text = action.toLowerCase();
  if (text.includes("crear") || text.includes("creó") || text.includes("nuevo") || text.includes("registró")) {
    return { icon: <Plus size={13} />, bg: "#d1fae5", text: "#047857" }; // Emerald
  }
  if (text.includes("eliminar") || text.includes("eliminó") || text.includes("borró")) {
    return { icon: <Trash2 size={13} />, bg: "#fee2e2", text: "#b91c1c" }; // Red
  }
  if (text.includes("editar") || text.includes("editó") || text.includes("modificó") || text.includes("actualizó") || text.includes("pago")) {
    return { icon: <Edit size={13} />, bg: "#e0f2fe", text: "#0369a1" }; // Sky
  }
  if (text.includes("login") || text.includes("sesión")) {
    return { icon: <User size={13} />, bg: "var(--ice-100)", text: "var(--slate-700)" };
  }
  return { icon: <ShieldAlert size={13} />, bg: "var(--ice-100)", text: "var(--slate-700)" };
}

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
  const [filterType, setFilterType] = useState<"todos" | "creaciones" | "ediciones" | "eliminaciones">("todos");
  const [limit, setLimit] = useState(50);

  let filtered = logs.filter(
    (l) =>
      l.userName.toLowerCase().includes(query.toLowerCase()) ||
      l.action.toLowerCase().includes(query.toLowerCase()) ||
      l.details.toLowerCase().includes(query.toLowerCase())
  );

  if (filterType !== "todos") {
    filtered = filtered.filter((l) => {
      const text = l.action.toLowerCase();
      if (filterType === "creaciones") return text.includes("crear") || text.includes("creó") || text.includes("nuevo") || text.includes("registró");
      if (filterType === "eliminaciones") return text.includes("eliminar") || text.includes("eliminó") || text.includes("borró");
      if (filterType === "ediciones") return text.includes("editar") || text.includes("editó") || text.includes("modificó") || text.includes("actualizó") || text.includes("pago");
      return true;
    });
  }

  const paginated = filtered.slice(0, limit);

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
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <button
              onClick={() => { setFilterType("todos"); setLimit(50); }}
              className="secondary-button compact"
              style={{ background: filterType === "todos" ? "var(--ice-200)" : "transparent", border: "1px solid var(--ice-200)" }}
            >
              <Filter size={13} /> Todos
            </button>
            <button
              onClick={() => { setFilterType("creaciones"); setLimit(50); }}
              className="secondary-button compact"
              style={{ background: filterType === "creaciones" ? "#d1fae5" : "transparent", border: "1px solid #d1fae5", color: "#047857" }}
            >
              Creaciones
            </button>
            <button
              onClick={() => { setFilterType("ediciones"); setLimit(50); }}
              className="secondary-button compact"
              style={{ background: filterType === "ediciones" ? "#e0f2fe" : "transparent", border: "1px solid #e0f2fe", color: "#0369a1" }}
            >
              Ediciones
            </button>
            <button
              onClick={() => { setFilterType("eliminaciones"); setLimit(50); }}
              className="secondary-button compact"
              style={{ background: filterType === "eliminaciones" ? "#fee2e2" : "transparent", border: "1px solid #fee2e2", color: "#b91c1c" }}
            >
              Eliminaciones
            </button>
          </div>
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
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={4} className="empty-state" style={{ textAlign: "center", padding: 40, color: "var(--slate-500)" }}>
                  No se encontraron registros que coincidan con la búsqueda.
                </td>
              </tr>
            ) : (
              paginated.map((l, i) => {
                const badge = getActionBadge(l.action);
                return (
                  <tr key={i}>
                    <td data-label="Fecha/Hora">{new Date(l.timestamp).toLocaleString("es-CL")}</td>
                    <td data-label="Usuario">
                      <strong>{l.userName}</strong>
                    </td>
                    <td data-label="Acción">
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          background: badge.bg,
                          color: badge.text,
                          padding: "4px 10px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: 600,
                        }}
                      >
                        {badge.icon}
                        {l.action}
                      </span>
                    </td>
                    <td data-label="Detalles">
                      <div
                        style={{
                          background: "var(--ice-50)",
                          border: "1px solid var(--ice-100)",
                          borderRadius: "6px",
                          padding: "6px 10px",
                          fontSize: "12px",
                          color: "var(--slate-600)",
                          fontFamily: "monospace",
                          maxWidth: "300px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}
                        title={l.details}
                      >
                        {l.details}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      {filtered.length > limit && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
          <button className="secondary-button" onClick={() => setLimit(limit + 50)}>
            Mostrar más registros
          </button>
        </div>
      )}
    </div>
  );
}
