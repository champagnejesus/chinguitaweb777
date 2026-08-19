"use client";
import { useState, useMemo } from "react";
import { ChevronDown, Edit, Trash2, Plus, Package, Boxes, TrendingUp } from "lucide-react";
import { State, Product, Movement, Presentation } from "../../lib/types";
import { productName, partyName, money, productValue, unitCostForMovement } from "../../lib/utils";
import { SearchBar } from "../ui/SearchBar";
import { ExportActions } from "../ui/ExportActions";

export function Inventory({
  state,
  selectedProductId,
  onSelectProduct,
  onEditProduct,
  onDeleteMovement,
  onEditMovement,
  globalSearch,
  onAddProduct,
}: {
  state: State;
  selectedProductId: string | null;
  onSelectProduct: (id: string | null) => void;
  onEditProduct: (p: Product) => void;
  onDeleteMovement: (id: string) => void;
  onEditMovement: (m: Movement) => void;
  globalSearch: string;
  onAddProduct: () => void;
}) {
  const [filter, setFilter] = useState<"todas" | Presentation>("todas");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("todas");
  const presentations: Presentation[] = filter === "todas" ? ["unidad", "caja"] : [filter];

  const categories = useMemo(() => {
    const cats = new Set<string>();
    state.products.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats).sort();
  }, [state.products]);

  const effectiveSearch = search || globalSearch;

  const stats = state.products.map((product) => {
    const sales = state.movements.filter((m) => m.kind === "Venta" && m.productId === product.id);
    const adjustments = state.movements.filter((m) => m.kind === "Ajuste" && m.productId === product.id);

    const sold = (presentation: Presentation) =>
      sales
        .filter((m) => (m.unit === "caja" ? "caja" : "unidad") === presentation)
        .reduce((sum, m) => sum + m.quantity, 0);
    const revenue = (presentation: Presentation) =>
      sales
        .filter((m) => (m.unit === "caja" ? "caja" : "unidad") === presentation)
        .reduce((sum, m) => sum + m.total, 0);
    const cost = (presentation: Presentation) =>
      sales
        .filter((m) => (m.unit === "caja" ? "caja" : "unidad") === presentation)
        .reduce((sum, m) => sum + m.quantity * unitCostForMovement(m, product), 0);

    const mermaLoss = (presentation: Presentation) =>
      adjustments
        .filter((m) => (m.unit === "caja" ? "caja" : "unidad") === presentation && m.quantity < 0)
        .reduce((sum, m) => sum + Math.abs(m.quantity) * unitCostForMovement(m, product), 0);

    return {
      product,
      sold,
      revenue,
      cost,
      profit: (presentation: Presentation) => revenue(presentation) - cost(presentation) - mermaLoss(presentation),
    };
  });

  const visibleStats = selectedProductId ? stats.filter((s) => s.product.id === selectedProductId) : stats;
  const categoryFilteredStats = categoryFilter === "todas" ? visibleStats : visibleStats.filter((s) => s.product.category === categoryFilter);
  const filteredStats = categoryFilteredStats.filter((s) => s.product.name.toLowerCase().includes(effectiveSearch.toLowerCase()));

  const totalProfit = filteredStats.reduce((sum, s) => sum + presentations.reduce((n, p) => n + s.profit(p), 0), 0);
  const totalUnits = filteredStats.reduce((sum, s) => sum + productValue(s.product, "unidad", "stock"), 0);
  const totalBoxes = filteredStats.reduce((sum, s) => sum + productValue(s.product, "caja", "stock"), 0);

  const movementRowsData = state.movements.filter(
    (m) => (!selectedProductId || m.productId === selectedProductId) && (filter === "todas" || (m.unit === "caja" ? "caja" : "unidad") === filter)
  );
  const report = movementRowsData.map((m) => {
    const product = state.products.find((p) => p.id === m.productId);
    const presentation = m.unit === "caja" ? "caja" : "unidad";
    const signed = m.kind === "Compra" ? m.quantity : m.kind === "Venta" ? -m.quantity : m.quantity;
    return {
      Fecha: m.date,
      "Cliente / Proveedor": partyName(m, state),
      Producto: productName(m, state),
      Unidad: presentation === "unidad" ? signed : "—",
      Caja: presentation === "caja" ? signed : "—",
      "Stock del producto · Unidad": product ? productValue(product, "unidad", "stock") : 0,
      "Stock del producto · Caja": product ? productValue(product, "caja", "stock") : 0,
    };
  });

  const runningStockMap = useMemo(() => {
    const map = new Map<string, { stockUnit: number; stockBox: number }>();
    const byProduct = new Map<string, Movement[]>();
    state.movements.forEach((m) => {
      const list = byProduct.get(m.productId) || [];
      list.push(m);
      byProduct.set(m.productId, list);
    });

    byProduct.forEach((movs, prodId) => {
      const product = state.products.find((p) => p.id === prodId);
      if (!product) return;

      const sorted = [...movs].sort((a, b) => a.date.localeCompare(b.date));

      let netUnitDelta = 0;
      let netBoxDelta = 0;
      sorted.forEach((m) => {
        const signed = m.kind === "Compra" ? m.quantity : m.kind === "Venta" ? -m.quantity : m.quantity;
        if (m.unit === "caja") netBoxDelta += signed;
        else netUnitDelta += signed;
      });

      const finalUnit = productValue(product, "unidad", "stock");
      const finalBox = productValue(product, "caja", "stock");
      let currentUnit = finalUnit - netUnitDelta;
      let currentBox = finalBox - netBoxDelta;

      sorted.forEach((m) => {
        const signed = m.kind === "Compra" ? m.quantity : m.kind === "Venta" ? -m.quantity : m.quantity;
        if (m.unit === "caja") currentBox += signed;
        else currentUnit += signed;
        map.set(m.id, { stockUnit: Math.max(0, currentUnit), stockBox: Math.max(0, currentBox) });
      });
    });

    return map;
  }, [state.movements, state.products]);

  return (
    <section className="inventory-page">
      <div className="surface-title">
        <div>
          <p className="eyebrow">CONTROL POR PRESENTACIÓN</p>
          <h2>{selectedProductId ? visibleStats[0]?.product.name : "Detalle completo de productos"}</h2>
          <p style={{ margin: "4px 0 0", color: "var(--slate-500)", fontSize: 13 }}>
            {selectedProductId ? "Ficha individual del producto seleccionado." : "Stock, costos, precios y rentabilidad real por unidad y por caja."}
          </p>
        </div>
      </div>

      <div className="section-toolbar">
        <div className="toolbar-group-left">
          <SearchBar value={search} onChange={setSearch} placeholder="Filtrar productos..." />

          <label className="toolbar-select-pill">
            <span>PRODUCTO</span>
            <select value={selectedProductId || "todas"} onChange={(e) => onSelectProduct(e.target.value === "todas" ? null : e.target.value)}>
              <option value="todas">Todos los productos</option>
              {state.products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.unit})
                </option>
              ))}
            </select>
            <ChevronDown size={14} />
          </label>

          <label className="toolbar-select-pill">
            <span>PRESENTACIÓN</span>
            <select value={filter} onChange={(e) => setFilter(e.target.value as "todas" | Presentation)}>
              <option value="todas">Todas</option>
              <option value="unidad">Por unidad</option>
              <option value="caja">Por caja</option>
            </select>
            <ChevronDown size={14} />
          </label>

          {categories.length > 0 && (
            <label className="toolbar-select-pill">
              <span>CATEGORÍA</span>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="todas">Todas</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} />
            </label>
          )}
        </div>

        <div className="toolbar-group-right">
          {selectedProductId && (
            <button className="secondary-button compact" onClick={() => onSelectProduct(null)}>
              Ver todo el inventario
            </button>
          )}
          <ExportActions title={selectedProductId ? `Inventario-${visibleStats[0]?.product.name}` : "Inventario-detallado"} rows={report} />
          <button className="primary-button compact" onClick={onAddProduct}>
            <Plus size={15} />
            Producto
          </button>
        </div>
      </div>

      <div className="inventory-kpis">
        <article>
          <span className="inventory-kpi-icon teal">
            <Package />
          </span>
          <div>
            <small>Stock por unidad</small>
            <strong>{totalUnits}</strong>
          </div>
        </article>
        <article>
          <span className="inventory-kpi-icon blue">
            <Boxes />
          </span>
          <div>
            <small>Stock por caja</small>
            <strong>{totalBoxes}</strong>
          </div>
        </article>
        <article>
          <span className="inventory-kpi-icon green">
            <TrendingUp />
          </span>
          <div>
            <small>Utilidad estimada</small>
            <strong>{money(totalProfit)}</strong>
          </div>
        </article>
      </div>

      {selectedProductId && visibleStats[0] && (
        <div className="selected-product-summary-bar mb-6" style={{ background: "var(--ice-50)", padding: "14px 20px", borderRadius: 12, border: "1px solid var(--ice-200)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--navy-900)" }}>
              {visibleStats[0].product.name} ({visibleStats[0].product.unit})
              {visibleStats[0].product.category && <small style={{ marginLeft: 8, color: "var(--slate-500)", fontWeight: 400 }}>{visibleStats[0].product.category}</small>}
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--slate-600)" }}>
              Stock Unidades: <strong>{productValue(visibleStats[0].product, "unidad", "stock")}</strong> (Mín: {productValue(visibleStats[0].product, "unidad", "minimum")}) |
              Stock Cajas: <strong>{productValue(visibleStats[0].product, "caja", "stock")}</strong> (Mín: {productValue(visibleStats[0].product, "caja", "minimum")}) |
              P. Venta Un: <strong>{money(productValue(visibleStats[0].product, "unidad", "sell"))}</strong> |
              P. Venta Caja: <strong>{money(productValue(visibleStats[0].product, "caja", "sell"))}</strong>
            </p>
          </div>
          <button className="secondary-button compact" onClick={() => onEditProduct(visibleStats[0].product)}>
            <Edit size={14} />
            Editar Producto
          </button>
        </div>
      )}

      <h3>Historial de Movimientos de Inventario</h3>
      <div className="inventory-ledger responsive-table">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Cliente / Prov / Motivo</th>
              <th>Producto</th>
              <th>Unidad</th>
              <th>Caja</th>
              <th>Stock · Un</th>
              <th>Stock · Cj</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {movementRowsData.map((m) => {
              const product = state.products.find((p) => p.id === m.productId);
              const presentation = m.unit === "caja" ? "caja" : "unidad";
              const signed = m.kind === "Compra" ? m.quantity : m.kind === "Venta" ? -m.quantity : m.quantity;
              const stockInfo = runningStockMap.get(m.id);
              const stockUn = stockInfo ? stockInfo.stockUnit : (product ? productValue(product, "unidad", "stock") : 0);
              const stockCj = stockInfo ? stockInfo.stockBox : (product ? productValue(product, "caja", "stock") : 0);

              return (
                <tr key={m.id}>
                  <td data-label="Fecha">{m.date}</td>
                  <td data-label="Cliente / Prov / Motivo">
                    <strong>{partyName(m, state)}</strong>
                  </td>
                  <td data-label="Producto">
                    <button className="inventory-product-link" onClick={() => onSelectProduct(m.productId)}>
                      {productName(m, state)}
                    </button>
                  </td>
                  <td data-label="Unidad">
                    {presentation === "unidad" ? (
                      <span className={`inventory-quantity ${m.kind === "Compra" || (m.kind === "Ajuste" && signed > 0) ? "in" : "out"}`}>
                        {signed > 0 ? "+" : ""}
                        {signed}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td data-label="Caja">
                    {presentation === "caja" ? (
                      <span className={`inventory-quantity ${m.kind === "Compra" || (m.kind === "Ajuste" && signed > 0) ? "in" : "out"}`}>
                        {signed > 0 ? "+" : ""}
                        {signed}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td data-label="Stock · Un">
                    <strong>{stockUn}</strong>
                  </td>
                  <td data-label="Stock · Cj">
                    <strong>{stockCj}</strong>
                  </td>
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
              );
            })}
            {!movementRowsData.length && (
              <tr>
                <td colSpan={8} className="empty-state">
                  Aún no hay movimientos de inventario.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
