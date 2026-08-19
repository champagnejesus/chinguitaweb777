"use client";
import { useState, useEffect } from "react";
import { Upload, ChevronDown, FileSpreadsheet, Printer } from "lucide-react";
import { exportExcel, exportPdf } from "../../lib/utils";
import { ExportRow } from "../../lib/types";

export function ExportActions({ title, rows }: { title: string; rows: ExportRow[] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".export-menu-container")) {
        setOpen(false);
      }
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, [open]);

  return (
    <div className="export-menu-container" style={{ position: "relative", display: "inline-block" }}>
      <button
        className="secondary-button compact"
        onClick={() => setOpen(!open)}
        style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }}
      >
        <Upload size={15} style={{ transform: "rotate(180deg)" }} />
        Exportar
        <ChevronDown size={14} style={{ transition: "transform 0.2s ease", transform: open ? "rotate(180deg)" : "rotate(0deg)" }} />
      </button>

      {open && (
        <div
          className="export-dropdown-menu"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 6px)",
            background: "var(--white)",
            border: "1px solid var(--ice-200)",
            borderRadius: 10,
            boxShadow: "var(--shadow-lg)",
            zIndex: 99,
            padding: 6,
            minWidth: 160,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <button
            className="text-button"
            onClick={() => {
              setOpen(false);
              exportExcel(title, rows);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--navy-900)",
              borderRadius: 6,
              textAlign: "left",
              width: "100%",
            }}
          >
            <FileSpreadsheet size={15} style={{ color: "#10b981" }} />
            Exportar Excel
          </button>
          <button
            className="text-button"
            onClick={() => {
              setOpen(false);
              exportPdf(title, rows);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--navy-900)",
              borderRadius: 6,
              textAlign: "left",
              width: "100%",
            }}
          >
            <Printer size={15} style={{ color: "var(--teal-600)" }} />
            Imprimir / PDF
          </button>
        </div>
      )}
    </div>
  );
}
