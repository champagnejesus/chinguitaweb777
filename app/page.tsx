"use client";

import { AlertTriangle, ArrowRight, Boxes, Building2, ChevronDown, CircleDollarSign, Edit, FileSpreadsheet, Fish, Home, LogOut, Menu, Moon, Package, Plus, Printer, Search, ShoppingBasket, ShoppingCart, Sun, Trash2, TrendingUp, UsersRound, WalletCards, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

type Section = "resumen"|"compras"|"ventas"|"inventario"|"clientes"|"proveedores"|"cobrar"|"pagar";
type Presentation="unidad"|"caja";
type Product={id:string;name:string;stock:number;unit:string;buy:number;sell:number;minimum:number;stockUnit?:number;stockBox?:number;buyUnit?:number;buyBox?:number;sellUnit?:number;sellBox?:number;minimumUnit?:number;minimumBox?:number};
type Party={id:string;name:string;rut:string;phone:string};
type Movement={id:string;kind:"Compra"|"Venta"|"Ajuste";date:string;partyId:string;productId:string;quantity:number;unit:string;price:number;total:number;paymentMethod:"Transferencia"|"Efectivo"|"Crédito";paid:number;user:string;cost?:number;reason?:string};
type State={products:Product[];clients:Party[];providers:Party[];movements:Movement[]};

const emptyState:State={
  products:["Salmón","Congrio","Mariscos","Reineta"].map((name,i)=>({id:`p${i}`,name,stock:0,unit:"kg",buy:0,sell:0,minimum:5})),
  clients:[],providers:[],movements:[]
};
const nav=[
  ["resumen","Resumen",Home],["compras","Compras",ShoppingBasket],["ventas","Ventas",ShoppingCart],["inventario","Inventario",Boxes],
  ["clientes","Clientes",UsersRound],["proveedores","Proveedores",Building2],["cobrar","Por cobrar",WalletCards],["pagar","Por pagar",CircleDollarSign]
] as const;
const money=(v:number)=>new Intl.NumberFormat("es-CL",{style:"currency",currency:"CLP",maximumFractionDigits:0}).format(v||0);
const dateToday=()=>new Date().toISOString().slice(0,10);
const presentationLabel=(p:Presentation)=>p==="unidad"?"Unidad":"Caja";
function productValue(product:Product,presentation:Presentation,field:"stock"|"buy"|"sell"|"minimum"){
  const key=field==="stock"?(presentation==="unidad"?"stockUnit":"stockBox"):field==="buy"?(presentation==="unidad"?"buyUnit":"buyBox"):field==="sell"?(presentation==="unidad"?"sellUnit":"sellBox"):(presentation==="unidad"?"minimumUnit":"minimumBox");
  const stored=product[key as keyof Product];
  if(typeof stored==="number")return stored;
  if(presentation==="unidad"&&field==="stock"&&(product.unit==="unidad"||product.unit==="kg"))return product.stock||0;
  if(presentation==="unidad"&&field==="buy")return product.buy||0;
  if(presentation==="unidad"&&field==="sell")return product.sell||0;
  if(presentation==="unidad"&&field==="minimum")return product.minimum||0;
  return 0;
}
function unitCostForMovement(m:Movement,product?:Product){
  if(typeof m.cost==="number")return m.cost;
  if(!product)return 0;
  return m.unit==="caja"?productValue(product,"caja","buy"):productValue(product,"unidad","buy");
}
type ExportRow=Record<string,string|number>;
function exportExcel(title:string,rows:ExportRow[]){
  if(!rows.length)return alert("No hay información para exportar.");
  const headers=Object.keys(rows[0]);
  const csv=[headers,...rows.map(row=>headers.map(h=>row[h]))].map(line=>line.map(value=>`"${String(value??"").replaceAll('"','""')}"`).join(";")).join("\n");
  const blob=new Blob(["\ufeff",csv],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`${title}-${dateToday()}.csv`;a.click();URL.revokeObjectURL(url);
}
function exportPdf(title:string,rows:ExportRow[]){
  if(!rows.length)return alert("No hay información para exportar.");
  const headers=Object.keys(rows[0]);const body=rows.map(row=>`<tr>${headers.map(h=>`<td>${String(row[h]??"")}</td>`).join("")}</tr>`).join("");
  const popup=window.open("","_blank","width=1100,height=800");if(!popup)return alert("Permite las ventanas emergentes para generar el PDF.");
  popup.document.write(`<!doctype html><html><head><title>${title}</title><style>body{font:12px Arial;padding:28px;color:#071c2a}h1{font-size:22px}p{color:#526b79}table{width:100%;border-collapse:collapse}th,td{border:1px solid #dcebed;padding:8px;text-align:left}th{background:#edf5f6}@media print{button{display:none}}</style></head><body><h1>CHUNGUITA Jr · ${title}</h1><p>Informe generado el ${new Date().toLocaleString("es-CL")}</p><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table><script>window.onload=()=>window.print()<\/script></body></html>`);popup.document.close();
}

export default function App(){
  const [token,setToken]=useState(""); const [user,setUser]=useState(""); const [state,setState]=useState<State>(emptyState);
  const [active,setActive]=useState<Section>("resumen"); const [menu,setMenu]=useState(false); 
  const [modal,setModal]=useState<"Compra"|"Venta"|"Cliente"|"Proveedor"|"Pago"|"Ajuste"|"EditProducto"|"EditCliente"|"EditProveedor"|null>(null);
  const [selectedItem,setSelectedItem]=useState<any>(null);
  const [inventoryProductId,setInventoryProductId]=useState<string|null>(null);
  const [loading,setLoading]=useState(true); const [toast,setToast]=useState("");
  
  // Dark Mode support
  const [darkMode, setDarkMode] = useState(false);
  useEffect(() => {
    const isDark = localStorage.getItem("cj-dark") === "true";
    setDarkMode(isDark);
  }, []);
  const toggleDarkMode = () => {
    const next = !darkMode;
    localStorage.setItem("cj-dark", String(next));
    setDarkMode(next);
  };
  
  useEffect(()=>{void Promise.resolve().then(()=>{const t=localStorage.getItem("cj-token")||"";const u=localStorage.getItem("cj-user")||"";if(!t){setLoading(false);return}setToken(t);setUser(u);void load(t)})},[]);
  
  async function load(t=token){const r=await fetch("/api/data",{headers:{authorization:`Bearer ${t}`}});if(!r.ok){localStorage.clear();setToken("");setLoading(false);return}const d=await r.json();if(d.state)setState(d.state);setLoading(false)}
  async function persist(next:State){setState(next);const r=await fetch("/api/data",{method:"PUT",headers:{"content-type":"application/json",authorization:`Bearer ${token}`},body:JSON.stringify(next)});setToast(r.ok?"Información guardada":"No se pudo guardar");setTimeout(()=>setToast(""),2200)}
  async function login(e:FormEvent<HTMLFormElement>){e.preventDefault();const fd=new FormData(e.currentTarget);const r=await fetch("/api/auth",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:fd.get("name"),password:fd.get("password")})});const d=await r.json();if(!r.ok){setToast(d.error);return}localStorage.setItem("cj-token",d.token);localStorage.setItem("cj-user",d.user);setToken(d.token);setUser(d.user);setLoading(true);await load(d.token)}
  async function logout(){await fetch("/api/auth",{method:"DELETE",headers:{authorization:`Bearer ${token}`}});localStorage.clear();setToken("");setUser("")}

  async function deleteMovement(id: string) {
    if (!confirm("¿Estás seguro de que deseas eliminar este movimiento? Esto revertirá los cambios de stock correspondientes.")) return;
    const m = state.movements.find(x => x.id === id);
    if (!m) return;
    const nextProducts = state.products.map(p => {
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
    const nextMovements = state.movements.filter(x => x.id !== id);
    await persist({ ...state, products: nextProducts, movements: nextMovements });
  }

  async function deleteParty(id: string, kind: "Cliente" | "Proveedor") {
    const key = kind === "Cliente" ? "clients" : "providers";
    const partyName = state[key].find(x => x.id === id)?.name || "este registro";
    const hasMovements = state.movements.some(m => m.partyId === id);
    if (hasMovements) {
      alert(`No se puede eliminar a "${partyName}" porque tiene movimientos comerciales asociados.`);
      return;
    }
    if (!confirm(`¿Estás seguro de que deseas eliminar a "${partyName}"?`)) return;
    const nextParties = state[key].filter(x => x.id !== id);
    await persist({ ...state, [key]: nextParties });
  }

  if(loading)return <div className="splash"><Fish size={42}/><strong>CHUNGUITA Jr</strong><span>Cargando gestión comercial…</span></div>;
  if(!token)return <Login onLogin={login} error={toast}/>;
  const sales=state.movements.filter(m=>m.kind==="Venta"),purchases=state.movements.filter(m=>m.kind==="Compra");
  const receivable=sales.reduce((s,m)=>s+Math.max(0,m.total-m.paid),0),payable=purchases.reduce((s,m)=>s+Math.max(0,m.total-m.paid),0);
  const totals={sales:sales.reduce((s,m)=>s+m.total,0),purchases:purchases.reduce((s,m)=>s+m.total,0),receivable,payable};
  const titles:Record<Section,string>={resumen:"Resumen del negocio",compras:"Compras",ventas:"Ventas",inventario:"Inventario",clientes:"Clientes",proveedores:"Proveedores",cobrar:"Cuentas por cobrar",pagar:"Cuentas por pagar"};
  
  return <div className={`app-shell ${darkMode ? "dark" : ""}`}>
    <aside className={`sidebar ${menu?"open":""}`}><Brand/><button className="icon-button close-menu" onClick={()=>setMenu(false)}><X/></button><nav>
      <p className="nav-label">GESTIÓN COMERCIAL</p>{nav.map(([id,label,Icon])=><button key={id} className={active===id?"active":""} onClick={()=>{setActive(id);setMenu(false)}}><Icon size={19}/>{label}</button>)}
    </nav>
    <div className="sidebar-user">
      <span className="avatar">{user.slice(0,2).toUpperCase()}</span>
      <div><strong>{user}</strong><small>Administrador</small></div>
      <div style={{display: "flex", gap: "6px", marginLeft: "auto"}}>
        <button className="icon-button" onClick={toggleDarkMode} title="Cambiar tema" style={{width:"32px", height:"32px", borderRadius:"8px"}}>
          {darkMode ? <Sun size={15}/> : <Moon size={15}/>}
        </button>
        <button className="icon-button" onClick={logout} title="Cerrar sesión" style={{width:"32px", height:"32px", borderRadius:"8px"}}>
          <LogOut size={15}/>
        </button>
      </div>
    </div>
    </aside>
    {menu&&<button className="menu-backdrop" onClick={()=>setMenu(false)}/>}
    
    <main className="main-content">
      <header className="mobile-header">
        <button className="icon-button" onClick={()=>setMenu(true)}><Menu/></button>
        <Brand/>
        <div style={{display: "flex", gap: "8px"}}>
          <button className="icon-button" onClick={toggleDarkMode} title="Cambiar tema">
            {darkMode ? <Sun size={18}/> : <Moon size={18}/>}
          </button>
          <button className="mobile-add" onClick={()=>setModal("Venta")}><Plus/></button>
        </div>
      </header>
      <section className="page-header">
        <div>
          {active!=="resumen"&&<button className="home-return" onClick={()=>setActive("resumen")}><Home size={20}/>Volver al inicio</button>}
          <p className="eyebrow">CHUNGUITA JR · INFORMACIÓN COMPARTIDA</p>
          <h1>{titles[active]}</h1>
          <p>Sesión de {user}</p>
        </div>
        <div className="header-actions">
          {active==="ventas"&&<button className="primary-button" onClick={()=>setModal("Venta")}><Plus/>Nueva venta</button>}
          {active==="compras"&&<button className="primary-button" onClick={()=>setModal("Compra")}><Plus/>Nueva compra</button>}
          {active==="inventario"&&<button className="primary-button" onClick={()=>{setSelectedItem(null); setModal("Ajuste");}}><Plus/>Ajustar Stock</button>}
        </div>
      </section>
      
      {active==="resumen"&&<Dashboard totals={totals} state={state} onNavigate={setActive} onOpenProduct={id=>{setInventoryProductId(id);setActive("inventario")}} onDeleteMovement={deleteMovement}/>}
      {(active==="ventas"||active==="compras")&&<Movements kind={active==="ventas"?"Venta":"Compra"} state={state} onNew={()=>setModal(active==="ventas"?"Venta":"Compra")} onDeleteMovement={deleteMovement}/>}
      {active==="inventario"&&<Inventory state={state} selectedProductId={inventoryProductId} onSelectProduct={setInventoryProductId} onEditProduct={p=>{setSelectedItem(p);setModal("EditProducto")}} onDeleteMovement={deleteMovement}/>}
      {(active==="clientes"||active==="proveedores")&&<Directory kind={active==="clientes"?"Cliente":"Proveedor"} rows={active==="clientes"?state.clients:state.providers} onNew={()=>setModal(active==="clientes"?"Cliente":"Proveedor")} onEdit={p=>{setSelectedItem(p);setModal(active==="clientes"?"EditCliente":"EditProveedor")}} onDelete={id=>deleteParty(id, active==="clientes"?"Cliente":"Proveedor")}/>}
      {(active==="cobrar"||active==="pagar")&&<Accounts kind={active==="cobrar"?"Venta":"Compra"} state={state} onPay={()=>setModal("Pago")} onDeleteMovement={deleteMovement}/>}
    </main>
    
    <nav className="mobile-nav">{nav.slice(0,5).map(([id,label,Icon])=><button key={id} className={active===id?"active":""} onClick={()=>setActive(id)}><Icon size={20}/><span>{label}</span></button>)}</nav>
    
    {modal&&<Modal kind={modal} state={state} user={user} selectedItem={selectedItem} onClose={()=>{setModal(null);setSelectedItem(null);}} onSave={async n=>{await persist(n);setModal(null);setSelectedItem(null);}}/>}
    {toast&&<div className="toast">{toast}</div>}
  </div>;
}

function Login({onLogin,error}:{onLogin:(e:FormEvent<HTMLFormElement>)=>void;error:string}){return <main className="login-page"><section className="login-card"><Brand/><div><p className="eyebrow">ACCESO SEGURO</p><h1>Gestión comercial</h1><p>Ingresa con tu nombre y clave asignada.</p></div><form onSubmit={onLogin}><label>Usuario<select name="name"><option>Juan Pablo</option><option>Soledad Cortes</option><option>Miguel Angel Contreras</option><option>Administrador</option></select></label><label>Clave<input name="password" type="password" required/></label>{error&&<p className="form-error">{error}</p>}<button className="primary-button" type="submit">Ingresar</button></form><small>Todos los movimientos quedarán identificados por usuario, fecha y hora.</small></section></main>}
function Brand(){return <div className="brand"><div className="brand-mark"><Fish size={32}/></div><div><strong>CHUNGUITA <em>Jr</em></strong><small>GESTIÓN COMERCIAL</small></div></div>}
function ExportActions({title,rows}:{title:string;rows:ExportRow[]}){return <div className="export-actions"><button className="export-button excel" onClick={()=>exportExcel(title,rows)}><FileSpreadsheet/>Excel</button><button className="export-button pdf" onClick={()=>exportPdf(title,rows)}><Printer/>PDF</button></div>}
function movementRows(rows:Movement[],state:State,kind:Movement["kind"]):ExportRow[]{return rows.map(m=>({Fecha:m.date,[kind==="Compra"?"Proveedor":kind==="Venta"?"Cliente":"Detalle"]:partyName(m,state),Producto:`${productName(m,state)} · ${m.quantity} ${m.unit}`,"Forma de pago":m.paymentMethod,Total:money(m.total),Abono:money(m.paid),Saldo:money(m.total-m.paid)}))}
function activityRows(rows:Movement[],state:State):ExportRow[]{return rows.map(m=>({Fecha:m.date,"Cliente / Proveedor / Motivo":partyName(m,state),Producto:`${productName(m,state)} · ${m.quantity} ${m.unit}`,"Forma de pago":m.paymentMethod,Total:money(m.total),Abono:money(m.paid),Saldo:money(m.total-m.paid)}))}
function accountRows(rows:Movement[],state:State,kind:"Compra"|"Venta"):ExportRow[]{return rows.map(m=>({Fecha:m.date,[kind==="Compra"?"Proveedor":"Cliente"]:partyName(m,state),Producto:`${productName(m,state)} · ${m.quantity} ${m.unit}`,"Forma de pago":m.paymentMethod,Total:money(m.total),Abono:money(m.paid),Saldo:money(m.total-m.paid),Usuario:m.user}))}

function Dashboard({totals,state,onNavigate,onOpenProduct,onDeleteMovement}:{totals:Record<string,number>;state:State;onNavigate:(section:Section)=>void;onOpenProduct:(id:string)=>void;onDeleteMovement:(id:string)=>void}){
  const cards:[string,number,typeof ShoppingCart,string,Section][]=[
    ["Ventas",totals.sales,ShoppingCart,"teal","ventas"],
    ["Compras",totals.purchases,ShoppingBasket,"blue","compras"],
    ["Por cobrar",totals.receivable,WalletCards,"violet","cobrar"],
    ["Por pagar",totals.payable,CircleDollarSign,"coral","pagar"]
  ];
  const report=activityRows(state.movements,state);
  return <><section className="metric-grid">{cards.map(([label,value,Icon,tone,target])=><button type="button" className="metric-card" key={label} onClick={()=>onNavigate(target)} aria-label={`Abrir módulo ${label}`}>
    <div className={`metric-icon ${tone}`}><Icon size={28}/></div><div className="metric-label">{label}<ArrowRight className="metric-arrow" size={20}/></div><strong>{money(value)}</strong><p>Ver movimientos y detalle</p>
  </button>)}</section>
  <section className="dashboard-stack"><article className="surface recent-surface"><div className="surface-title"><div><p className="eyebrow">ÚLTIMOS MOVIMIENTOS</p><h2>Actividad reciente</h2></div><div className="surface-actions"><ExportActions title="Actividad-reciente" rows={report}/>{state.movements.length>0&&<button className="text-button" onClick={()=>onNavigate(state.movements[0].kind==="Venta"?"ventas":"compras")}>Ver detalle <ArrowRight size={16}/></button>}</div></div><RecentMovements rows={state.movements.slice(0,8)} state={state} onDeleteMovement={onDeleteMovement}/></article>
  <article className="surface alert-panel"><div className="surface-title"><div><p className="eyebrow coral-text">INVENTARIO</p><h2><AlertTriangle/>Alertas de stock</h2></div><button className="text-button" onClick={()=>{onOpenProduct("");onNavigate("inventario")}}>Ver inventario <ArrowRight size={16}/></button></div><div className="stock-alerts">{state.products.filter(p=>productValue(p,"unidad","stock")<=productValue(p,"unidad","minimum")||productValue(p,"caja","stock")<=productValue(p,"caja","minimum")).map(p=><button className="stock-alert" key={p.id} onClick={()=>onOpenProduct(p.id)}><div><strong>{p.name}</strong><small>Ver solamente este producto</small></div><span>{productValue(p,"unidad","stock")} un. · {productValue(p,"caja","stock")} cj.</span><ArrowRight size={18}/></button>)}{!state.products.some(p=>productValue(p,"unidad","stock")<=productValue(p,"unidad","minimum")||productValue(p,"caja","stock")<=productValue(p,"caja","minimum"))&&<p className="empty-mini">Sin alertas</p>}</div></article></section></>;
}

function RecentMovements({rows,state,onDeleteMovement}:{rows:Movement[];state:State;onDeleteMovement:(id:string)=>void}){
  return <div className="responsive-table recent-table"><table><thead><tr><th>Fecha</th><th>Cliente / Prov / Motivo</th><th>Producto</th><th>Forma de pago</th><th>Total</th><th>Abono</th><th>Saldo</th><th>Acciones</th></tr></thead><tbody>{rows.map(m=><tr key={m.id}><td data-label="Fecha">{m.date}</td><td data-label="Cliente / Prov / Motivo"><strong>{partyName(m,state)}</strong></td><td data-label="Producto">{productName(m,state)} · {m.quantity} {m.unit}</td><td data-label="Forma de pago">{m.paymentMethod}</td><td data-label="Total"><strong>{m.kind==="Ajuste"?"—":money(m.total)}</strong></td><td data-label="Abono">{m.kind==="Ajuste"?"—":money(m.paid)}</td><td data-label="Saldo">{m.kind==="Ajuste"?"—":<span className={`status ${m.total-m.paid<=0?"paid":"pending"}`}>{money(m.total-m.paid)}</span>}</td><td data-label="Acciones"><button className="icon-button danger-icon-button" onClick={()=>onDeleteMovement(m.id)} title="Eliminar"><Trash2 size={16}/></button></td></tr>)}{!rows.length&&<tr><td colSpan={8} className="empty-state">Aún no hay movimientos.</td></tr>}</tbody></table></div>;
}

function Movements({kind,state,onNew,onDeleteMovement}:{kind:"Compra"|"Venta";state:State;onNew:()=>void;onDeleteMovement:(id:string)=>void}){
  const rows=state.movements.filter(m=>m.kind===kind);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const filteredRows = rows.filter(m => {
    const pName = productName(m, state);
    const partName = partyName(m, state);
    const matchSearch = pName.toLowerCase().includes(search.toLowerCase()) || partName.toLowerCase().includes(search.toLowerCase());
    const matchStart = startDate ? m.date >= startDate : true;
    const matchEnd = endDate ? m.date <= endDate : true;
    return matchSearch && matchStart && matchEnd;
  });

  return <section className="surface data-surface">
    <div className="surface-title">
      <div>
        <p className="eyebrow">DETALLE POR FECHAS</p>
        <h2>{kind}s registradas</h2>
      </div>
      <div className="surface-actions">
        <ExportActions title={`${kind}s`} rows={movementRows(filteredRows,state,kind)}/>
        <button className="primary-button compact" onClick={onNew}><Plus/>Nueva {kind.toLowerCase()}</button>
      </div>
    </div>
    
    <div className="search-bar-row">
      <div className="search-input-wrapper">
        <Search size={18}/>
        <input type="text" placeholder="Buscar por producto o persona..." value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>
      <div className="date-filters">
        <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} title="Fecha inicio"/>
        <span>al</span>
        <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} title="Fecha fin"/>
      </div>
    </div>

    <MovementTable rows={filteredRows} state={state} kind={kind} onDeleteMovement={onDeleteMovement}/>
  </section>;
}

function MovementTable({rows,state,kind,onDeleteMovement}:{rows:Movement[];state:State;kind:"Compra"|"Venta";onDeleteMovement:(id:string)=>void}){
  const partyLabel=kind==="Compra"?"Proveedor":"Cliente";
  return <div className="responsive-table"><table><thead><tr><th>Fecha</th><th>{partyLabel}</th><th>Producto</th><th>Forma de pago</th><th>Total</th><th>Abono</th><th>Saldo</th><th>Acciones</th></tr></thead><tbody>{rows.map(m=><tr key={m.id}><td data-label="Fecha">{m.date}</td><td data-label={partyLabel}><strong>{partyName(m,state)}</strong></td><td data-label="Producto">{productName(m,state)} · {m.quantity} {m.unit}</td><td data-label="Forma de pago">{m.paymentMethod}</td><td data-label="Total"><strong>{money(m.total)}</strong></td><td data-label="Abono">{money(m.paid)}</td><td data-label="Saldo"><span className={`status ${m.total-m.paid<=0?"paid":"pending"}`}>{money(m.total-m.paid)}</span></td><td data-label="Acciones"><button className="icon-button danger-icon-button" onClick={()=>onDeleteMovement(m.id)} title="Eliminar"><Trash2 size={16}/></button></td></tr>)}{!rows.length&&<tr><td colSpan={8} className="empty-state">Aún no hay registros.</td></tr>}</tbody></table></div>;
}

function Inventory({state,selectedProductId,onSelectProduct,onEditProduct,onDeleteMovement}:{state:State;selectedProductId:string|null;onSelectProduct:(id:string|null)=>void;onEditProduct:(p:Product)=>void;onDeleteMovement:(id:string)=>void}){
  const [filter,setFilter]=useState<"todas"|Presentation>("todas");
  const [search, setSearch] = useState("");
  const presentations:Presentation[]=filter==="todas"?["unidad","caja"]:[filter];
  
  const stats=state.products.map(product=>{
    const sales=state.movements.filter(m=>m.kind==="Venta"&&m.productId===product.id);
    const adjustments=state.movements.filter(m=>m.kind==="Ajuste"&&m.productId===product.id);
    
    const sold=(presentation:Presentation)=>sales.filter(m=>(m.unit==="caja"?"caja":"unidad")===presentation).reduce((sum,m)=>sum+m.quantity,0);
    const revenue=(presentation:Presentation)=>sales.filter(m=>(m.unit==="caja"?"caja":"unidad")===presentation).reduce((sum,m)=>sum+m.total,0);
    const cost=(presentation:Presentation)=>sales.filter(m=>(m.unit==="caja"?"caja":"unidad")===presentation).reduce((sum,m)=>sum+m.quantity*unitCostForMovement(m,product),0);
    
    const mermaLoss=(presentation:Presentation)=>adjustments.filter(m=>(m.unit==="caja"?"caja":"unidad")===presentation && m.quantity < 0).reduce((sum,m)=>sum+Math.abs(m.quantity)*unitCostForMovement(m,product),0);
    
    return {product,sold,revenue,cost,profit:(presentation:Presentation)=>revenue(presentation)-cost(presentation)-mermaLoss(presentation)};
  });
  
  const visibleStats=selectedProductId?stats.filter(s=>s.product.id===selectedProductId):stats;
  const filteredStats=visibleStats.filter(s=>s.product.name.toLowerCase().includes(search.toLowerCase()));
  
  const totalProfit=filteredStats.reduce((sum,s)=>sum+presentations.reduce((n,p)=>n+s.profit(p),0),0);
  const totalUnits=filteredStats.reduce((sum,s)=>sum+productValue(s.product,"unidad","stock"),0);
  const totalBoxes=filteredStats.reduce((sum,s)=>sum+productValue(s.product,"caja","stock"),0);
  
  const movementRows=state.movements.filter(m=>(!selectedProductId||m.productId===selectedProductId)&&(filter==="todas"||(m.unit==="caja"?"caja":"unidad")===filter));
  const report=movementRows.map(m=>{const product=state.products.find(p=>p.id===m.productId);const presentation=m.unit==="caja"?"caja":"unidad";const signed=m.kind==="Compra"?m.quantity:m.kind==="Venta"?-m.quantity:m.quantity;return {Fecha:m.date,"Cliente / Proveedor":partyName(m,state),Producto:productName(m,state),Unidad:presentation==="unidad"?signed:"—",Caja:presentation==="caja"?signed:"—","Stock del producto · Unidad":product?productValue(product,"unidad","stock"):0,"Stock del producto · Caja":product?productValue(product,"caja","stock"):0}});
  
  return <section className="inventory-page">
    <div className="inventory-toolbar">
      <div>
        <p className="eyebrow">CONTROL POR PRESENTACIÓN</p>
        <h2>{selectedProductId?visibleStats[0]?.product.name:"Detalle completo de productos"}</h2>
        <p>{selectedProductId?"Ficha individual del producto seleccionado.":"Stock, costos, precios y rentabilidad real por unidad y por caja."}</p>
      </div>
      <div className="inventory-actions">
        {selectedProductId&&<button className="secondary-button" onClick={()=>onSelectProduct(null)}>Ver todo el inventario</button>}
        <label className="filter-select">
          <span>Ver presentación</span>
          <select value={filter} onChange={e=>setFilter(e.target.value as "todas"|Presentation)}>
            <option value="todas">Todas</option>
            <option value="unidad">Por unidad</option>
            <option value="caja">Por caja</option>
          </select>
          <ChevronDown/>
        </label>
        <ExportActions title={selectedProductId?`Inventario-${visibleStats[0]?.product.name}`:"Inventario-detallado"} rows={report}/>
      </div>
    </div>

    <div className="search-bar-row mb-4">
      <div className="search-input-wrapper">
        <Search size={18}/>
        <input type="text" placeholder="Filtrar productos..." value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>
    </div>
    
    <div className="inventory-kpis">
      <article><span className="inventory-kpi-icon teal"><Package/></span><div><small>Stock por unidad</small><strong>{totalUnits}</strong></div></article>
      <article><span className="inventory-kpi-icon blue"><Boxes/></span><div><small>Stock por caja</small><strong>{totalBoxes}</strong></div></article>
      <article><span className="inventory-kpi-icon green"><TrendingUp/></span><div><small>Utilidad estimada</small><strong>{money(totalProfit)}</strong></div></article>
    </div>

    <div className="product-settings-grid mb-6">
      {filteredStats.map(s=>(
        <div key={s.product.id} className="product-settings-card">
          <div className="product-settings-header">
            <h3>{s.product.name} ({s.product.unit})</h3>
            <button className="icon-button compact-icon" onClick={()=>onEditProduct(s.product)} title="Editar Producto"><Edit size={15}/></button>
          </div>
          <div className="product-settings-body">
            <div><span>Stock Unidades:</span> <strong>{productValue(s.product,"unidad","stock")}</strong> <small>(Mín: {productValue(s.product,"unidad","minimum")})</small></div>
            <div><span>Stock Cajas:</span> <strong>{productValue(s.product,"caja","stock")}</strong> <small>(Mín: {productValue(s.product,"caja","minimum")})</small></div>
            <div><span>P. Compra Un:</span> {money(productValue(s.product,"unidad","buy"))} | <span>Caja:</span> {money(productValue(s.product,"caja","buy"))}</div>
            <div><span>P. Venta Un:</span> {money(productValue(s.product,"unidad","sell"))} | <span>Caja:</span> {money(productValue(s.product,"caja","sell"))}</div>
          </div>
        </div>
      ))}
    </div>

    <h3>Historial de Movimientos de Inventario</h3>
    <div className="inventory-ledger responsive-table"><table><thead><tr><th>Fecha</th><th>Cliente / Prov / Motivo</th><th>Producto</th><th>Unidad</th><th>Caja</th><th>Stock · Un</th><th>Stock · Cj</th><th>Acciones</th></tr></thead><tbody>{movementRows.map(m=>{const product=state.products.find(p=>p.id===m.productId);const presentation=m.unit==="caja"?"caja":"unidad";const signed=m.kind==="Compra"?m.quantity:m.kind==="Venta"?-m.quantity:m.quantity;return <tr key={m.id}><td data-label="Fecha">{m.date}</td><td data-label="Cliente / Prov / Motivo"><strong>{partyName(m,state)}</strong></td><td data-label="Producto"><button className="inventory-product-link" onClick={()=>onSelectProduct(m.productId)}>{productName(m,state)}</button></td><td data-label="Unidad">{presentation==="unidad"?<span className={`inventory-quantity ${m.kind==="Compra"||(m.kind==="Ajuste"&&signed>0)?"in":"out"}`}>{signed>0?"+":""}{signed}</span>:"—"}</td><td data-label="Caja">{presentation==="caja"?<span className={`inventory-quantity ${m.kind==="Compra"||(m.kind==="Ajuste"&&signed>0)?"in":"out"}`}>{signed>0?"+":""}{signed}</span>:"—"}</td><td data-label="Stock · Un"><strong>{product?productValue(product,"unidad","stock"):0}</strong></td><td data-label="Stock · Cj"><strong>{product?productValue(product,"caja","stock"):0}</strong></td><td data-label="Acciones"><button className="icon-button danger-icon-button" onClick={()=>onDeleteMovement(m.id)} title="Eliminar"><Trash2 size={16}/></button></td></tr>})}{!movementRows.length&&<tr><td colSpan={8} className="empty-state">Aún no hay movimientos de inventario.</td></tr>}</tbody></table></div>
  </section>;
}

function Directory({kind,rows,onNew,onEdit,onDelete}:{kind:"Cliente"|"Proveedor";rows:Party[];onNew:()=>void;onEdit:(p:Party)=>void;onDelete:(id:string)=>void}){
  const [search, setSearch] = useState("");
  const filteredRows = rows.filter(r => r.name.toLowerCase().includes(search.toLowerCase()) || (r.rut && r.rut.toLowerCase().includes(search.toLowerCase())));
  const report=filteredRows.map(r=>({Nombre:r.name,RUT:r.rut||"Sin RUT",Teléfono:r.phone||"Sin teléfono"}));
  
  return <section className="surface data-surface">
    <div className="surface-title">
      <div>
        <p className="eyebrow">DIRECTORIO</p>
        <h2>{kind}s registrados</h2>
      </div>
      <div className="surface-actions">
        <ExportActions title={`${kind}s`} rows={report}/>
        <button className="primary-button compact" onClick={onNew}><Plus/>Agregar</button>
      </div>
    </div>
    
    <div className="search-bar-row mb-4">
      <div className="search-input-wrapper">
        <Search size={18}/>
        <input type="text" placeholder={`Buscar ${kind.toLowerCase()} por nombre o RUT...`} value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>
    </div>

    <div className="directory-grid">
      {filteredRows.map(r=>(
        <article className="directory-card" key={r.id}>
          <span className="directory-avatar">{r.name.slice(0,2).toUpperCase()}</span>
          <div>
            <strong>{r.name}</strong>
            <small>RUT {r.rut||"Sin RUT"} · {r.phone||"Sin teléfono"}</small>
          </div>
          <div className="directory-actions-mini mt-2">
            <button className="text-button compact-btn" onClick={()=>onEdit(r)}><Edit size={14}/> Editar</button>
            <button className="text-button compact-btn coral-text" onClick={()=>onDelete(r.id)}><Trash2 size={14}/> Eliminar</button>
          </div>
        </article>
      ))}
      {!filteredRows.length&&<p className="empty-state">Aún no hay registros que coincidan.</p>}
    </div>
  </section>;
}

function Accounts({kind,state,onPay,onDeleteMovement}:{kind:"Compra"|"Venta";state:State;onPay:()=>void;onDeleteMovement:(id:string)=>void}){
  const rows=state.movements.filter(m=>m.kind===kind&&m.total>m.paid);
  const [search, setSearch] = useState("");
  const filteredRows = rows.filter(m => {
    const pName = productName(m, state);
    const partName = partyName(m, state);
    return pName.toLowerCase().includes(search.toLowerCase()) || partName.toLowerCase().includes(search.toLowerCase());
  });

  return <section className="surface data-surface">
    <div className="surface-title">
      <div>
        <p className="eyebrow">PAGADOS Y PENDIENTES</p>
        <h2>{kind==="Venta"?"Clientes pendientes de cobrar":"Proveedores pendientes de pagar"}</h2>
      </div>
      <div className="surface-actions">
        <ExportActions title={kind==="Venta"?"Cuentas-por-cobrar":"Cuentas-por-pagar"} rows={accountRows(filteredRows,state,kind)}/>
        <button className="primary-button compact" onClick={onPay}>Registrar abono</button>
      </div>
    </div>
    
    <div className="search-bar-row mb-4">
      <div className="search-input-wrapper">
        <Search size={18}/>
        <input type="text" placeholder="Filtrar pendientes..." value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>
    </div>

    <AccountTable rows={filteredRows} state={state} kind={kind} onDeleteMovement={onDeleteMovement}/>
  </section>;
}

function AccountTable({rows,state,kind,onDeleteMovement}:{rows:Movement[];state:State;kind:"Compra"|"Venta";onDeleteMovement:(id:string)=>void}){
  const partyLabel=kind==="Compra"?"Proveedor":"Cliente";
  return <div className="responsive-table"><table><thead><tr><th>Fecha</th><th>{partyLabel}</th><th>Producto</th><th>Forma de pago</th><th>Total</th><th>Abono</th><th>Saldo</th><th>Usuario</th><th>Acciones</th></tr></thead><tbody>{rows.map(m=><tr key={m.id}><td data-label="Fecha">{m.date}</td><td data-label={partyLabel}><strong>{partyName(m,state)}</strong></td><td data-label="Producto">{productName(m,state)} · {m.quantity} {m.unit}</td><td data-label="Forma de pago">{m.paymentMethod}</td><td data-label="Total"><strong>{money(m.total)}</strong></td><td data-label="Abono">{money(m.paid)}</td><td data-label="Saldo"><span className={`status ${m.total-m.paid<=0?"paid":"pending"}`}>{money(m.total-m.paid)}</span></td><td data-label="Usuario">{m.user}</td><td data-label="Acciones"><button className="icon-button danger-icon-button" onClick={()=>onDeleteMovement(m.id)} title="Eliminar"><Trash2 size={16}/></button></td></tr>)}{!rows.length&&<tr><td colSpan={9} className="empty-state">Aún no hay registros pendientes.</td></tr>}</tbody></table></div>;
}

function partyName(m:Movement,s:State){
  if (m.kind === "Ajuste") return m.reason || "Ajuste de Stock";
  return [...s.clients,...s.providers].find(p=>p.id===m.partyId)?.name||"Sin identificar";
}
function productName(m:Movement,s:State){return s.products.find(p=>p.id===m.productId)?.name||"Producto"}

function Modal({kind,state,user,selectedItem,onClose,onSave}:{kind:"Compra"|"Venta"|"Cliente"|"Proveedor"|"Pago"|"Ajuste"|"EditProducto"|"EditCliente"|"EditProveedor";state:State;user:string;selectedItem:any;onClose:()=>void;onSave:(s:State)=>void}){
  const [productId,setProductId]=useState(state.products[0]?.id||"");
  const product=state.products.find(p=>p.id===productId);
  const [presentation,setPresentation]=useState<Presentation>("unidad");
  const [qty,setQty]=useState(1);
  const [price,setPrice]=useState(()=>product?productValue(product,"unidad",kind==="Compra"?"buy":"sell"):0);
  const [method,setMethod]=useState<Movement["paymentMethod"]>("Transferencia");

  const [adjustType, setAdjustType] = useState<"Ingreso"|"Merma">("Merma");
  const [reason, setReason] = useState("Pérdida por descomposición");

  function changeProduct(nextId:string){setProductId(nextId);const next=state.products.find(p=>p.id===nextId);setPrice(next?productValue(next,presentation,kind==="Compra"?"buy":"sell"):0)}
  function changePresentation(next:Presentation){setPresentation(next);setPrice(product?productValue(product,next,kind==="Compra"?"buy":"sell"):0)}

  function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();const fd=new FormData(e.currentTarget);
    
    if(kind === "Cliente" || kind === "Proveedor"){
      const row={id:crypto.randomUUID(),name:String(fd.get("name")),rut:String(fd.get("rut")),phone:String(fd.get("phone"))};
      onSave({...state,[kind==="Cliente"?"clients":"providers"]:[...(kind==="Cliente"?state.clients:state.providers),row]});
      return;
    }
    
    if(kind === "EditCliente" || kind === "EditProveedor") {
      const key = kind === "EditCliente" ? "clients" : "providers";
      const nextRows = state[key].map(x => x.id === selectedItem.id ? { ...x, name: String(fd.get("name")), rut: String(fd.get("rut")), phone: String(fd.get("phone")) } : x);
      onSave({ ...state, [key]: nextRows });
      return;
    }

    if(kind === "EditProducto") {
      const nextProducts = state.products.map(x => x.id === selectedItem.id ? {
        ...x,
        name: String(fd.get("name")),
        unit: String(fd.get("unit")),
        minimumUnit: Number(fd.get("minimumUnit")),
        minimumBox: Number(fd.get("minimumBox")),
        buyUnit: Number(fd.get("buyUnit")),
        buyBox: Number(fd.get("buyBox")),
        sellUnit: Number(fd.get("sellUnit")),
        sellBox: Number(fd.get("sellBox")),
        stockUnit: Number(fd.get("stockUnit")),
        stockBox: Number(fd.get("stockBox")),
      } : x);
      onSave({ ...state, products: nextProducts });
      return;
    }

    if(kind==="Pago"){
      const id=String(fd.get("movement"));
      const amount=Number(fd.get("amount"));
      onSave({...state,movements:state.movements.map(m=>m.id===id?{...m,paid:Math.min(m.total,m.paid+amount),user}:m)});
      return;
    }

    if(kind==="Ajuste") {
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
        reason: `${adjustType === "Merma" ? "Merma" : "Ingreso"} - ${reason}`
      };

      const nextProducts = state.products.map(p => {
        if (p.id !== productId) return p;
        return presentation === "unidad"
          ? { ...p, stockUnit: Math.max(0, productValue(p, "unidad", "stock") + signedQty) }
          : { ...p, stockBox: Math.max(0, productValue(p, "caja", "stock") + signedQty) };
      });
      onSave({ ...state, products: nextProducts, movements: [m, ...state.movements] });
      return;
    }

    const partyId=String(fd.get("party"));
    const total=qty*price;
    const paid=method==="Crédito"?Number(fd.get("paid")||0):total;
    const currentCost=product?productValue(product,presentation,"buy"):0;
    const m:Movement={id:crypto.randomUUID(),kind,date:String(fd.get("date")),partyId,productId,quantity:qty,unit:presentation,price,total,paymentMethod:method,paid,user,cost:kind==="Venta"?currentCost:price};
    
    onSave({...state,products:state.products.map(p=>{if(p.id!==productId)return p;const delta=kind==="Compra"?qty:-qty;return presentation==="unidad"?{...p,stockUnit:Math.max(0,productValue(p,"unidad","stock")+delta),buyUnit:kind==="Compra"?price:productValue(p,"unidad","buy"),sellUnit:kind==="Venta"?price:productValue(p,"unidad","sell")}:{...p,stockBox:Math.max(0,productValue(p,"caja","stock")+delta),buyBox:kind==="Compra"?price:productValue(p,"caja","buy"),sellBox:kind==="Venta"?price:productValue(p,"caja","sell")}}),movements:[m,...state.movements]});
  }
  
  const pending=state.movements.filter(m=>m.total>m.paid);
  const isEdit = kind.startsWith("Edit");
  
  return <div className="modal-layer" onMouseDown={onClose}><div className="modal-card" onMouseDown={e=>e.stopPropagation()}><div className="modal-heading"><div><p className="eyebrow">{isEdit ? "MODIFICAR REGISTRO" : "NUEVO REGISTRO"}</p><h2>{kind==="Pago"?"Registrar pago o abono":kind==="Ajuste"?"Registrar Ajuste / Merma":kind==="EditProducto"?"Editar Producto":kind==="EditCliente"?"Editar Cliente":kind==="EditProveedor"?"Editar Proveedor":`Registrar ${kind.toLowerCase()}`}</h2></div><button className="icon-button" onClick={onClose}><X/></button></div>
  <form onSubmit={submit}>
    {(kind==="Cliente"||kind==="Proveedor"||kind==="EditCliente"||kind==="EditProveedor") ? <>
      <label>Nombre<input name="name" defaultValue={selectedItem?.name || ""} required/></label>
      <div className="form-grid"><label>RUT<input name="rut" defaultValue={selectedItem?.rut || ""}/></label><label>Teléfono<input name="phone" defaultValue={selectedItem?.phone || ""}/></label></div>
    </> : kind==="EditProducto" ? <>
      <label>Nombre del producto<input name="name" defaultValue={selectedItem?.name || ""} required/></label>
      <div className="form-grid">
        <label>Unidad de medida<select name="unit" defaultValue={selectedItem?.unit || "kg"}><option value="kg">kilogramo (kg)</option><option value="unidad">unidad</option></select></label>
      </div>
      <div className="form-grid">
        <label>Stock actual (Unidades)<input type="number" name="stockUnit" defaultValue={productValue(selectedItem,"unidad","stock")} required/></label>
        <label>Stock actual (Cajas)<input type="number" name="stockBox" defaultValue={productValue(selectedItem,"caja","stock")} required/></label>
      </div>
      <div className="form-grid">
        <label>Stock Mínimo (Unidades)<input type="number" name="minimumUnit" defaultValue={productValue(selectedItem,"unidad","minimum")} required/></label>
        <label>Stock Mínimo (Cajas)<input type="number" name="minimumBox" defaultValue={productValue(selectedItem,"caja","minimum")} required/></label>
      </div>
      <div className="form-grid">
        <label>Precio Compra (Unidad)<input type="number" name="buyUnit" defaultValue={productValue(selectedItem,"unidad","buy")} required/></label>
        <label>Precio Compra (Caja)<input type="number" name="buyBox" defaultValue={productValue(selectedItem,"caja","buy")} required/></label>
      </div>
      <div className="form-grid">
        <label>Precio Venta (Unidad)<input type="number" name="sellUnit" defaultValue={productValue(selectedItem,"unidad","sell")} required/></label>
        <label>Precio Venta (Caja)<input type="number" name="sellBox" defaultValue={productValue(selectedItem,"caja","sell")} required/></label>
      </div>
    </> : kind==="Pago" ? <>
      <label>Cuenta pendiente<select name="movement">{pending.map(m=><option key={m.id} value={m.id}>{partyName(m,state)} · {money(m.total-m.paid)}</option>)}</select></label>
      <label>Monto del abono<input name="amount" type="number" min="1" required/></label>
    </> : kind==="Ajuste" ? <>
      <div className="form-grid">
        <label>Fecha<input name="date" type="date" defaultValue={dateToday()} required/></label>
        <label>Tipo de ajuste
          <select value={adjustType} onChange={e=>setAdjustType(e.target.value as any)}>
            <option value="Merma">Merma / Pérdida (-)</option>
            <option value="Ingreso">Ingreso Manual (+)</option>
          </select>
        </label>
      </div>
      <div className="form-grid">
        <label>Producto
          <select value={productId} onChange={e=>changeProduct(e.target.value)}>
            {state.products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label>Presentación
          <select value={presentation} onChange={e=>changePresentation(e.target.value as Presentation)}>
            <option value="unidad">Unidad</option>
            <option value="caja">Caja</option>
          </select>
        </label>
      </div>
      <div className="form-grid">
        <label>Cantidad<input type="number" min="0.01" step="0.01" value={qty} onChange={e=>setQty(Number(e.target.value))}/></label>
        <label>Motivo
          <select value={reason} onChange={e=>setReason(e.target.value)}>
            {adjustType === "Merma" ? <>
              <option value="Pérdida por descomposición">Pérdida por descomposición</option>
              <option value="Consumo interno">Consumo interno</option>
              <option value="Ajuste de inventario">Diferencia / Ajuste negativo</option>
            </> : <>
              <option value="Ajuste de inventario">Diferencia / Ajuste positivo</option>
              <option value="Inventario inicial">Carga de inventario inicial</option>
              <option value="Devolución de cliente">Devolución de cliente</option>
            </>}
          </select>
        </label>
      </div>
    </> : <>
      <div className="form-grid"><label>Fecha<input name="date" type="date" defaultValue={dateToday()} required/></label><label>{kind==="Venta"?"Cliente":"Proveedor"}<select name="party" required>{(kind==="Venta"?state.clients:state.providers).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label></div>
      <div className="form-grid"><label>Producto<select value={productId} onChange={e=>changeProduct(e.target.value)}>{state.products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>Presentación<select value={presentation} onChange={e=>changePresentation(e.target.value as Presentation)}><option value="unidad">Unidad</option><option value="caja">Caja</option></select></label></div>
      <div className="form-grid"><label>Cantidad<input type="number" min="0.01" step="0.01" value={qty} onChange={e=>setQty(Number(e.target.value))}/></label><label>Precio por {presentation}<input type="number" min="0" value={price} onChange={e=>setPrice(Number(e.target.value))}/></label></div>
      <label>Forma de pago<select value={method} onChange={e=>setMethod(e.target.value as Movement["paymentMethod"])}><option>Transferencia</option><option>Efectivo</option><option>Crédito</option></select></label>
      {method==="Crédito"&&<label>Abono inicial<input name="paid" type="number" min="0" defaultValue="0"/></label>}
      <div className="sale-total"><span>Total</span><strong>{money(qty*price)}</strong></div>
    </>}
    <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button className="primary-button" type="submit">Guardar</button></div>
  </form></div></div>;
}
