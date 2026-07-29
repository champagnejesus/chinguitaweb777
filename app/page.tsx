"use client";

import { AlertTriangle, Boxes, Building2, ChevronDown, CircleDollarSign, Edit, FileSpreadsheet, Fish, Home, LogOut, Menu, Moon, Package, Plus, Printer, Search, ShoppingBasket, ShoppingCart, Sun, Trash2, TrendingUp, UsersRound, WalletCards, X, History, Eye, EyeOff, RefreshCw, Upload } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import type { Section, Presentation, Product, Party, Movement, State, ExportRow, ModalKind } from "../lib/types";
import { money, dateToday, getDatePresets, getProductSalesBreakdown, get12MonthsBreakdown, productValue, unitCostForMovement, partyName, productName, computeTrend, formatTrend, exportExcel, exportPdf, movementRows as buildMovementRows, activityRows as buildActivityRows, accountRows as buildAccountRows } from "../lib/utils";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { AddProductModal } from "../components/AddProductModal";
import { ImportCsvModal } from "../components/ImportCsvModal";
import { ToastContainer, ToastItem } from "../components/ui/Toast";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { SearchBar } from "../components/ui/SearchBar";
import { useSession } from "../hooks/useSession";

const emptyState: State = {
  products: [],
  clients: [],
  providers: [],
  movements: [],
};

const nav = [
  ["resumen", "Resumen", Home],
  ["compras", "Compras", ShoppingBasket],
  ["ventas", "Ventas", ShoppingCart],
  ["inventario", "Inventario", Boxes],
  ["clientes", "Clientes", UsersRound],
  ["proveedores", "Proveedores", Building2],
  ["cobrar", "Por cobrar", WalletCards],
  ["pagar", "Por pagar", CircleDollarSign],
  ["auditoria", "Auditoría", History],
] as const;

function App() {
  const { token, user, isValidating, login: sessionLogin, logout: sessionLogout } = useSession();
  const [state, setState] = useState<State>(emptyState);
  const [active, setActive] = useState<Section>("resumen");
  const [menu, setMenu] = useState(false);
  const [modal, setModal] = useState<ModalKind | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedParty, setSelectedParty] = useState<{ party: Party; kind: "Cliente" | "Proveedor" } | null>(null);
  const [inventoryProductId, setInventoryProductId] = useState<string | null>(null);
  const [globalSearch, setGlobalSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [stateVersion, setStateVersion] = useState("0");
  const [concurrencyConflict, setConcurrencyConflict] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const [darkMode, setDarkMode] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; danger?: boolean; onConfirm: () => void } | null>(null);

  const addToast = useCallback((message: string, type: ToastItem["type"] = "info") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const isDark = localStorage.getItem("cj-dark") === "true";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    localStorage.setItem("cj-dark", String(next));
    setDarkMode(next);
    if (next) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const load = useCallback(async (t: string) => {
    const r = await fetch("/api/data", { headers: { authorization: `Bearer ${t}` } });
    if (!r.ok) {
      localStorage.clear();
      setLoading(false);
      return;
    }
    const d = await r.json();
    if (d.state) {
      const sanitizedState: State = {
        products: d.state.products || [],
        clients: d.state.clients || [],
        providers: d.state.providers || [],
        movements: d.state.movements || [],
      };
      setState(sanitizedState);
    }
    if (d.version) setStateVersion(d.version);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isValidating && token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void load(token);
    } else if (!isValidating && !token) {
      setLoading(false);
    }
  }, [isValidating, token, load]);

  const persist = useCallback(async (next: State, action?: string, details?: string) => {
    setState(next);
    const r = await fetch("/api/data", {
      method: "PUT",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ state: next, version: stateVersion, action, details }),
    });
    if (r.status === 409) {
      setConcurrencyConflict(true);
      addToast("Conflicto de concurrencia: Guardado cancelado", "error");
      return;
    }
    const d = await r.json();
    if (r.ok) {
      if (d.version) setStateVersion(d.version);
      addToast("Información guardada", "success");
    } else {
      addToast(d.error || "No se pudo guardar", "error");
    }
  }, [token, stateVersion, addToast]);

  const loadAuditLogs = useCallback(async () => {
    setLoadingAudit(true);
    try {
      const res = await fetch("/api/audit", {
        headers: { authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAudit(false);
    }
  }, [token]);

  useEffect(() => {
    if (active === "auditoria") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadAuditLogs();
    }
  }, [active, loadAuditLogs]);

  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const r = await fetch("/api/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: fd.get("name"), password: fd.get("password") }),
    });
    const d = await r.json();
    if (!r.ok) {
      addToast(d.error, "error");
      return;
    }
    sessionLogin(d.token, d.user);
    setLoading(true);
    await load(d.token);
  }

  async function logout() {
    await sessionLogout();
  }

  async function deleteMovement(id: string) {
    setConfirmDialog({
      title: "Eliminar movimiento",
      message: "¿Estás seguro de que deseas eliminar este movimiento? Esto revertirá los cambios de stock correspondientes.",
      danger: true,
      onConfirm: async () => {
        setConfirmDialog(null);
        const m = state.movements.find((x) => x.id === id);
        if (!m) return;
        const nextProducts = state.products.map((p) => {
          if (p.id !== m.productId) return p;
          const isBox = m.unit === "caja";
          let delta = 0;
          if (m.kind === "Compra") delta = -m.quantity;
          else if (m.kind === "Venta") delta = m.quantity;
          else if (m.kind === "Ajuste") delta = -m.quantity;

          if (isBox) {
            return { ...p, stockBox: Math.max(0, productValue(p, "caja", "stock") + delta) };
          } else {
            return { ...p, stockUnit: Math.max(0, productValue(p, "unidad", "stock") + delta) };
          }
        });
        const nextMovements = state.movements.filter((x) => x.id !== id);
        await persist(
          { ...state, products: nextProducts, movements: nextMovements },
          "Eliminó Movimiento",
          `${m.kind} - ${productName(m, state)} (${m.quantity} ${m.unit})`
        );
      },
    });
  }

  async function deleteParty(id: string, kind: "Cliente" | "Proveedor") {
    const key = kind === "Cliente" ? "clients" : "providers";
    const partyNameStr = state[key].find((x) => x.id === id)?.name || "este registro";
    const hasMovements = state.movements.some((m) => m.partyId === id);
    if (hasMovements) {
      addToast(`No se puede eliminar a "${partyNameStr}" porque tiene movimientos comerciales asociados.`, "error");
      return;
    }
    setConfirmDialog({
      title: `Eliminar ${kind.toLowerCase()}`,
      message: `¿Estás seguro de que deseas eliminar a "${partyNameStr}"?`,
      danger: true,
      onConfirm: async () => {
        setConfirmDialog(null);
        const nextParties = state[key].filter((x) => x.id !== id);
        await persist(
          { ...state, [key]: nextParties },
          `Eliminó ${kind}`,
          `Nombre: ${partyNameStr}`
        );
      },
    });
  }

  if (isValidating || loading) {
    return (
      <div className="splash">
        <Fish size={42} />
        <strong>CHUNGUITA Jr</strong>
        <span>Cargando gestión comercial…</span>
      </div>
    );
  }

  if (!token) {
    return <Login onLogin={login} />;
  }

  const titles: Record<Section, string> = {
    resumen: "Resumen del negocio",
    compras: "Compras",
    ventas: "Ventas",
    inventario: "Inventario",
    clientes: "Clientes",
    proveedores: "Proveedores",
    cobrar: "Cuentas por cobrar",
    pagar: "Cuentas por pagar",
    auditoria: "Registro de Auditoría",
  };

  return (
    <div className={`app-shell ${darkMode ? "dark" : ""}`}>
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <Brand />
        <button className="icon-button close-menu" onClick={() => setMenu(false)}>
          <X />
        </button>
        <nav>
          <p className="nav-label">GESTIÓN COMERCIAL</p>
          {nav.map(([id, label, Icon]) => (
            <button key={id} className={active === id ? "active" : ""} onClick={() => { setActive(id); setMenu(false); }}>
              <Icon size={19} />
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-user">
          <span className="avatar">{user.slice(0, 2).toUpperCase()}</span>
          <div>
            <strong>{user}</strong>
            <small>Administrador</small>
          </div>
          <div style={{ display: "flex", gap: "6px", marginLeft: "auto" }}>
            <button className="icon-button" onClick={toggleDarkMode} title="Cambiar tema" style={{ width: "32px", height: "32px", borderRadius: "8px" }}>
              {darkMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button className="icon-button" onClick={logout} title="Cerrar sesión" style={{ width: "32px", height: "32px", borderRadius: "8px" }}>
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>
      {menu && <button className="menu-backdrop" onClick={() => setMenu(false)} />}

      <main className="main-content">
        <header className="mobile-header">
          <button className="icon-button" onClick={() => setMenu(true)}>
            <Menu />
          </button>
          <Brand />
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="icon-button" onClick={toggleDarkMode} title="Cambiar tema">
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="mobile-add" onClick={() => setModal("Venta")}>
              <Plus />
            </button>
          </div>
        </header>
        <section className="page-header">
          <div>
            {active !== "resumen" && (
              <button className="home-return" onClick={() => setActive("resumen")}>
                <Home size={20} />Volver al inicio
              </button>
            )}
            <p className="eyebrow">CHUNGUITA JR · INFORMACIÓN COMPARTIDA</p>
            <h1>{titles[active]}</h1>
            <p>Sesión de {user}</p>
          </div>
          <div className="header-actions">
            <SearchBar
              value={globalSearch}
              onChange={setGlobalSearch}
              placeholder="Buscar en todo..."
            />
            {active === "inventario" && (
              <>
                <button className="secondary-button compact" onClick={() => setModal("ImportCsv")}>
                  <Upload size={16} />Importar
                </button>
                <button className="primary-button" onClick={() => { setSelectedItem(null); setModal("Ajuste"); }}>
                  <Plus />Ajustar Stock
                </button>
              </>
            )}
          </div>
        </section>

        {active === "resumen" && (
          <Dashboard
            state={state}
            onNavigate={setActive}
            onRefresh={async () => { setLoading(true); await load(token); }}
          />
        )}
        {(active === "ventas" || active === "compras") && (
          <Movements
            kind={active === "ventas" ? "Venta" : "Compra"}
            state={state}
            globalSearch={globalSearch}
            onNew={() => setModal(active === "ventas" ? "Venta" : "Compra")}
            onDeleteMovement={deleteMovement}
            onEditMovement={(m) => { setSelectedItem(m); setModal("EditMovimiento"); }}
          />
        )}
        {active === "inventario" && (
          <Inventory
            state={state}
            selectedProductId={inventoryProductId}
            onSelectProduct={setInventoryProductId}
            onEditProduct={(p) => { setSelectedItem(p); setModal("EditProducto"); }}
            onDeleteMovement={deleteMovement}
            globalSearch={globalSearch}
            onAddProduct={() => setModal("AddProducto")}
          />
        )}
        {(active === "clientes" || active === "proveedores") && (
          <Parties
            kind={active === "clientes" ? "Cliente" : "Proveedor"}
            rows={active === "clientes" ? state.clients : state.providers}
            onNew={() => setModal(active === "clientes" ? "Cliente" : "Proveedor")}
            onEdit={(p) => { setSelectedItem(p); setModal(active === "clientes" ? "EditCliente" : "EditProveedor"); }}
            onDelete={(id) => deleteParty(id, active === "clientes" ? "Cliente" : "Proveedor")}
            onViewProfile={(p) => setSelectedParty({ party: p, kind: active === "clientes" ? "Cliente" : "Proveedor" })}
          />
        )}
        {(active === "cobrar" || active === "pagar") && (
          <Accounts
            kind={active === "cobrar" ? "Venta" : "Compra"}
            state={state}
            onPay={() => setModal("Pago")}
            onDeleteMovement={deleteMovement}
          />
        )}
        {active === "auditoria" && (
          <AuditLogs logs={auditLogs} loading={loadingAudit} onReload={loadAuditLogs} />
        )}
      </main>

      <nav className="mobile-nav">
        {nav.slice(0, 5).map(([id, label, Icon]) => (
          <button key={id} className={active === id ? "active" : ""} onClick={() => setActive(id)}>
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {modal === "AddProducto" && (
        <AddProductModal
          onClose={() => setModal(null)}
          onSave={(partial) => {
            const newProduct = partial.products[0];
            persist({ ...state, products: [...state.products, ...partial.products] }, "Agregó Producto", `Nombre: ${newProduct.name}`);
            setModal(null);
          }}
        />
      )}
      {modal === "ImportCsv" && (
        <ImportCsvModal
          state={state}
          onClose={() => setModal(null)}
          onImport={(movements) => {
            persist(
              { ...state, movements: [...movements, ...state.movements] },
              "Importó CSV",
              `${movements.length} movimientos importados`
            );
            setModal(null);
          }}
        />
      )}
      {modal && modal !== "AddProducto" && modal !== "ImportCsv" && (
        <Modal
          kind={modal}
          state={state}
          user={user}
          selectedItem={selectedItem}
          onClose={() => { setModal(null); setSelectedItem(null); }}
          onSave={async (n, act, det) => {
            await persist(n, act, det);
            setModal(null);
            setSelectedItem(null);
          }}
        />
      )}

      {selectedParty && (
        <PartyProfileModal
          party={selectedParty.party}
          kind={selectedParty.kind}
          state={state}
          onClose={() => setSelectedParty(null)}
          onEdit={(party) => {
            setSelectedParty(null);
            setSelectedItem(party);
            setModal(selectedParty.kind === "Cliente" ? "EditCliente" : "EditProveedor");
          }}
          onDelete={(partyId) => {
            setSelectedParty(null);
            deleteParty(partyId, selectedParty.kind);
          }}
          onDeleteMovement={deleteMovement}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          danger={confirmDialog.danger}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      {concurrencyConflict && (
        <div className="modal-layer">
          <div className="modal-card" style={{ maxWidth: 450, textAlign: "center" }}>
            <div style={{ color: "var(--coral-600)", marginBottom: 16 }}>
              <AlertTriangle size={48} style={{ margin: "0 auto" }} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, color: "var(--navy-950)" }}>
              ¡Conflicto de Concurrencia!
            </h3>
            <p style={{ color: "var(--slate-600)", fontSize: 14, lineHeight: 1.5, marginBottom: 20 }}>
              Otro usuario ha modificado y guardado información en el sistema mientras tenías la página abierta. Para evitar sobreescribir sus cambios, el guardado ha sido cancelado.
            </p>
            <button
              className="primary-button"
              style={{ width: "100%", minHeight: 46 }}
              onClick={() => {
                setConcurrencyConflict(false);
                window.location.reload();
              }}
            >
              Recargar Página y Fusionar Cambios
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Login({ onLogin }: { onLogin: (e: FormEvent<HTMLFormElement>) => void }) {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <main className="login-page">
      <section className="login-card">
        <Brand />
        <div>
          <p className="eyebrow">ACCESO SEGURO</p>
          <h1>Gestión comercial</h1>
          <p>Ingresa con tu nombre y clave asignada.</p>
        </div>
        <form onSubmit={onLogin}>
          <label>
            Usuario
            <select name="name">
              <option>Juan Pablo</option>
              <option>Soledad Cortes</option>
              <option>Miguel Angel Contreras</option>
              <option>Administrador</option>
            </select>
          </label>
          <label>
            Clave
            <div style={{ position: "relative", marginTop: 8 }}>
              <input name="password" type={showPassword ? "text" : "password"} required style={{ width: "100%", paddingRight: 46, marginTop: 0 }} />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "transparent", border: 0, padding: 4, display: "grid", placeItems: "center", color: "var(--slate-500)", cursor: "pointer" }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          <button className="primary-button" type="submit">
            Ingresar
          </button>
        </form>
        <small>Todos los movimientos quedarán identificados por usuario, fecha y hora.</small>
      </section>
    </main>
  );
}

function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark">
        <Fish size={32} />
      </div>
      <div>
        <strong>
          CHUNGUITA <em>Jr</em>
        </strong>
        <small>GESTIÓN COMERCIAL</small>
      </div>
    </div>
  );
}

function ExportActions({ title, rows }: { title: string; rows: ExportRow[] }) {
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

function SalesTabContent({ state, onNavigate }: { state: State; onNavigate: (s: Section) => void }) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("todas");

  const salesMovs = state.movements.filter((m) => {
    if (m.kind !== "Venta") return false;
    const p = state.products.find((x) => x.id === m.productId);
    const pName = productName(m, state);
    const partName = partyName(m, state);
    const matchSearch = !search || pName.toLowerCase().includes(search.toLowerCase()) || partName.toLowerCase().includes(search.toLowerCase());
    const matchStart = !startDate || m.date >= startDate;
    const matchEnd = !endDate || m.date <= endDate;
    const matchCategory = selectedCategory === "todas" || p?.category === selectedCategory;
    return matchSearch && matchStart && matchEnd && matchCategory;
  });

  const totalVentas = salesMovs.reduce((s, m) => s + m.total, 0);
  const totalCost = salesMovs.reduce((s, m) => {
    const p = state.products.find((x) => x.id === m.productId);
    return s + m.quantity * unitCostForMovement(m, p);
  }, 0);
  const utilidadBruta = totalVentas - totalCost;
  const margenBruto = totalVentas > 0 ? (utilidadBruta / totalVentas) * 100 : 0;
  const ticketPromedio = salesMovs.length > 0 ? totalVentas / salesMovs.length : 0;
  const uniqueClients = new Set(salesMovs.map((m) => m.partyId)).size;
  const avgPerClient = uniqueClients > 0 ? totalVentas / uniqueClients : 0;

  const categories = Array.from(new Set(state.products.map((p) => p.category).filter(Boolean))) as string[];
  const productPerformance = getProductSalesBreakdown(salesMovs, state);

  const exportData = productPerformance.map((p) => ({
    Producto: p.product.name,
    Categoría: p.product.category || "Sin categoría",
    "Unidades Vendidas": p.qtyUnits,
    "Cajas Vendidas": p.qtyBoxes,
    "Precio Promed.": money(p.avgPrice),
    "Total Ventas": money(p.totalSales),
    "Costo Total": money(p.totalCost),
    "Utilidad Generada": money(p.profit),
    "Margen %": `${p.marginPercent.toFixed(1)}%`,
  }));

  return (
    <div>
      <div className="section-toolbar" style={{ margin: "0 0 20px" }}>
        <div className="toolbar-group-left">
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar venta por producto o cliente..." />
          <label className="toolbar-select-pill">
            <span>CATEGORÍA</span>
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
              <option value="todas">Todas</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <ChevronDown size={14} />
          </label>
          <DatePresetsToolbar startDate={startDate} endDate={endDate} onRangeChange={(s, e) => { setStartDate(s); setEndDate(e); }} />
        </div>
        <div className="toolbar-group-right">
          <ExportActions title="Detalle-Rendimiento-Ventas" rows={exportData} />
        </div>
      </div>

      <div className="party-kpi-cards" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", marginBottom: 20 }}>
        <div className="party-kpi-card">
          <span className="kpi-label">Total Facturado</span>
          <span className="kpi-val" style={{ color: "#1e8e3e" }}>{money(totalVentas)}</span>
        </div>
        <div className="party-kpi-card">
          <span className="kpi-label">Costo de Ventas (COGS)</span>
          <span className="kpi-val" style={{ color: "var(--cyan-600)" }}>{money(totalCost)}</span>
        </div>
        <div className="party-kpi-card">
          <span className="kpi-label">Margen Bruto</span>
          <span className="kpi-val" style={{ color: "var(--coral-600)" }}>{money(utilidadBruta)} ({margenBruto.toFixed(1)}%)</span>
        </div>
        <div className="party-kpi-card">
          <span className="kpi-label">Ticket Promedio</span>
          <span className="kpi-val" style={{ color: "var(--navy-900)" }}>{money(ticketPromedio)}</span>
        </div>
        <div className="party-kpi-card">
          <span className="kpi-label">Promedio por Cliente</span>
          <span className="kpi-val" style={{ color: "var(--violet-600)" }}>{money(avgPerClient)}</span>
        </div>
      </div>

      <h3 className="operations-table-title" style={{ marginBottom: 12 }}>Detalle de Rendimiento de Ventas por Producto</h3>
      <div className="responsive-table">
        <table>
          <thead>
            <tr>
              <th>PRODUCTO</th>
              <th>CATEGORÍA</th>
              <th className="text-right">UNIDADES</th>
              <th className="text-right">CAJAS</th>
              <th className="text-right">PRECIO PROM.</th>
              <th className="text-right">TOTAL VENTAS</th>
              <th className="text-right">COSTO TOTAL</th>
              <th className="text-right">UTILIDAD</th>
              <th className="text-right">MARGEN %</th>
            </tr>
          </thead>
          <tbody>
            {productPerformance.map((item) => (
              <tr key={item.product.id}>
                <td><strong>{item.product.name}</strong></td>
                <td>{item.product.category || "—"}</td>
                <td className="text-right">{item.qtyUnits}</td>
                <td className="text-right">{item.qtyBoxes}</td>
                <td className="text-right">{money(item.avgPrice)}</td>
                <td className="text-right font-semibold" style={{ color: "#1e8e3e" }}>{money(item.totalSales)}</td>
                <td className="text-right">{money(item.totalCost)}</td>
                <td className="text-right font-semibold" style={{ color: "var(--coral-600)" }}>{money(item.profit)}</td>
                <td className="text-right font-semibold" style={{ color: item.marginPercent >= 20 ? "#15803d" : "#dc2626" }}>
                  {item.marginPercent.toFixed(1)}%
                </td>
              </tr>
            ))}
            {!productPerformance.length && (
              <tr>
                <td colSpan={9} className="empty-state">No hay ventas registradas en el período seleccionado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProfitabilityTabContent({ state }: { state: State }) {
  const [marginFilter, setMarginFilter] = useState<"todos" | "alto" | "normal" | "riesgo">("todos");
  const [categoryFilter, setCategoryFilter] = useState("todas");

  const sales = state.movements.filter((m) => m.kind === "Venta");
  const adjustments = state.movements.filter((m) => m.kind === "Ajuste");

  const productBreakdown = getProductSalesBreakdown(state.movements, state);
  const categories = Array.from(new Set(state.products.map((p) => p.category).filter(Boolean))) as string[];

  const filteredProducts = productBreakdown.filter((item) => {
    const matchCategory = categoryFilter === "todas" || item.product.category === categoryFilter;
    let matchMargin = true;
    if (marginFilter === "alto") matchMargin = item.marginPercent >= 30;
    else if (marginFilter === "normal") matchMargin = item.marginPercent >= 15 && item.marginPercent < 30;
    else if (marginFilter === "riesgo") matchMargin = item.marginPercent < 15;
    return matchCategory && matchMargin;
  });

  const totalSales = sales.reduce((s, m) => s + m.total, 0);
  const totalCost = sales.reduce((s, m) => {
    const p = state.products.find((x) => x.id === m.productId);
    return s + m.quantity * unitCostForMovement(m, p);
  }, 0);
  const adjustmentCost = adjustments.reduce((s, m) => {
    const p = state.products.find((x) => x.id === m.productId);
    return s + Math.abs(m.quantity) * unitCostForMovement(m, p);
  }, 0);
  const totalProfit = totalSales - totalCost - adjustmentCost;
  const globalMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

  const starProduct = [...productBreakdown].sort((a, b) => b.profit - a.profit)[0];
  const riskCount = productBreakdown.filter((p) => p.marginPercent < 15).length;

  const exportData = filteredProducts.map((p) => ({
    Producto: p.product.name,
    "Ingresos Totales": money(p.totalSales),
    "Costo Directo": money(p.totalCost),
    "Margen Contribución ($)": money(p.profit),
    "Margen Contribución (%)": `${p.marginPercent.toFixed(1)}%`,
    "Salud de Margen": p.marginPercent >= 30 ? "Excelente (>30%)" : p.marginPercent >= 15 ? "Normal (15-30%)" : "Riesgo (<15%)",
  }));

  const heatmapData: { category: string; profit: number; sales: number; margin: number }[] = categories.map((cat) => {
    const catProds = productBreakdown.filter((p) => p.product.category === cat);
    const catSales = catProds.reduce((s, p) => s + p.totalSales, 0);
    const catProfit = catProds.reduce((s, p) => s + p.profit, 0);
    const catMargin = catSales > 0 ? (catProfit / catSales) * 100 : 0;
    return { category: cat, profit: catProfit, sales: catSales, margin: catMargin };
  });

  return (
    <div>
      <div className="section-toolbar" style={{ margin: "0 0 20px" }}>
        <div className="toolbar-group-left">
          <div className="toolbar-segmented-track">
            <button className={`toolbar-segmented-item ${marginFilter === "todos" ? "active" : ""}`} onClick={() => setMarginFilter("todos")}>Todos</button>
            <button className={`toolbar-segmented-item ${marginFilter === "alto" ? "active" : ""}`} onClick={() => setMarginFilter("alto")}>Alto (&gt;30%)</button>
            <button className={`toolbar-segmented-item ${marginFilter === "normal" ? "active" : ""}`} onClick={() => setMarginFilter("normal")}>Normal (15-30%)</button>
            <button className={`toolbar-segmented-item ${marginFilter === "riesgo" ? "active" : ""}`} onClick={() => setMarginFilter("riesgo")}>Riesgo (&lt;15%)</button>
          </div>

          <label className="toolbar-select-pill">
            <span>CATEGORÍA</span>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="todas">Todas</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <ChevronDown size={14} />
          </label>
        </div>

        <div className="toolbar-group-right">
          <ExportActions title="Analisis-Rentabilidad-Margen" rows={exportData} />
        </div>
      </div>

      <div className="party-kpi-cards" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", marginBottom: 20 }}>
        <div className="party-kpi-card">
          <span className="kpi-label">Margen Bruto Global</span>
          <span className="kpi-val" style={{ color: "var(--violet-600)" }}>{globalMargin.toFixed(1)}%</span>
        </div>
        <div className="party-kpi-card">
          <span className="kpi-label">Producto Estrella</span>
          <span className="kpi-val" style={{ color: "#1e8e3e", fontSize: 15 }}>{starProduct?.product.name || "—"} ({money(starProduct?.profit || 0)})</span>
        </div>
        <div className="party-kpi-card">
          <span className="kpi-label">Productos en Riesgo</span>
          <span className="kpi-val" style={{ color: riskCount > 0 ? "#ef4444" : "#10b981" }}>{riskCount} productos</span>
        </div>
        <div className="party-kpi-card">
          <span className="kpi-label">Costo de Mermas / Ajustes</span>
          <span className="kpi-val" style={{ color: "var(--coral-600)" }}>{money(adjustmentCost)}</span>
        </div>
      </div>

      <div className="waterfall-card">
        <h4 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 800, color: "var(--navy-900)" }}>
          Gráfico en Cascada (Waterfall): Flujo de Ingresos a Utilidad Bruta
        </h4>
        <div className="waterfall-bars">
          <div className="waterfall-bar-group">
            <span style={{ fontSize: 11, fontWeight: 700, color: "#1e8e3e" }}>{money(totalSales)}</span>
            <div className="waterfall-bar" style={{ height: "100%", background: "#1e8e3e" }}>Ventas</div>
            <span style={{ fontSize: 11, color: "var(--slate-500)" }}>Ingresos</span>
          </div>
          <div className="waterfall-bar-group">
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--cyan-600)" }}>-{money(totalCost)}</span>
            <div className="waterfall-bar" style={{ height: `${totalSales > 0 ? (totalCost / totalSales) * 100 : 50}%`, background: "var(--cyan-600)" }}>Costos</div>
            <span style={{ fontSize: 11, color: "var(--slate-500)" }}>COGS</span>
          </div>
          <div className="waterfall-bar-group">
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--coral-600)" }}>-{money(adjustmentCost)}</span>
            <div className="waterfall-bar" style={{ height: `${totalSales > 0 ? Math.max(8, (adjustmentCost / totalSales) * 100) : 10}%`, background: "var(--coral-600)" }}>Mermas</div>
            <span style={{ fontSize: 11, color: "var(--slate-500)" }}>Ajustes</span>
          </div>
          <div className="waterfall-bar-group">
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--violet-600)" }}>{money(totalProfit)}</span>
            <div className="waterfall-bar" style={{ height: `${totalSales > 0 ? Math.max(12, (totalProfit / totalSales) * 100) : 30}%`, background: "var(--violet-600)" }}>Utilidad</div>
            <span style={{ fontSize: 11, color: "var(--slate-500)" }}>Neto</span>
          </div>
        </div>
      </div>

      {heatmapData.length > 0 && (
        <div style={{ marginBottom: 24, background: "var(--ice-50)", padding: 18, borderRadius: 16, border: "1px solid var(--ice-200)" }}>
          <h4 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 800, color: "var(--navy-900)" }}>Matriz Heatmap de Rentabilidad por Categoría</h4>
          <div className="heatmap-grid">
            {heatmapData.map((h) => (
              <div key={h.category} className={`heatmap-cell ${h.margin >= 30 ? "high" : h.margin >= 15 ? "mid" : "low"}`}>
                <small style={{ textTransform: "uppercase", fontSize: 10 }}>{h.category}</small>
                <strong style={{ fontSize: 15 }}>{h.margin.toFixed(1)}%</strong>
                <span style={{ fontSize: 11, opacity: 0.85 }}>{money(h.profit)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <h3 className="operations-table-title" style={{ marginBottom: 12 }}>Análisis de Margen de Contribución por Producto</h3>
      <div className="responsive-table">
        <table>
          <thead>
            <tr>
              <th>PRODUCTO / CATEGORÍA</th>
              <th className="text-right">INGRESOS TOTALES</th>
              <th className="text-right">COSTO VARIABLE</th>
              <th className="text-right">MARGEN CONTRIBUCIÓN ($)</th>
              <th className="text-right">MARGEN %</th>
              <th className="text-center">SALUD DE MARGEN</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((p) => (
              <tr key={p.product.id}>
                <td><strong>{p.product.name}</strong> <small style={{ color: "var(--slate-500)" }}>({p.product.category || "General"})</small></td>
                <td className="text-right">{money(p.totalSales)}</td>
                <td className="text-right">{money(p.totalCost)}</td>
                <td className="text-right font-semibold" style={{ color: "var(--coral-600)" }}>{money(p.profit)}</td>
                <td className="text-right font-semibold">{p.marginPercent.toFixed(1)}%</td>
                <td className="text-center">
                  <span className={`health-badge ${p.marginPercent >= 30 ? "high" : p.marginPercent >= 15 ? "normal" : "risk"}`}>
                    {p.marginPercent >= 30 ? "Excelente" : p.marginPercent >= 15 ? "Normal" : "En Riesgo (<15%)"}
                  </span>
                </td>
              </tr>
            ))}
            {!filteredProducts.length && (
              <tr>
                <td colSpan={6} className="empty-state">No hay registros que coincidan con los criterios.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MonthlySummaryTabContent({ state }: { state: State }) {
  const monthsData = get12MonthsBreakdown(state.movements);
  const currentMonth = monthsData[monthsData.length - 1] || { ventas: 0, compras: 0, utilidad: 0, countVentas: 0, ticketPromedio: 0, label: "Actual" };
  const prevMonth = monthsData[monthsData.length - 2] || { ventas: 0, compras: 0, utilidad: 0, countVentas: 0, ticketPromedio: 0, label: "Anterior" };
  const sameMonthLastYear = monthsData[0] || { ventas: 0, compras: 0, utilidad: 0, countVentas: 0, ticketPromedio: 0, label: "Año Pasado" };

  const salesMoM = prevMonth.ventas > 0 ? ((currentMonth.ventas - prevMonth.ventas) / prevMonth.ventas) * 100 : 0;
  const salesYoY = sameMonthLastYear.ventas > 0 ? ((currentMonth.ventas - sameMonthLastYear.ventas) / sameMonthLastYear.ventas) * 100 : 0;
  const profitMoM = prevMonth.utilidad > 0 ? ((currentMonth.utilidad - prevMonth.utilidad) / prevMonth.utilidad) * 100 : 0;
  const ticketMoM = prevMonth.ticketPromedio > 0 ? ((currentMonth.ticketPromedio - prevMonth.ticketPromedio) / prevMonth.ticketPromedio) * 100 : 0;

  const maxVal = Math.max(...monthsData.map((m) => Math.max(m.ventas, m.compras, m.utilidad)), 1);

  const exportData = [
    { Indicador: "Total Ventas Facturadas", Current: money(currentMonth.ventas), Prev: money(prevMonth.ventas), MoM: `${salesMoM.toFixed(1)}%`, YoY: `${salesYoY.toFixed(1)}%` },
    { Indicador: "Total Compras Realizadas", Current: money(currentMonth.compras), Prev: money(prevMonth.compras), MoM: "—", YoY: "—" },
    { Indicador: "Utilidad Bruta Generada", Current: money(currentMonth.utilidad), Prev: money(prevMonth.utilidad), MoM: `${profitMoM.toFixed(1)}%`, YoY: "—" },
    { Indicador: "Ticket Promedio por Venta", Current: money(currentMonth.ticketPromedio), Prev: money(prevMonth.ticketPromedio), MoM: `${ticketMoM.toFixed(1)}%`, YoY: "—" },
  ];

  return (
    <div>
      <div className="section-toolbar" style={{ margin: "0 0 20px" }}>
        <div className="toolbar-group-left">
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--navy-900)" }}>Panel Comparativo Intermensual (12 Meses)</h3>
            <p style={{ fontSize: 12, color: "var(--slate-500)", margin: "2px 0 0" }}>Tendencia de ventas, compras y utilidades acumuladas</p>
          </div>
        </div>
        <div className="toolbar-group-right">
          <ExportActions title="Resumen-Mensual-MoM-YoY" rows={exportData} />
        </div>
      </div>

      <div className="party-kpi-cards" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", marginBottom: 20 }}>
        <div className="party-kpi-card">
          <span className="kpi-label">Crecimiento MoM Ventas</span>
          <span className="kpi-val" style={{ color: salesMoM >= 0 ? "#10b981" : "#ef4444" }}>{salesMoM >= 0 ? "+" : ""}{salesMoM.toFixed(1)}%</span>
        </div>
        <div className="party-kpi-card">
          <span className="kpi-label">Crecimiento YoY Ventas</span>
          <span className="kpi-val" style={{ color: salesYoY >= 0 ? "#10b981" : "#ef4444" }}>{salesYoY >= 0 ? "+" : ""}{salesYoY.toFixed(1)}%</span>
        </div>
        <div className="party-kpi-card">
          <span className="kpi-label">Variación MoM Utilidad</span>
          <span className="kpi-val" style={{ color: profitMoM >= 0 ? "var(--coral-600)" : "#ef4444" }}>{profitMoM >= 0 ? "+" : ""}{profitMoM.toFixed(1)}%</span>
        </div>
        <div className="party-kpi-card">
          <span className="kpi-label">Ticket Promedio MoM</span>
          <span className="kpi-val" style={{ color: "var(--navy-900)" }}>{ticketMoM >= 0 ? "+" : ""}{ticketMoM.toFixed(1)}%</span>
        </div>
      </div>

      <div className="waterfall-card" style={{ marginBottom: 24 }}>
        <h4 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 800, color: "var(--navy-900)" }}>
          Evolución Mensual de Operaciones (Últimos 12 Meses)
        </h4>
        <div className="waterfall-bars" style={{ height: 220 }}>
          {monthsData.map((m) => (
            <div key={m.yearMonth} className="waterfall-bar-group">
              <div style={{ display: "flex", gap: 3, width: "100%", alignItems: "flex-end", height: "100%" }}>
                <div title={`Ventas: ${money(m.ventas)}`} style={{ flex: 1, height: `${(m.ventas / maxVal) * 100}%`, background: "#1e8e3e", borderRadius: "4px 4px 0 0" }}></div>
                <div title={`Compras: ${money(m.compras)}`} style={{ flex: 1, height: `${(m.compras / maxVal) * 100}%`, background: "var(--cyan-600)", borderRadius: "4px 4px 0 0" }}></div>
                <div title={`Utilidad: ${money(m.utilidad)}`} style={{ flex: 1, height: `${Math.max(4, (m.utilidad / maxVal) * 100)}%`, background: "var(--coral-600)", borderRadius: "4px 4px 0 0" }}></div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--slate-500)" }}>{m.label}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 12, fontSize: 12, fontWeight: 600, color: "var(--navy-900)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: "#10b981" }}></span> Ventas
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--teal-600)" }}></span> Compras
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--coral-600)" }}></span> Utilidad
          </span>
        </div>
      </div>

      <h3 className="operations-table-title" style={{ marginBottom: 12 }}>Comparativa Lado a Lado de Indicadores Llave</h3>
      <div className="responsive-table">
        <table className="compare-table">
          <thead>
            <tr>
              <th>INDICADOR LLAVE (KPI)</th>
              <th>MES ACTUAL ({currentMonth.label})</th>
              <th>MES ANTERIOR ({prevMonth.label})</th>
              <th>DIFERENCIA MoM</th>
              <th>AÑO PASADO ({sameMonthLastYear.label})</th>
              <th>DIFERENCIA YoY</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Total Ventas Facturadas</strong></td>
              <td className="font-semibold" style={{ color: "#1e8e3e" }}>{money(currentMonth.ventas)}</td>
              <td>{money(prevMonth.ventas)}</td>
              <td className="font-semibold" style={{ color: salesMoM >= 0 ? "#10b981" : "#ef4444" }}>{salesMoM >= 0 ? "+" : ""}{salesMoM.toFixed(1)}%</td>
              <td>{money(sameMonthLastYear.ventas)}</td>
              <td className="font-semibold" style={{ color: salesYoY >= 0 ? "#10b981" : "#ef4444" }}>{salesYoY >= 0 ? "+" : ""}{salesYoY.toFixed(1)}%</td>
            </tr>
            <tr>
              <td><strong>Total Compras Realizadas</strong></td>
              <td className="font-semibold" style={{ color: "var(--cyan-600)" }}>{money(currentMonth.compras)}</td>
              <td>{money(prevMonth.compras)}</td>
              <td>—</td>
              <td>{money(sameMonthLastYear.compras)}</td>
              <td>—</td>
            </tr>
            <tr>
              <td><strong>Utilidad Bruta Generada</strong></td>
              <td className="font-semibold" style={{ color: "var(--coral-600)" }}>{money(currentMonth.utilidad)}</td>
              <td>{money(prevMonth.utilidad)}</td>
              <td className="font-semibold" style={{ color: profitMoM >= 0 ? "var(--coral-600)" : "#ef4444" }}>{profitMoM >= 0 ? "+" : ""}{profitMoM.toFixed(1)}%</td>
              <td>{money(sameMonthLastYear.utilidad)}</td>
              <td>—</td>
            </tr>
            <tr>
              <td><strong>Ticket Promedio por Venta</strong></td>
              <td className="font-semibold">{money(currentMonth.ticketPromedio)}</td>
              <td>{money(prevMonth.ticketPromedio)}</td>
              <td className="font-semibold">{ticketMoM >= 0 ? "+" : ""}{ticketMoM.toFixed(1)}%</td>
              <td>{money(sameMonthLastYear.ticketPromedio)}</td>
              <td>—</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Dashboard({
  state,
  onNavigate,
  onRefresh,
}: {
  state: State;
  onNavigate: (section: Section) => void;
  onRefresh: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"ventas" | "auditoria" | "rentabilidad" | "resumen">("ventas");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [opFilter, setOpFilter] = useState<"todas" | "Compra" | "Venta" | "Ajuste">("todas");

  const ventamovs = state.movements.filter((m) => m.kind === "Venta");
  const compramovs = state.movements.filter((m) => m.kind === "Compra");
  const totalVenta = ventamovs.reduce((s, m) => s + m.total, 0);
  const totalCompra = compramovs.reduce((s, m) => s + m.total, 0);
  const utilidadBruta = totalVenta - totalCompra;
  const margen = totalVenta > 0 ? (utilidadBruta / totalVenta) * 100 : 0;
  const stockValorizado = state.products.reduce(
    (s, p) => s + productValue(p, "unidad", "stock") * productValue(p, "unidad", "buy") + productValue(p, "caja", "stock") * productValue(p, "caja", "buy"),
    0
  );

  const filteredMovs = state.movements.filter((m) => {
    const matchSearch =
      !search ||
      m.date.includes(search) ||
      productName(m, state).toLowerCase().includes(search.toLowerCase()) ||
      partyName(m, state).toLowerCase().includes(search.toLowerCase());
    const matchStart = !startDate || m.date >= startDate;
    const matchEnd = !endDate || m.date <= endDate;
    const matchKind = opFilter === "todas" || m.kind === opFilter;
    return matchSearch && matchStart && matchEnd && matchKind;
  });

  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const ymCurrent = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const ymPrev = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;
  const currentMonthSales = state.movements.filter((m) => m.kind === "Venta" && m.date.startsWith(ymCurrent)).reduce((s, m) => s + m.total, 0);
  const prevMonthSales = state.movements.filter((m) => m.kind === "Venta" && m.date.startsWith(ymPrev)).reduce((s, m) => s + m.total, 0);
  const salesTrend = computeTrend(currentMonthSales, prevMonthSales);

  const currentMonthPurchases = state.movements.filter((m) => m.kind === "Compra" && m.date.startsWith(ymCurrent)).reduce((s, m) => s + m.total, 0);
  const prevMonthPurchases = state.movements.filter((m) => m.kind === "Compra" && m.date.startsWith(ymPrev)).reduce((s, m) => s + m.total, 0);
  const purchaseTrend = computeTrend(currentMonthPurchases, prevMonthPurchases);

  const currentMonthProfit = currentMonthSales - currentMonthPurchases;
  const prevMonthProfit = prevMonthSales - prevMonthPurchases;
  const profitTrend = computeTrend(currentMonthProfit, prevMonthProfit);

  const marginTrend = computeTrend(
    currentMonthSales > 0 ? (currentMonthProfit / currentMonthSales) * 100 : 0,
    prevMonthSales > 0 ? (prevMonthProfit / prevMonthSales) * 100 : 0
  );

  const cards: [string, number | string, React.ComponentType<{ size?: number }>, "green" | "blue" | "coral" | "violet" | "cyan", Section, string, string][] = [
    ["TOTAL COMPRADO", totalCompra, ShoppingCart, "green", "compras", "Costo de mercadería", formatTrend(purchaseTrend)],
    ["TOTAL VENDIDO", totalVenta, ShoppingBasket, "blue", "ventas", "Ventas totales", formatTrend(salesTrend)],
    ["UTILIDAD BRUTA", utilidadBruta, TrendingUp, "coral", "resumen", "Ganancia obtenida", formatTrend(profitTrend)],
    ["MARGEN DE UTILIDAD", margen.toFixed(1) + "%", TrendingUp, "violet", "resumen", "Sobre ventas", formatTrend(marginTrend)],
    ["STOCK VALORIZADO", stockValorizado, Boxes, "cyan", "inventario", "Valor inventario actual", `${state.products.length} productos en stock`],
  ];

  const topProducts = state.products
    .map((p) => {
      const salesProds = state.movements.filter((m) => m.kind === "Venta" && m.productId === p.id);
      const profit = salesProds.reduce((s, m) => {
        const cost = unitCostForMovement(m, p);
        return s + (m.total - m.quantity * cost);
      }, 0);
      return { ...p, profit };
    })
    .filter((p) => p.profit > 0)
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 5);
  const maxProfit = topProducts[0]?.profit || 1;

  const monthlyData: { month: string; ventas: number; utilidad: number }[] = [];
  for (let i = 4; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = d.toLocaleString("es-CL", { month: "short" });
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const vm = state.movements.filter((m) => m.kind === "Venta" && m.date.startsWith(ym));
    const cm = state.movements.filter((m) => m.kind === "Compra" && m.date.startsWith(ym));
    const tv = vm.reduce((s, m) => s + m.total, 0);
    const tc = cm.reduce((s, m) => s + m.total, 0);
    monthlyData.push({ month: monthStr.charAt(0).toUpperCase() + monthStr.slice(1), ventas: tv, utilidad: tv - tc });
  }
  const maxMonthly = Math.max(...monthlyData.map((m) => Math.max(m.ventas, m.utilidad)), 1);

  const alerts: { icon: React.ReactNode; title: string; date: string; desc: string; color: string; bg: string }[] = [];
  state.movements
    .filter((m) => m.kind === "Venta")
    .forEach((m) => {
      const cost = unitCostForMovement(m, state.products.find((p) => p.id === m.productId));
      const gm = m.total > 0 ? ((m.total - m.quantity * cost) / m.total) * 100 : 0;
      if (gm < 15 && gm > 0)
        alerts.push({
          icon: <AlertTriangle size={18} />,
          title: "Venta con margen bajo",
          date: m.date,
          desc: `${productName(m, state)} vendido a ${partyName(m, state)} con margen de ${gm.toFixed(0)}%.`,
          color: "var(--coral-600)",
          bg: "var(--coral-100)",
        });
    });
  state.products
    .filter((p) => productValue(p, "unidad", "stock") <= productValue(p, "unidad", "minimum") || productValue(p, "caja", "stock") <= productValue(p, "caja", "minimum"))
    .forEach((p) => {
      alerts.push({
        icon: <AlertTriangle size={18} />,
        title: "Stock bajo",
        date: dateToday(),
        desc: `${p.name} con stock actual bajo el mínimo.`,
        color: "var(--amber-600)",
        bg: "var(--amber-100)",
      });
    });
  const pendingSales = ventamovs.filter((m) => m.total > m.paid);
  if (pendingSales.length > 0)
    alerts.push({
      icon: <WalletCards size={18} />,
      title: "Abonos pendientes",
      date: dateToday(),
      desc: `Hay ${pendingSales.length} ventas con saldo pendiente por cobrar.`,
      color: "var(--blue-600)",
      bg: "var(--blue-100)",
    });

  return (
    <>
      <section className="metric-grid">
        {cards.map(([label, value, CardIcon, tone, target, subtitle, trend]) => {
          const colorMap: Record<string, { bg: string; color: string }> = {
            green: { bg: "#e6f4ea", color: "#1e8e3e" },
            blue: { bg: "#e8f0fe", color: "#1a73e8" },
            coral: { bg: "#fce8e6", color: "#d93025" },
            violet: { bg: "#f3e8fd", color: "#9334e6" },
            cyan: { bg: "#e4f7fb", color: "#12b5cb" },
          };
          const c = colorMap[tone] || colorMap.green;
          return (
            <button type="button" className="metric-card kpi-card" key={label} onClick={() => onNavigate(target)} aria-label={`Abrir módulo ${label}`}>
              <div className="kpi-header">
                <div className="kpi-icon" style={{ background: c.bg, color: c.color }}>
                  <CardIcon size={20} />
                </div>
                <span className="kpi-eyebrow" style={{ color: c.color }}>
                  {label}
                </span>
              </div>
              <p className="kpi-value">{typeof value === "string" ? value : money(value)}</p>
              <p className="kpi-subtitle">{subtitle}</p>
              <div className="kpi-trend" style={{ color: "#1e8e3e", background: "#e6f4ea" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
                <span>{trend}</span>
              </div>
            </button>
          );
        })}
      </section>

      <section className="dashboard-stack">
        <article className="surface recent-surface">
          <div className="surface-tabs">
            <button className={`surface-tab ${activeTab === "ventas" ? "active" : ""}`} onClick={() => setActiveTab("ventas")}>
              Ventas
            </button>
            <button className={`surface-tab ${activeTab === "auditoria" ? "active" : ""}`} onClick={() => setActiveTab("auditoria")}>
              Auditoría
            </button>
            <button className={`surface-tab ${activeTab === "rentabilidad" ? "active" : ""}`} onClick={() => setActiveTab("rentabilidad")}>
              Rentabilidad
            </button>
            <button className={`surface-tab ${activeTab === "resumen" ? "active" : ""}`} onClick={() => setActiveTab("resumen")}>
              Resumen mensual
            </button>
          </div>

          <div className="panel-body">
            {activeTab === "ventas" && <SalesTabContent state={state} onNavigate={onNavigate} />}
            {activeTab === "rentabilidad" && <ProfitabilityTabContent state={state} />}
            {activeTab === "resumen" && <MonthlySummaryTabContent state={state} />}
            {activeTab === "auditoria" && (
              <div>
                <div className="toolbar-row">
                  <SearchBar value={search} onChange={setSearch} placeholder="Buscar por producto, cliente, proveedor o documento..." />
                  <div className="toolbar-actions">
                    <select className="toolbar-select" value={opFilter} onChange={(e) => setOpFilter(e.target.value as "todas" | "Compra" | "Venta" | "Ajuste")}>
                      <option value="todas">Todas las operaciones</option>
                      <option value="Compra">Solo Compras</option>
                      <option value="Venta">Solo Ventas</option>
                      <option value="Ajuste">Solo Ajustes</option>
                    </select>
                    <div className="toolbar-dates">
                      <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                      <span className="toolbar-dates-sep">al</span>
                      <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                    <ExportActions title="Actividad-reciente" rows={buildActivityRows(filteredMovs, state)} />
                    <button className="secondary-button compact" onClick={onRefresh} title="Actualizar datos">
                      <RefreshCw size={16} />
                    </button>
                  </div>
                </div>

                <div className="summary-box">
                  <div className="summary-left">
                    <h3 className="summary-title">Resumen del período seleccionado</h3>
                    <div className="summary-equation">
                      <div className="summary-agg">
                        <small>Total Comprado</small>
                        <strong style={{ color: "var(--cyan-600)" }}>{money(totalCompra)}</strong>
                      </div>
                      <span className="summary-operator">-</span>
                      <div className="summary-agg">
                        <small>Total Vendido</small>
                        <strong style={{ color: "#1e8e3e" }}>{money(totalVenta)}</strong>
                      </div>
                      <span className="summary-operator">=</span>
                      <div className="summary-agg">
                        <small>Utilidad Bruta</small>
                        <strong style={{ color: "var(--coral-600)" }}>{money(utilidadBruta)}</strong>
                      </div>
                      <div className="summary-divider"></div>
                      <div className="summary-agg">
                        <small>Margen de Utilidad</small>
                        <strong style={{ color: "var(--violet-600)" }}>{margen.toFixed(1)}%</strong>
                      </div>
                    </div>
                  </div>
                  <div className="summary-donut-area">
                    <div className="donut-chart">
                      <svg viewBox="0 0 36 36">
                        <circle
                          cx="18"
                          cy="18"
                          r="15.915"
                          fill="transparent"
                          stroke="#12b5cb"
                          strokeWidth="4"
                          strokeDasharray={`${totalVenta + totalCompra > 0 ? (totalCompra / (totalVenta + totalCompra)) * 100 : 44} ${totalVenta + totalCompra > 0 ? (totalVenta / (totalVenta + totalCompra)) * 100 : 56}`}
                          strokeDashoffset="0"
                        />
                        <circle
                          cx="18"
                          cy="18"
                          r="15.915"
                          fill="transparent"
                          stroke="#1e8e3e"
                          strokeWidth="4"
                          strokeDasharray={`${totalVenta + totalCompra > 0 ? (totalVenta / (totalVenta + totalCompra)) * 100 : 56} ${totalVenta + totalCompra > 0 ? (totalCompra / (totalVenta + totalCompra)) * 100 : 44}`}
                          strokeDashoffset={`-${totalVenta + totalCompra > 0 ? (totalCompra / (totalVenta + totalCompra)) * 100 : 44}`}
                        />
                      </svg>
                    </div>
                    <div className="donut-legend">
                      <div className="legend-item">
                        <span className="legend-dot" style={{ background: "#12b5cb" }}></span>Compras
                        <span className="legend-val">{totalVenta + totalCompra > 0 ? ((totalCompra / (totalVenta + totalCompra)) * 100).toFixed(1) : "0"}%</span>
                      </div>
                      <div className="legend-item">
                        <span className="legend-dot" style={{ background: "#1e8e3e" }}></span>Ventas
                        <span className="legend-val">{totalVenta + totalCompra > 0 ? ((totalVenta / (totalVenta + totalCompra)) * 100).toFixed(1) : "0"}%</span>
                      </div>
                      <div className="legend-item">
                        <span className="legend-dot" style={{ background: "#d93025" }}></span>Utilidad
                        <span className="legend-val">{margen.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="operations-table-wrap">
                  <h3 className="operations-table-title">Historial de operaciones</h3>
                  <div className="responsive-table">
                    <table>
                      <thead>
                        <tr>
                          <th>FECHA</th>
                          <th>TIPO</th>
                          <th>DOCUMENTO</th>
                          <th>PRODUCTO</th>
                          <th>PROVEEDOR / CLIENTE</th>
                          <th className="text-right">CANT.</th>
                          <th className="text-right">COSTO UNIT.</th>
                          <th className="text-right">VENTA UNIT.</th>
                          <th className="text-right">TOTAL</th>
                          <th className="text-right">UTILIDAD</th>
                          <th className="text-right">MARGEN</th>
                          <th className="text-center">ACCIONES</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMovs.map((m, i) => {
                          const p = state.products.find((x) => x.id === m.productId);
                          const cost = unitCostForMovement(m, p);
                          const unitCost = m.quantity > 0 ? cost : 0;
                          const saleUnit = m.quantity > 0 ? m.total / m.quantity : 0;
                          const util = m.kind === "Venta" ? m.total - m.quantity * cost : 0;
                          const gm = m.total > 0 ? (util / m.total) * 100 : 0;
                          const docNum = String(i + 1).padStart(4, "0");
                          const docPrefix = m.kind === "Venta" ? "FV" : m.kind === "Compra" ? "FC" : "AJ";
                          return (
                            <tr key={m.id}>
                              <td>{m.date}</td>
                              <td>
                                <span className={`type-badge ${m.kind.toLowerCase()}`}>{m.kind === "Ajuste" ? "Ajuste" : m.kind}</span>
                              </td>
                              <td>{docPrefix}-{docNum}</td>
                              <td>{productName(m, state)}</td>
                              <td>{partyName(m, state)}</td>
                              <td className="text-right">{m.quantity}</td>
                              <td className="text-right">{money(unitCost)}</td>
                              <td className="text-right">{m.kind === "Venta" ? money(saleUnit) : "—"}</td>
                              <td className="text-right font-semibold">{money(m.total)}</td>
                              <td className="text-right font-semibold" style={{ color: m.kind === "Venta" ? "#1e8e3e" : "var(--slate-400)" }}>
                                {m.kind === "Venta" ? money(util) : "—"}
                              </td>
                              <td className="text-right font-semibold" style={{ color: m.kind === "Venta" ? "#1e8e3e" : "var(--slate-400)" }}>
                                {m.kind === "Venta" ? `${gm.toFixed(0)}%` : "—"}
                              </td>
                              <td className="text-center">
                                <button className="icon-button-sm" onClick={() => onNavigate(m.kind === "Venta" ? "ventas" : "compras")} title="Ver detalle">
                                  <Eye size={16} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {!filteredMovs.length && (
                          <tr>
                            <td colSpan={12} className="empty-state">
                              Aún no hay movimientos.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </article>

        <div className="bottom-widgets">
          <div className="widget-card">
            <div className="surface-title">
              <div>
                <p className="eyebrow">RENTABILIDAD</p>
                <h2>Productos más rentables</h2>
              </div>
            </div>
            <div className="widget-body">
              {topProducts.map((p, i) => {
                const pct = maxProfit > 0 ? (p.profit / maxProfit) * 100 : 0;
                const rankPct = Math.round((p.profit / (state.movements.filter((m) => m.kind === "Venta").reduce((s, m) => s + m.total, 0) || 1)) * 100);
                return (
                  <div className="progress-row" key={p.id}>
                    <div className="progress-label">
                      <span className={`rank-badge rank-${i + 1}`}>{i + 1}</span>
                      <span style={{ fontWeight: 600, color: "var(--navy-900)" }}>{p.name}</span>
                    </div>
                    <div className="progress-bar-bg">
                      <div className="progress-bar-fill" style={{ width: `${pct}%` }}></div>
                    </div>
                    <span className="progress-value">{rankPct}%</span>
                  </div>
                );
              })}
              {!topProducts.length && <p className="empty-mini">Sin datos de rentabilidad</p>}
              <button className="widget-link" onClick={() => onNavigate("ventas")}>
                Ver todos los productos →
              </button>
            </div>
          </div>

          <div className="widget-card">
            <div className="surface-title">
              <div>
                <p className="eyebrow">TENDENCIA</p>
                <h2>Evolución mensual ($)</h2>
              </div>
              <div className="widget-legend">
                <span className="legend-chip">
                  <span className="legend-dot" style={{ background: "#1e8e3e" }}></span>Ventas
                </span>
                <span className="legend-chip">
                  <span className="legend-dot" style={{ background: "#f08533" }}></span>Utilidad
                </span>
              </div>
            </div>
            <div className="widget-body">
              <div className="bar-chart">
                {monthlyData.map((d, i) => {
                  const hV = maxMonthly > 0 ? (d.ventas / maxMonthly) * 100 : 0;
                  const hU = maxMonthly > 0 ? (d.utilidad / maxMonthly) * 100 : 0;
                  return (
                    <div className="bar-col" key={i}>
                      <div className="bar-pair">
                        <div className="bar-rect green" style={{ height: `${Math.max(hV, 2)}%` }} title={`Ventas: ${money(d.ventas)}`}></div>
                        <div className="bar-rect orange" style={{ height: `${Math.max(hU, 2)}%` }} title={`Utilidad: ${money(d.utilidad)}`}></div>
                      </div>
                      <span className="bar-label">{d.month}</span>
                    </div>
                  );
                })}
              </div>
              <button className="widget-link" onClick={() => onNavigate("ventas")}>
                Ver análisis completo →
              </button>
            </div>
          </div>

          <div className="widget-card">
            <div className="surface-title">
              <div>
                <p className="eyebrow">ALERTAS</p>
                <h2>Últimas alertas</h2>
              </div>
            </div>
            <div className="widget-body">
              {alerts.slice(0, 4).map((a, i) => (
                <div className="alert-widget-item" key={i}>
                  <div className="alert-widget-icon" style={{ background: a.bg, color: a.color }}>
                    {a.icon}
                  </div>
                  <div className="alert-widget-text">
                    <div className="alert-widget-head">
                      <strong>{a.title}</strong>
                      <span>{a.date}</span>
                    </div>
                    <small>{a.desc}</small>
                  </div>
                </div>
              ))}
              {!alerts.length && <p className="empty-mini">Sin alertas activas</p>}
              <button className="widget-link" onClick={() => onNavigate("cobrar")}>
                Ver todas las alertas →
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function Movements({
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

function MovementTable({
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
              <td data-label="Acciones" style={{ whiteSpace: "nowrap" }}>
                <button className="icon-button danger-icon-button" onClick={() => onDeleteMovement(m.id)} title="Eliminar">
                  <Trash2 size={16} />
                </button>
                <button className="text-button edit-link" onClick={() => onEditMovement(m)} title="Editar">
                  editar
                </button>
              </td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={9} className="empty-state">
                Aún no hay registros.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Inventory({
  state,
  selectedProductId,
  onSelectProduct,
  onEditProduct,
  onDeleteMovement,
  globalSearch,
  onAddProduct,
}: {
  state: State;
  selectedProductId: string | null;
  onSelectProduct: (id: string | null) => void;
  onEditProduct: (p: Product) => void;
  onDeleteMovement: (id: string) => void;
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
                    <button className="icon-button danger-icon-button" onClick={() => onDeleteMovement(m.id)} title="Eliminar">
                      <Trash2 size={16} />
                    </button>
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

function DatePresetsToolbar({
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

function PartyProfileModal({
  party,
  kind,
  state,
  onClose,
  onEdit,
  onDelete,
  onDeleteMovement,
}: {
  party: Party;
  kind: "Cliente" | "Proveedor";
  state: State;
  onClose: () => void;
  onEdit: (party: Party) => void;
  onDelete: (partyId: string) => void;
  onDeleteMovement: (id: string) => void;
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
                <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: "var(--navy-900)" }}>{party.name}</h2>
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
          <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "var(--navy-900)" }}>Historial de Transacciones ({partyMovements.length})</h3>
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
                      <button className="icon-button danger-icon-button" onClick={() => onDeleteMovement(m.id)} title="Eliminar">
                        <Trash2 size={15} />
                      </button>
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

function Parties({
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

function Accounts({
  kind,
  state,
  onPay,
  onDeleteMovement,
}: {
  kind: "Compra" | "Venta";
  state: State;
  onPay: () => void;
  onDeleteMovement: (id: string) => void;
}) {
  const rows = state.movements.filter((m) => m.kind === kind && m.total > m.paid);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const filteredRows = rows.filter((m) => {
    const pName = productName(m, state);
    const partName = partyName(m, state);
    const matchSearch = pName.toLowerCase().includes(search.toLowerCase()) || partName.toLowerCase().includes(search.toLowerCase());
    const matchStart = startDate ? m.date >= startDate : true;
    const matchEnd = endDate ? m.date <= endDate : true;
    return matchSearch && matchStart && matchEnd;
  });

  return (
    <section className="surface data-surface">
      <div className="surface-title">
        <div>
          <p className="eyebrow">PAGADOS Y PENDIENTES</p>
          <h2>{kind === "Venta" ? "Clientes pendientes de cobrar" : "Proveedores pendientes de pagar"}</h2>
        </div>
      </div>

      <div className="section-toolbar">
        <div className="toolbar-group-left">
          <SearchBar value={search} onChange={setSearch} placeholder="Filtrar pendientes por producto o persona..." />
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
          <ExportActions title={kind === "Venta" ? "Cuentas-por-cobrar" : "Cuentas-por-pagar"} rows={buildAccountRows(filteredRows, state, kind)} />
          <button className="primary-button compact" onClick={onPay}>
            Registrar abono
          </button>
        </div>
      </div>

      <AccountTable rows={filteredRows} state={state} kind={kind} onDeleteMovement={onDeleteMovement} />
    </section>
  );
}

function AccountTable({
  rows,
  state,
  kind,
  onDeleteMovement,
}: {
  rows: Movement[];
  state: State;
  kind: "Compra" | "Venta";
  onDeleteMovement: (id: string) => void;
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
                <button className="icon-button danger-icon-button" onClick={() => onDeleteMovement(m.id)} title="Eliminar">
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={10} className="empty-state">
                Aún no hay registros pendientes.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Modal({
  kind,
  state,
  user,
  selectedItem,
  onClose,
  onSave,
}: {
  kind: Exclude<ModalKind, "AddProducto" | "ImportCsv">;
  state: State;
  user: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selectedItem: any;
  onClose: () => void;
  onSave: (s: State, action: string, details?: string) => void;
}) {
  const isMovementEdit = kind === "EditMovimiento";
  const editKind = isMovementEdit ? (selectedItem.kind as "Compra" | "Venta") : (kind as "Compra" | "Venta");
  const [productId, setProductId] = useState(isMovementEdit ? selectedItem.productId : state.products[0]?.id || "");
  const product = state.products.find((p) => p.id === productId);
  const [presentation, setPresentation] = useState<Presentation>(isMovementEdit ? (selectedItem.unit === "caja" ? "caja" : "unidad") : "unidad");
  const [qty, setQty] = useState(isMovementEdit ? Math.abs(selectedItem.quantity) : 1);
  const [price, setPrice] = useState(() => (isMovementEdit ? selectedItem.price : product ? productValue(product, "unidad", kind === "Compra" ? "buy" : "sell") : 0));
  const [method, setMethod] = useState<Movement["paymentMethod"]>(isMovementEdit ? selectedItem.paymentMethod : "Transferencia");

  const [adjustType, setAdjustType] = useState<"Ingreso" | "Merma">("Merma");
  const [reason, setReason] = useState("Pérdida por descomposición");

  function changeProduct(nextId: string) {
    setProductId(nextId);
    const next = state.products.find((p) => p.id === nextId);
    setPrice(next ? productValue(next, presentation, kind === "Compra" ? "buy" : "sell") : 0);
  }
  function changePresentation(next: Presentation) {
    setPresentation(next);
    setPrice(product ? productValue(product, next, kind === "Compra" ? "buy" : "sell") : 0);
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    if (kind === "Cliente" || kind === "Proveedor") {
      const row = { id: crypto.randomUUID(), name: String(fd.get("name")), rut: String(fd.get("rut")), phone: String(fd.get("phone")) };
      onSave(
        { ...state, [kind === "Cliente" ? "clients" : "providers"]: [...(kind === "Cliente" ? state.clients : state.providers), row] },
        `Agregó ${kind}`,
        `Nombre: ${row.name} - RUT: ${row.rut}`
      );
      return;
    }

    if (kind === "EditCliente" || kind === "EditProveedor") {
      const key = kind === "EditCliente" ? "clients" : "providers";
      const nextRows = state[key].map((x) =>
        x.id === selectedItem.id ? { ...x, name: String(fd.get("name")), rut: String(fd.get("rut")), phone: String(fd.get("phone")) } : x
      );
      onSave(
        { ...state, [key]: nextRows },
        `Editó ${kind === "EditCliente" ? "Cliente" : "Proveedor"}`,
        `Nombre: ${selectedItem.name} -> ${String(fd.get("name"))}`
      );
      return;
    }

    if (kind === "EditMovimiento") {
      const partyId = String(fd.get("party"));
      const total = qty * price;
      const paid = method === "Crédito" ? Number(fd.get("paid") || 0) : total;
      const oldM = selectedItem as Movement;
      const nextMovements = state.movements.map((m) =>
        m.id === oldM.id ? { ...m, date: String(fd.get("date")), partyId, productId, quantity: qty, unit: presentation, price, total, paymentMethod: method, paid } : m
      );
      const nextProducts = state.products.map((p) => {
        if (p.id !== oldM.productId && p.id !== productId) return p;
        let result = { ...p };
        if (p.id === oldM.productId && oldM.productId !== productId) {
          const oldDelta = oldM.kind === "Compra" ? -oldM.quantity : oldM.quantity;
          result =
            presentation === "unidad"
              ? { ...result, stockUnit: Math.max(0, productValue(result, "unidad", "stock") + oldDelta) }
              : { ...result, stockBox: Math.max(0, productValue(result, "caja", "stock") + oldDelta) };
        }
        if (p.id === productId) {
          const newDelta = editKind === "Compra" ? qty : -qty;
          result =
            presentation === "unidad"
              ? { ...result, stockUnit: Math.max(0, productValue(result, "unidad", "stock") + newDelta) }
              : { ...result, stockBox: Math.max(0, productValue(result, "caja", "stock") + newDelta) };
        }
        return result;
      });
      onSave(
        { ...state, movements: nextMovements, products: nextProducts },
        `Editó ${editKind}`,
        `${qty} ${presentation}(s) de ${state.products.find((p) => p.id === productId)?.name || ""}`
      );
      return;
    }

    if (kind === "EditProducto") {
      const nextProducts = state.products.map((x) =>
        x.id === selectedItem.id
          ? {
              ...x,
              name: String(fd.get("name")),
              unit: String(fd.get("unit")),
              category: String(fd.get("category") || "") || undefined,
              minimumUnit: Number(fd.get("minimumUnit")),
              minimumBox: Number(fd.get("minimumBox")),
              buyUnit: Number(fd.get("buyUnit")),
              buyBox: Number(fd.get("buyBox")),
              sellUnit: Number(fd.get("sellUnit")),
              sellBox: Number(fd.get("sellBox")),
              stockUnit: Number(fd.get("stockUnit")),
              stockBox: Number(fd.get("stockBox")),
            }
          : x
      );
      onSave({ ...state, products: nextProducts }, "Editó Producto", `Nombre: ${selectedItem.name} -> ${String(fd.get("name"))}`);
      return;
    }

    if (kind === "Pago") {
      const id = String(fd.get("movement"));
      const amount = Number(fd.get("amount"));
      const mov = state.movements.find((m) => m.id === id);
      onSave(
        {
          ...state,
          movements: state.movements.map((m) =>
            m.id === id ? { ...m, paid: Math.min(m.total, m.paid + amount), user } : m
          ),
        },
        "Registró Pago/Abono",
        `Monto: ${money(amount)} para cuenta de ${mov ? partyName(mov, state) : ""}`
      );
      return;
    }

    if (kind === "Ajuste") {
      const signedQty = adjustType === "Merma" ? -qty : qty;
      const m: Movement = {
        id: crypto.randomUUID(),
        kind: "Ajuste",
        date: String(fd.get("date")),
        partyId: "",
        productId,
        quantity: signedQty,
        unit: presentation,
        price: 0,
        total: 0,
        paymentMethod: "Efectivo",
        paid: 0,
        user,
        reason: `${adjustType === "Merma" ? "Merma" : "Ingreso"} - ${reason}`,
      };

      const nextProducts = state.products.map((p) => {
        if (p.id !== productId) return p;
        return presentation === "unidad"
          ? { ...p, stockUnit: Math.max(0, productValue(p, "unidad", "stock") + signedQty) }
          : { ...p, stockBox: Math.max(0, productValue(p, "caja", "stock") + signedQty) };
      });
      onSave(
        { ...state, products: nextProducts, movements: [m, ...state.movements] },
        "Ajustó Stock",
        `${m.reason} en ${productName(m, state)}`
      );
      return;
    }

    const partyId = String(fd.get("party"));
    const total = qty * price;
    const paid = method === "Crédito" ? Number(fd.get("paid") || 0) : total;
    const currentCost = product ? productValue(product, presentation, "buy") : 0;
    const m: Movement = {
      id: crypto.randomUUID(),
      kind,
      date: String(fd.get("date")),
      partyId,
      productId,
      quantity: qty,
      unit: presentation,
      price,
      total,
      paymentMethod: method,
      paid,
      user,
      cost: kind === "Venta" ? currentCost : price,
    };

    onSave(
      {
        ...state,
        products: state.products.map((p) => {
          if (p.id !== productId) return p;
          const delta = kind === "Compra" ? qty : -qty;
          return presentation === "unidad"
            ? { ...p, stockUnit: Math.max(0, productValue(p, "unidad", "stock") + delta), buyUnit: kind === "Compra" ? price : productValue(p, "unidad", "buy"), sellUnit: kind === "Venta" ? price : productValue(p, "unidad", "sell") }
            : { ...p, stockBox: Math.max(0, productValue(p, "caja", "stock") + delta), buyBox: kind === "Compra" ? price : productValue(p, "caja", "buy"), sellBox: kind === "Venta" ? price : productValue(p, "caja", "sell") };
        }),
        movements: [m, ...state.movements],
      },
      `Registró ${kind}`,
      `${m.quantity} ${m.unit}(s) de ${productName(m, state)} a ${partyName(m, state)}`
    );
  }

  const pending = state.movements.filter((m) => m.total > m.paid);
  const isEdit = kind.startsWith("Edit");

  return (
    <div className="modal-layer" onMouseDown={onClose}>
      <div className="modal-card" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-heading">
          <div>
            <p className="eyebrow">{isEdit ? "MODIFICAR REGISTRO" : "NUEVO REGISTRO"}</p>
            <h2>
              {kind === "Pago"
                ? "Registrar pago o abono"
                : kind === "Ajuste"
                ? "Registrar Ajuste / Merma"
                : kind === "EditProducto"
                ? "Editar Producto"
                : kind === "EditCliente"
                ? "Editar Cliente"
                : kind === "EditProveedor"
                ? "Editar Proveedor"
                : kind === "EditMovimiento"
                ? "Editar " + editKind
                : `Registrar ${kind.toLowerCase()}`}
            </h2>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X />
          </button>
        </div>
        <form onSubmit={submit}>
          {(kind === "Cliente" || kind === "Proveedor" || kind === "EditCliente" || kind === "EditProveedor") ? (
            <>
              <label>
                Nombre
                <input name="name" defaultValue={selectedItem?.name || ""} required />
              </label>
              <div className="form-grid">
                <label>
                  RUT
                  <input name="rut" defaultValue={selectedItem?.rut || ""} />
                </label>
                <label>
                  Teléfono
                  <input name="phone" defaultValue={selectedItem?.phone || ""} />
                </label>
              </div>
            </>
          ) : kind === "EditProducto" ? (
            <>
              <label>
                Nombre del producto
                <input name="name" defaultValue={selectedItem?.name || ""} required />
              </label>
              <div className="form-grid">
                <label>
                  Unidad de medida
                  <select name="unit" defaultValue={selectedItem?.unit || "kg"}>
                    <option value="kg">kilogramo (kg)</option>
                    <option value="unidad">unidad</option>
                  </select>
                </label>
                <label>
                  Categoría
                  <input name="category" defaultValue={selectedItem?.category || ""} placeholder="Opcional" />
                </label>
              </div>
              <div className="form-grid">
                <label>
                  Stock actual (Unidades)
                  <input type="number" name="stockUnit" defaultValue={productValue(selectedItem, "unidad", "stock")} required />
                </label>
                <label>
                  Stock actual (Cajas)
                  <input type="number" name="stockBox" defaultValue={productValue(selectedItem, "caja", "stock")} required />
                </label>
              </div>
              <div className="form-grid">
                <label>
                  Stock Mínimo (Unidades)
                  <input type="number" name="minimumUnit" defaultValue={productValue(selectedItem, "unidad", "minimum")} required />
                </label>
                <label>
                  Stock Mínimo (Cajas)
                  <input type="number" name="minimumBox" defaultValue={productValue(selectedItem, "caja", "minimum")} required />
                </label>
              </div>
              <div className="form-grid">
                <label>
                  Precio Compra (Unidad)
                  <input type="number" name="buyUnit" defaultValue={productValue(selectedItem, "unidad", "buy")} required />
                </label>
                <label>
                  Precio Compra (Caja)
                  <input type="number" name="buyBox" defaultValue={productValue(selectedItem, "caja", "buy")} required />
                </label>
              </div>
              <div className="form-grid">
                <label>
                  Precio Venta (Unidad)
                  <input type="number" name="sellUnit" defaultValue={productValue(selectedItem, "unidad", "sell")} required />
                </label>
                <label>
                  Precio Venta (Caja)
                  <input type="number" name="sellBox" defaultValue={productValue(selectedItem, "caja", "sell")} required />
                </label>
              </div>
            </>
          ) : kind === "Pago" ? (
            <>
              <label>
                Cuenta pendiente
                <select name="movement">
                  {pending.map((m) => (
                    <option key={m.id} value={m.id}>
                      {partyName(m, state)} · {money(m.total - m.paid)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Monto del abono
                <input name="amount" type="number" min="1" required />
              </label>
            </>
          ) : kind === "Ajuste" ? (
            <>
              <div className="form-grid">
                <label>
                  Fecha
                  <input name="date" type="date" defaultValue={dateToday()} required />
                </label>
                <label>
                  Tipo de ajuste
                  <select value={adjustType} onChange={(e) => setAdjustType(e.target.value as "Ingreso" | "Merma")}>
                    <option value="Merma">Merma / Pérdida (-)</option>
                    <option value="Ingreso">Ingreso Manual (+)</option>
                  </select>
                </label>
              </div>
              <div className="form-grid">
                <label>
                  Producto
                  <select value={productId} onChange={(e) => changeProduct(e.target.value)}>
                    {state.products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Presentación
                  <select value={presentation} onChange={(e) => changePresentation(e.target.value as Presentation)}>
                    <option value="unidad">Unidad</option>
                    <option value="caja">Caja</option>
                  </select>
                </label>
              </div>
              <div className="form-grid">
                <label>
                  Cantidad
                  <input type="number" min="0.01" step="0.01" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
                </label>
                <label>
                  Motivo
                  <select value={reason} onChange={(e) => setReason(e.target.value)}>
                    {adjustType === "Merma" ? (
                      <>
                        <option value="Pérdida por descomposición">Pérdida por descomposición</option>
                        <option value="Consumo interno">Consumo interno</option>
                        <option value="Ajuste de inventario">Diferencia / Ajuste negativo</option>
                      </>
                    ) : (
                      <>
                        <option value="Ajuste de inventario">Diferencia / Ajuste positivo</option>
                        <option value="Inventario inicial">Carga de inventario inicial</option>
                        <option value="Devolución de cliente">Devolución de cliente</option>
                      </>
                    )}
                  </select>
                </label>
              </div>
            </>
          ) : (
            <>
              <div className="form-grid">
                <label>
                  Fecha
                  <input name="date" type="date" defaultValue={isMovementEdit ? selectedItem.date : dateToday()} required />
                </label>
                <label>
                  {editKind === "Venta" ? "Cliente" : "Proveedor"}
                  <select name="party" required defaultValue={isMovementEdit ? selectedItem.partyId : undefined}>
                    {(editKind === "Venta" ? state.clients : state.providers).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="form-grid">
                <label>
                  Producto
                  <select value={productId} onChange={(e) => changeProduct(e.target.value)}>
                    {state.products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Presentación
                  <select value={presentation} onChange={(e) => changePresentation(e.target.value as Presentation)}>
                    <option value="unidad">Unidad</option>
                    <option value="caja">Caja</option>
                  </select>
                </label>
              </div>
              <div className="form-grid">
                <label>
                  Cantidad
                  <input type="number" min="0.01" step="0.01" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
                </label>
                <label>
                  Precio por {presentation}
                  <input type="number" min="0" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
                </label>
              </div>
              <label>
                Forma de pago
                <select value={method} onChange={(e) => setMethod(e.target.value as Movement["paymentMethod"])}>
                  <option>Transferencia</option>
                  <option>Efectivo</option>
                  <option>Crédito</option>
                </select>
              </label>
              {method === "Crédito" && (
                <label>
                  Abono inicial
                  <input name="paid" type="number" min="0" defaultValue={isMovementEdit ? selectedItem.paid : "0"} />
                </label>
              )}
              <div className="sale-total">
                <span>Total</span>
                <strong>{money(qty * price)}</strong>
              </div>
            </>
          )}
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancelar
            </button>
            <button className="primary-button" type="submit">
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AuditLogs({
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

export default function Page() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
