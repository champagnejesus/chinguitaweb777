"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Party } from "../../lib/types";
import { SearchBar } from "../ui/SearchBar";
import { ExportActions } from "../ui/ExportActions";

export function Parties({
  kind,
  rows,
  onNew,
  onEdit,
  onDelete,
  onViewProfile,
}: {
  kind: "Cliente" | "Proveedor";
  rows: Party[];
  onNew: () => void;
  onEdit: (p: Party) => void;
  onDelete: (id: string) => void;
  onViewProfile: (p: Party) => void;
}) {
  const [search, setSearch] = useState("");
  const filteredRows = rows.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()) || (r.rut && r.rut.toLowerCase().includes(search.toLowerCase())));
  const report = filteredRows.map((r) => ({ Nombre: r.name, RUT: r.rut || "Sin RUT", Teléfono: r.phone || "Sin teléfono" }));

  return (
    <section className="surface data-surface">
      <div className="surface-title">
        <div>
          <p className="eyebrow">DIRECTORIO</p>
          <h2>{kind}s registrados</h2>
        </div>
      </div>

      <div className="section-toolbar">
        <div className="toolbar-group-left">
          <SearchBar value={search} onChange={setSearch} placeholder={`Buscar ${kind.toLowerCase()} por nombre o RUT...`} />
        </div>
        <div className="toolbar-group-right">
          <ExportActions title={`${kind}s`} rows={report} />
          <button className="primary-button compact" onClick={onNew}>
            <Plus size={15} />
            Agregar {kind}
          </button>
        </div>
      </div>

      <div className="directory-grid">
        {filteredRows.map((r) => (
          <article className="directory-card directory-card-clickable" key={r.id} onClick={() => onViewProfile(r)}>
            <span className="directory-avatar">{r.name.slice(0, 2).toUpperCase()}</span>
            <div style={{ flex: 1 }}>
              <strong>{r.name}</strong>
              <small>
                RUT {r.rut || "Sin RUT"} · {r.phone || "Sin teléfono"}
              </small>
            </div>
            <span className="directory-card-badge">
              Ficha / Historial →
            </span>
          </article>
        ))}
        {!filteredRows.length && <p className="empty-state">Aún no hay registros que coincidan.</p>}
      </div>
    </section>
  );
}
