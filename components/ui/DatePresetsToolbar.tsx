"use client";
import { useState } from "react";
import { getDatePresets } from "../../lib/utils";

export function DatePresetsToolbar({
  startDate,
  endDate,
  onRangeChange,
}: {
  startDate: string;
  endDate: string;
  onRangeChange: (start: string, end: string) => void;
}) {
  const presets = getDatePresets();
  const [activePreset, setActivePreset] = useState<"todos" | "hoy" | "semana" | "mes" | "custom">("todos");

  const applyPreset = (type: "todos" | "hoy" | "semana" | "mes") => {
    setActivePreset(type);
    if (type === "todos") {
      onRangeChange("", "");
    } else if (type === "hoy") {
      onRangeChange(presets.today.start, presets.today.end);
    } else if (type === "semana") {
      onRangeChange(presets.thisWeek.start, presets.thisWeek.end);
    } else if (type === "mes") {
      onRangeChange(presets.thisMonth.start, presets.thisMonth.end);
    }
  };

  return (
    <div className="date-presets-toolbar">
      <button className={`date-preset-pill ${activePreset === "todos" ? "active" : ""}`} onClick={() => applyPreset("todos")}>
        Todos
      </button>
      <button className={`date-preset-pill ${activePreset === "hoy" ? "active" : ""}`} onClick={() => applyPreset("hoy")}>
        Hoy
      </button>
      <button className={`date-preset-pill ${activePreset === "semana" ? "active" : ""}`} onClick={() => applyPreset("semana")}>
        Esta Semana
      </button>
      <button className={`date-preset-pill ${activePreset === "mes" ? "active" : ""}`} onClick={() => applyPreset("mes")}>
        Este Mes
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 6 }}>
        <input
          type="date"
          className="date-input"
          value={startDate}
          onChange={(e) => {
            setActivePreset("custom");
            onRangeChange(e.target.value, endDate);
          }}
          style={{ padding: "5px 8px", fontSize: 12, borderRadius: 8, border: "1px solid var(--ice-200)", background: "var(--white)", color: "var(--navy-900)" }}
        />
        <span style={{ fontSize: 12, color: "var(--slate-400)" }}>a</span>
        <input
          type="date"
          className="date-input"
          value={endDate}
          onChange={(e) => {
            setActivePreset("custom");
            onRangeChange(startDate, e.target.value);
          }}
          style={{ padding: "5px 8px", fontSize: 12, borderRadius: 8, border: "1px solid var(--ice-200)", background: "var(--white)", color: "var(--navy-900)" }}
        />
      </div>
    </div>
  );
}
