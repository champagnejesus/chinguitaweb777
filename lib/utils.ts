import { Movement, Product, Presentation, ExportRow, State, TrendData } from "./types";

export const money = (v: number) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(v || 0);

export const dateToday = () => new Date().toISOString().slice(0, 10);

export function getDatePresets() {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const dayOfWeek = today.getDay();
  const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const firstDayMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const lastDayMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);

  return {
    today: { start: todayStr, end: todayStr },
    thisWeek: { start: monday.toISOString().slice(0, 10), end: sunday.toISOString().slice(0, 10) },
    thisMonth: { start: firstDayMonth, end: lastDayMonth },
  };
}

export const presentationLabel = (p: Presentation) =>
  p === "unidad" ? "Unidad" : "Caja";

export function productValue(
  product: Product,
  presentation: Presentation,
  field: "stock" | "buy" | "sell" | "minimum"
): number {
  const key =
    field === "stock"
      ? presentation === "unidad"
        ? "stockUnit"
        : "stockBox"
      : field === "buy"
      ? presentation === "unidad"
        ? "buyUnit"
        : "buyBox"
      : field === "sell"
      ? presentation === "unidad"
        ? "sellUnit"
        : "sellBox"
      : presentation === "unidad"
      ? "minimumUnit"
      : "minimumBox";

  const stored = product[key as keyof Product];
  if (typeof stored === "number") return stored;

  if (presentation === "unidad" && field === "stock" && (product.unit === "unidad" || product.unit === "kg"))
    return product.stock || 0;
  if (presentation === "unidad" && field === "buy") return product.buy || 0;
  if (presentation === "unidad" && field === "sell") return product.sell || 0;
  if (presentation === "unidad" && field === "minimum") return product.minimum || 0;
  return 0;
}

export function unitCostForMovement(m: Movement, product?: Product): number {
  if (typeof m.cost === "number") return m.cost;
  if (!product) return 0;
  return m.unit === "caja"
    ? productValue(product, "caja", "buy")
    : productValue(product, "unidad", "buy");
}

export function partyName(m: Movement, s: State): string {
  if (m.kind === "Ajuste") return m.reason || "Ajuste de Stock";
  return [...s.clients, ...s.providers].find((p) => p.id === m.partyId)?.name || "Sin identificar";
}

export function productName(m: Movement, s: State): string {
  return s.products.find((p) => p.id === m.productId)?.name || "Producto";
}

export function computeTrend(current: number, previous: number): TrendData {
  const change = current - previous;
  const changePercent = previous > 0 ? (change / previous) * 100 : current > 0 ? 100 : 0;
  return { current, previous, change, changePercent };
}

export function formatTrend(trend: TrendData): string {
  const sign = trend.changePercent >= 0 ? "+" : "";
  return `${sign}${trend.changePercent.toFixed(1)}% vs mes anterior`;
}

export function exportExcel(title: string, rows: ExportRow[]) {
  if (!rows.length) return alert("No hay información para exportar.");
  const headers = Object.keys(rows[0]);
  const csv = [headers, ...rows.map((row) => headers.map((h) => row[h]))]
    .map((line) => line.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(";"))
    .join("\n");
  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title}-${dateToday()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportPdf(title: string, rows: ExportRow[]) {
  if (!rows.length) return alert("No hay información para exportar.");
  const headers = Object.keys(rows[0]);
  const body = rows
    .map((row) => `<tr>${headers.map((h) => `<td>${String(row[h] ?? "")}</td>`).join("")}</tr>`)
    .join("");
  const popup = window.open("", "_blank", "width=1100,height=800");
  if (!popup) return alert("Permite las ventanas emergentes para generar el PDF.");
  popup.document.write(`<!doctype html><html><head><title>${title}</title><style>body{font:12px Arial;padding:28px;color:#071c2a}h1{font-size:22px}p{color:#526b79}table{width:100%;border-collapse:collapse}th,td{border:1px solid #dcebed;padding:8px;text-align:left}th{background:#edf5f6}@media print{button{display:none}}</style></head><body><h1>CHUNGUITA Jr · ${title}</h1><p>Informe generado el ${new Date().toLocaleString("es-CL")}</p><table><thead><tr>${headers
    .map((h) => `<th>${h}</th>`)
    .join("")}</tr></thead><tbody>${body}</tbody></table><script>window.onload=()=>window.print()<\/script></body></html>`);
  popup.document.close();
}

export function movementRows(rows: Movement[], state: State, kind: Movement["kind"]): ExportRow[] {
  return rows.map((m) => ({
    Fecha: m.date,
    [kind === "Compra" ? "Proveedor" : kind === "Venta" ? "Cliente" : "Detalle"]: partyName(m, state),
    Producto: `${productName(m, state)} · ${m.quantity} ${m.unit}`,
    "Forma de pago": m.paymentMethod,
    Total: money(m.total),
    Abono: money(m.paid),
    Saldo: money(m.total - m.paid),
  }));
}

export function activityRows(rows: Movement[], state: State): ExportRow[] {
  return rows.map((m) => ({
    Fecha: m.date,
    "Cliente / Proveedor / Motivo": partyName(m, state),
    Producto: `${productName(m, state)} · ${m.quantity} ${m.unit}`,
    "Forma de pago": m.paymentMethod,
    Total: money(m.total),
    Abono: money(m.paid),
    Saldo: money(m.total - m.paid),
  }));
}

export function accountRows(rows: Movement[], state: State, kind: "Compra" | "Venta"): ExportRow[] {
  return rows.map((m) => ({
    Fecha: m.date,
    [kind === "Compra" ? "Proveedor" : "Cliente"]: partyName(m, state),
    Producto: `${productName(m, state)} · ${m.quantity} ${m.unit}`,
    "Forma de pago": m.paymentMethod,
    Total: money(m.total),
    Abono: money(m.paid),
    Saldo: money(m.total - m.paid),
    Usuario: m.user,
  }));
}

export function getProductSalesBreakdown(movements: Movement[], state: State) {
  const sales = movements.filter((m) => m.kind === "Venta");
  const map: Record<string, { product: Product; qtyUnits: number; qtyBoxes: number; totalSales: number; totalCost: number }> = {};

  sales.forEach((m) => {
    const product = state.products.find((p) => p.id === m.productId);
    if (!product) return;
    if (!map[m.productId]) {
      map[m.productId] = { product, qtyUnits: 0, qtyBoxes: 0, totalSales: 0, totalCost: 0 };
    }
    if (m.unit === "caja") {
      map[m.productId].qtyBoxes += m.quantity;
    } else {
      map[m.productId].qtyUnits += m.quantity;
    }
    map[m.productId].totalSales += m.total;
    const unitCost = unitCostForMovement(m, product);
    map[m.productId].totalCost += m.quantity * unitCost;
  });

  return Object.values(map).map((item) => {
    const profit = item.totalSales - item.totalCost;
    const marginPercent = item.totalSales > 0 ? (profit / item.totalSales) * 100 : 0;
    const totalQty = item.qtyUnits + item.qtyBoxes;
    const avgPrice = totalQty > 0 ? item.totalSales / totalQty : 0;
    return {
      ...item,
      profit,
      marginPercent,
      avgPrice,
    };
  });
}

export function get12MonthsBreakdown(movements: Movement[]) {
  const now = new Date();
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const monthLabel = d.toLocaleString("es-CL", { month: "short", year: "2-digit" });
    const monthSales = movements.filter((m) => m.kind === "Venta" && m.date.startsWith(yearMonth));
    const monthPurchases = movements.filter((m) => m.kind === "Compra" && m.date.startsWith(yearMonth));
    const ventas = monthSales.reduce((s, m) => s + m.total, 0);
    const compras = monthPurchases.reduce((s, m) => s + m.total, 0);
    const utilidad = ventas - compras;
    const countVentas = monthSales.length;
    const ticketPromedio = countVentas > 0 ? ventas / countVentas : 0;
    months.push({
      yearMonth,
      label: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
      ventas,
      compras,
      utilidad,
      countVentas,
      ticketPromedio,
    });
  }
  return months;
}
