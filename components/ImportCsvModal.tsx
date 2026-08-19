"use client";
import { useState, useRef } from "react";
import { X, Upload, AlertTriangle } from "lucide-react";
import { State, Movement } from "../lib/types";
import { dateToday } from "../lib/utils";

interface CsvRow {
  date: string;
  kind: string;
  product: string;
  party: string;
  quantity: string;
  unit: string;
  price: string;
  paymentMethod: string;
  valid: boolean;
  error?: string;
}

function parseCsvText(text: string): CsvRow[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  return lines.slice(1).map((line) => {
    const cols = line.split(";").map((c) => c.trim().replace(/^"|"$/g, ""));
    const [date, kind, product, party, quantity, unit, price, paymentMethod] = cols;
    const validKind = kind === "Compra" || kind === "Venta";
    const validUnit = unit === "kg" || unit === "unidad" || unit === "caja";
    const validPayment = paymentMethod === "Transferencia" || paymentMethod === "Efectivo" || paymentMethod === "Crédito";
    const qty = parseFloat(quantity);
    const prc = parseFloat(price);
    let error = "";
    if (!date) error = "Sin fecha";
    else if (!validKind) error = "Tipo debe ser Compra o Venta";
    else if (!product) error = "Sin producto";
    else if (isNaN(qty) || qty <= 0) error = "Cantidad inválida";
    else if (!validUnit) error = "Unidad debe ser kg, unidad o caja";
    else if (isNaN(prc) || prc < 0) error = "Precio inválido";
    else if (!validPayment) error = "Forma de pago inválida";
    return { date, kind, product, party: party || "", quantity, unit, price, paymentMethod, valid: !error, error };
  });
}

export function ImportCsvModal({
  state,
  onClose,
  onImport,
}: {
  state: State;
  onClose: () => void;
  onImport: (movements: Movement[]) => void;
}) {
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [hasParsed, setHasParsed] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setRows(parseCsvText(reader.result as string));
      setHasParsed(true);
    };
    reader.readAsText(file);
  }

  function handleImport() {
    const valid = rows.filter((r) => r.valid);
    const movements: Movement[] = valid.map((r) => {
      const product = state.products.find(
        (p) => p.name.toLowerCase() === r.product.toLowerCase()
      );
      const party = [...state.clients, ...state.providers].find(
        (p) => p.name.toLowerCase() === r.party.toLowerCase()
      );
      const qty = parseFloat(r.quantity);
      const prc = parseFloat(r.price);
      return {
        id: crypto.randomUUID(),
        kind: r.kind as "Compra" | "Venta",
        date: r.date || dateToday(),
        partyId: party?.id || "",
        productId: product?.id || "",
        quantity: qty,
        unit: r.unit,
        price: prc,
        total: qty * prc,
        paymentMethod: r.paymentMethod as Movement["paymentMethod"],
        paid: r.paymentMethod === "Crédito" ? 0 : qty * prc,
        user: "Importación CSV",
      };
    });
    onImport(movements);
  }

  const validCount = rows.filter((r) => r.valid).length;
  const invalidCount = rows.filter((r) => !r.valid).length;

  return (
    <div className="modal-layer" onMouseDown={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: 640 }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-heading">
          <div>
            <p className="eyebrow">IMPORTAR DATOS</p>
            <h2>Importar movimientos desde CSV</h2>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X />
          </button>
        </div>

        {!hasParsed ? (
          <div style={{ padding: "20px 28px" }}>
            <p style={{ fontSize: 13, color: "var(--slate-600)", marginBottom: 16 }}>
              Formato esperado (separado por punto y coma):
              <br />
              <code style={{ fontSize: 11, background: "var(--ice-100)", padding: "2px 6px", borderRadius: 4 }}>
                Fecha;Tipo;Producto;Proveedor/Cliente;Cantidad;Unidad;Precio;Forma de pago
              </code>
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFile}
              style={{ display: "none" }}
            />
            <button
              className="primary-button"
              onClick={() => fileRef.current?.click()}
              style={{ width: "100%" }}
            >
              <Upload size={18} /> Seleccionar archivo CSV
            </button>
          </div>
        ) : (
          <div style={{ padding: "0 28px 20px" }}>
            <div style={{ display: "flex", gap: 16, marginBottom: 12, fontSize: 13 }}>
              <span style={{ color: "#1e8e3e", fontWeight: 700 }}>
                {validCount} válidas
              </span>
              {invalidCount > 0 && (
                <span style={{ color: "var(--coral-600)", fontWeight: 700 }}>
                  {invalidCount} con error
                </span>
              )}
            </div>
            <div
              style={{
                maxHeight: 300,
                overflow: "auto",
                border: "1px solid var(--ice-200)",
                borderRadius: 12,
              }}
            >
              <table style={{ width: "100%", fontSize: 12 }}>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Producto</th>
                    <th>Persona</th>
                    <th>Cant.</th>
                    <th>Total</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr
                      key={i}
                      style={{
                        background: r.valid ? "transparent" : "var(--coral-100)",
                      }}
                    >
                      <td>{r.date}</td>
                      <td>{r.kind}</td>
                      <td>{r.product}</td>
                      <td>{r.party}</td>
                      <td>{r.quantity} {r.unit}</td>
                      <td>${(parseFloat(r.quantity) * parseFloat(r.price)).toLocaleString("es-CL")}</td>
                      <td>
                        {r.valid ? (
                          <span style={{ color: "#1e8e3e" }}>OK</span>
                        ) : (
                          <span style={{ color: "var(--coral-600)" }} title={r.error}>
                            <AlertTriangle size={14} />
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button className="secondary-button" onClick={onClose}>
            Cancelar
          </button>
          {hasParsed && (
            <>
              <button
                className="secondary-button"
                onClick={() => {
                  setRows([]);
                  setHasParsed(false);
                }}
              >
                Elegir otro archivo
              </button>
              <button
                className="primary-button"
                onClick={handleImport}
                disabled={validCount === 0}
              >
                Importar {validCount} movimientos
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
