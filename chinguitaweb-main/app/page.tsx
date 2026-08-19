"use client";

import { AlertTriangle, ArrowRight, Boxes, Building2, ChevronDown, CircleDollarSign, FileSpreadsheet, Fish, Home, LogOut, Menu, Package, Plus, Printer, ShoppingBasket, ShoppingCart, TrendingUp, UsersRound, WalletCards, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

type Section = "resumen"|"compras"|"ventas"|"inventario"|"clientes"|"proveedores"|"cobrar"|"pagar";
type Presentation="unidad"|"caja";
type Product={id:string;name:string;stock:number;unit:string;buy:number;sell:number;minimum:number;stockUnit?:number;stockBox?:number;buyUnit?:number;buyBox?:number;sellUnit?:number;sellBox?:number;minimumUnit?:number;minimumBox?:number};
type Party={id:string;name:string;rut:string;phone:string};
type Movement={id:string;kind:"Compra"|"Venta";date:string;partyId:string;productId:string;quantity:number;unit:string;price:number;total:number;paymentMethod:"Transferencia"|"Efectivo"|"Crédito";paid:number;user:string;cost?:number};
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
  const [active,setActive]=useState<Section>("resumen"); const [menu,setMenu]=useState(false); const [modal,setModal]=useState<"Compra"|"Venta"|"Cliente"|"Proveedor"|"Pago"|null>(null);
  const [inventoryProductId,setInventoryProductId]=useState<string|null>(null);
  const [loading,setLoading]=useState(true); const [toast,setToast]=useState("");
  useEffect(()=>{void Promise.resolve().then(()=>{const t=localStorage.getItem("cj-token")||"";const u=localStorage.getItem("cj-user")||"";if(!t){setLoading(false);return}setToken(t);setUser(u);void load(t)})},[]);
  async function load(t=token){const r=await fetch("/api/data",{headers:{authorization:`Bearer ${t}`}});if(!r.ok){localStorage.clear();setToken("");setLoading(false);return}const d=await r.json();if(d.state)setState(d.state);setLoading(false)}
  async function persist(next:State){setState(next);const r=await fetch("/api/data",{method:"PUT",headers:{"content-type":"application/json",authorization:`Bearer ${token}`},body:JSON.stringify(next)});setToast(r.ok?"Información guardada":"No se pudo guardar");setTimeout(()=>setToast(""),2200)}
  async function login(e:FormEvent<HTMLFormElement>){e.preventDefault();const fd=new FormData(e.currentTarget);const r=await fetch("/api/auth",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:fd.get("name"),password:fd.get("password")})});const d=await r.json();if(!r.ok){setToast(d.error);return}localStorage.setItem("cj-token",d.token);localStorage.setItem("cj-user",d.user);setToken(d.token);setUser(d.user);setLoading(true);await load(d.token)}
  async function logout(){await fetch("/api/auth",{method:"DELETE",headers:{authorization:`Bearer ${token}`}});localStorage.clear();setToken("");setUser("")}
  if(loading)return <div className="splash"><Fish size={42}/><strong>CHUNGUITA Jr</strong><span>Cargando gestión comercial…</span></div>;
  if(!token)return <Login onLogin={login} error={toast}/>;
  const sales=state.movements.filter(m=>m.kind==="Venta"),purchases=state.movements.filter(m=>m.kind==="Compra");
  const receivable=sales.reduce((s,m)=>s+Math.max(0,m.total-m.paid),0),payable=purchases.reduce((s,m)=>s+Math.max(0,m.total-m.paid),0);
  const totals={sales:sales.reduce((s,m)=>s+m.total,0),purchases:purchases.reduce((s,m)=>s+m.total,0),receivable,payable};
  const titles:Record<Section,string>={resumen:"Resumen del negocio",compras:"Compras",ventas:"Ventas",inventario:"Inventario",clientes:"Clientes",proveedores:"Proveedores",cobrar:"Cuentas por cobrar",pagar:"Cuentas por pagar"};
  return <div className="app-shell">
    <aside className={`sidebar ${menu?"open":""}`}><Brand/><button className="icon-button close-menu" onClick={()=>setMenu(false)}><X/></button><nav>
      <p className="nav-label">GESTIÓN COMERCIAL</p>{nav.map(([id,label,Icon])=><button key={id} className={active===id?"active":""} onClick={()=>{setActive(id);setMenu(false)}}><Icon size={19}/>{label}</button>)}
    </nav><div className="sidebar-user"><span className="avatar">{user.slice(0,2).toUpperCase()}</span><div><strong>{user}</strong><small>Administrador</small></div><button className="icon-button" onClick={logout} title="Cerrar sesión"><LogOut size={17}/></button></div></aside>
    {menu&&<button className="menu-backdrop" onClick={()=>setMenu(false)}/>}
    <main className="main-content"><header className="mobile-header"><button className="icon-button" onClick={()=>setMenu(true)}><Menu/></button><Brand/><button className="mobile-add" onClick={()=>setModal("Venta")}><Plus/></button></header>
      <section className="page-header"><div>{active!=="resumen"&&<button className="home-return" onClick={()=>setActive("resumen")}><Home size={20}/>Volver al inicio</button>}<p className="eyebrow">CHUNGUITA JR · INFORMACIÓN COMPARTIDA</p><h1>{titles[active]}</h1><p>Sesión de {user}</p></div><div className="header-actions">{active==="ventas"&&<button className="primary-button" onClick={()=>setModal("Venta")}><Plus/>Nueva venta</button>}{active==="compras"&&<button className="primary-button" onClick={()=>setModal("Compra")}><Plus/>Nueva compra</button>}</div></section>
      {active==="resumen"&&<Dashboard totals={totals} state={state} onNavigate={setActive} onOpenProduct={id=>{setInventoryProductId(id);setActive("inventario")}}/>}
      {(active==="ventas"||active==="compras")&&<Movements kind={active==="ventas"?"Venta":"Compra"} state={state} onNew={()=>setModal(active==="ventas"?"Venta":"Compra")}/>}
      {active==="inventario"&&<Inventory state={state} selectedProductId={inventoryProductId} onSelectProduct={setInventoryProductId}/>}
      {(active==="clientes"||active==="proveedores")&&<Directory kind={active==="clientes"?"Cliente":"Proveedor"} rows={active==="clientes"?state.clients:state.providers} onNew={()=>setModal(active==="clientes"?"Cliente":"Proveedor")}/>}
      {(active==="cobrar"||active==="pagar")&&<Accounts kind={active==="cobrar"?"Venta":"Compra"} state={state} onPay={()=>setModal("Pago")}/>}
    </main>
    <nav className="mobile-nav">{nav.slice(0,5).map(([id,label,Icon])=><button key={id} className={active===id?"active":""} onClick={()=>setActive(id)}><Icon size={20}/><span>{label}</span></button>)}</nav>
    {modal&&<Modal kind={modal} state={state} user={user} onClose={()=>setModal(null)} onSave={async n=>{await persist(n);setModal(null)}}/>}
    {toast&&<div className="toast">{toast}</div>}
  </div>
}

function Login({onLogin,error}:{onLogin:(e:FormEvent<HTMLFormElement>)=>void;error:string}){return <main className="login-page"><section className="login-card"><Brand/><div><p className="eyebrow">ACCESO SEGURO</p><h1>Gestión comercial</h1><p>Ingresa con tu nombre y clave asignada.</p></div><form onSubmit={onLogin}><label>Usuario<select name="name"><option>Juan Pablo</option><option>Soledad Cortes</option><option>Miguel Angel Contreras</option><option>Administrador</option></select></label><label>Clave<input name="password" type="password" required/></label>{error&&<p className="form-error">{error}</p>}<button className="primary-button" type="submit">Ingresar</button></form><small>Todos los movimientos quedarán identificados por usuario, fecha y hora.</small></section></main>}
function Brand(){return <div className="brand"><div className="brand-mark"><Fish size={32}/></div><div><strong>CHUNGUITA <em>Jr</em></strong><small>GESTIÓN COMERCIAL</small></div></div>}
function ExportActions({title,rows}:{title:string;rows:ExportRow[]}){return <div className="export-actions"><button className="export-button excel" onClick={()=>exportExcel(title,rows)}><FileSpreadsheet/>Excel</button><button className="export-button pdf" onClick={()=>exportPdf(title,rows)}><Printer/>PDF</button></div>}
function movementRows(rows:Movement[],state:State,kind:"Compra"|"Venta"):ExportRow[]{return rows.map(m=>({Fecha:m.date,[kind==="Compra"?"Proveedor":"Cliente"]:partyName(m,state),Producto:`${productName(m,state)} · ${m.quantity} ${m.unit}`,"Forma de pago":m.paymentMethod,Total:money(m.total),Abono:money(m.paid),Saldo:money(m.total-m.paid)}))}
function activityRows(rows:Movement[],state:State):ExportRow[]{return rows.map(m=>({Fecha:m.date,"Cliente / Proveedor":partyName(m,state),Producto:`${productName(m,state)} · ${m.quantity} ${m.unit}`,"Forma de pago":m.paymentMethod,Total:money(m.total),Abono:money(m.paid),Saldo:money(m.total-m.paid)}))}
function accountRows(rows:Movement[],state:State,kind:"Compra"|"Venta"):ExportRow[]{return rows.map(m=>({Fecha:m.date,[kind==="Compra"?"Proveedor":"Cliente"]:partyName(m,state),Producto:`${productName(m,state)} · ${m.quantity} ${m.unit}`,"Forma de pago":m.paymentMethod,Total:money(m.total),Abono:money(m.paid),Saldo:money(m.total-m.paid),Usuario:m.user}))}
function Dashboard({totals,state,onNavigate,onOpenProduct}:{totals:Record<string,number>;state:State;onNavigate:(section:Section)=>void;onOpenProduct:(id:string)=>void}){
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
  <section className="dashboard-stack"><article className="surface recent-surface"><div className="surface-title"><div><p className="eyebrow">ÚLTIMOS MOVIMIENTOS</p><h2>Actividad reciente</h2></div><div className="surface-actions"><ExportActions title="Actividad-reciente" rows={report}/>{state.movements.length>0&&<button className="text-button" onClick={()=>onNavigate(state.movements[0].kind==="Venta"?"ventas":"compras")}>Ver detalle <ArrowRight size={16}/></button>}</div></div><RecentMovements rows={state.movements.slice(0,8)} state={state}/></article>
  <article className="surface alert-panel"><div className="surface-title"><div><p className="eyebrow coral-text">INVENTARIO</p><h2><AlertTriangle/>Alertas de stock</h2></div><button className="text-button" onClick={()=>{onOpenProduct("");onNavigate("inventario")}}>Ver inventario <ArrowRight size={16}/></button></div><div className="stock-alerts">{state.products.filter(p=>productValue(p,"unidad","stock")<=productValue(p,"unidad","minimum")||productValue(p,"caja","stock")<=productValue(p,"caja","minimum")).map(p=><button className="stock-alert" key={p.id} onClick={()=>onOpenProduct(p.id)}><div><strong>{p.name}</strong><small>Ver solamente este producto</small></div><span>{productValue(p,"unidad","stock")} un. · {productValue(p,"caja","stock")} cj.</span><ArrowRight size={18}/></button>)}{!state.products.some(p=>productValue(p,"unidad","stock")<=productValue(p,"unidad","minimum")||productValue(p,"caja","stock")<=productValue(p,"caja","minimum"))&&<p className="empty-mini">Sin alertas</p>}</div></article></section></>
}
function RecentMovements({rows,state}:{rows:Movement[];state:State}){return <div className="responsive-table recent-table"><table><thead><tr><th>Fecha</th><th>Cliente / Proveedor</th><th>Producto</th><th>Forma de pago</th><th>Total</th><th>Abono</th><th>Saldo</th></tr></thead><tbody>{rows.map(m=><tr key={m.id}><td data-label="Fecha">{m.date}</td><td data-label="Cliente / Proveedor"><strong>{partyName(m,state)}</strong></td><td data-label="Producto">{productName(m,state)} · {m.quantity} {m.unit}</td><td data-label="Forma de pago">{m.paymentMethod}</td><td data-label="Total"><strong>{money(m.total)}</strong></td><td data-label="Abono">{money(m.paid)}</td><td data-label="Saldo"><span className={`status ${m.total-m.paid<=0?"paid":"pending"}`}>{money(m.total-m.paid)}</span></td></tr>)}{!rows.length&&<tr><td colSpan={7} className="empty-state">Aún no hay movimientos.</td></tr>}</tbody></table></div>}
function Movements({kind,state,onNew}:{kind:"Compra"|"Venta";state:State;onNew:()=>void}){const rows=state.movements.filter(m=>m.kind===kind);return <section className="surface data-surface"><div className="surface-title"><div><p className="eyebrow">DETALLE POR FECHAS</p><h2>{kind}s registradas</h2></div><div className="surface-actions"><ExportActions title={`${kind}s`} rows={movementRows(rows,state,kind)}/><button className="primary-button compact" onClick={onNew}><Plus/>Nueva {kind.toLowerCase()}</button></div></div><MovementTable rows={rows} state={state} kind={kind}/></section>}
function MovementTable({rows,state,kind}:{rows:Movement[];state:State;kind:"Compra"|"Venta"}){const partyLabel=kind==="Compra"?"Proveedor":"Cliente";return <div className="responsive-table"><table><thead><tr><th>Fecha</th><th>{partyLabel}</th><th>Producto</th><th>Forma de pago</th><th>Total</th><th>Abono</th><th>Saldo</th></tr></thead><tbody>{rows.map(m=><tr key={m.id}><td data-label="Fecha">{m.date}</td><td data-label={partyLabel}><strong>{partyName(m,state)}</strong></td><td data-label="Producto">{productName(m,state)} · {m.quantity} {m.unit}</td><td data-label="Forma de pago">{m.paymentMethod}</td><td data-label="Total"><strong>{money(m.total)}</strong></td><td data-label="Abono">{money(m.paid)}</td><td data-label="Saldo"><span className={`status ${m.total-m.paid<=0?"paid":"pending"}`}>{money(m.total-m.paid)}</span></td></tr>)}{!rows.length&&<tr><td colSpan={7} className="empty-state">Aún no hay registros.</td></tr>}</tbody></table></div>}
function Inventory({state,selectedProductId,onSelectProduct}:{state:State;selectedProductId:string|null;onSelectProduct:(id:string|null)=>void}){
 const [filter,setFilter]=useState<"todas"|Presentation>("todas");
 const presentations:Presentation[]=filter==="todas"?["unidad","caja"]:[filter];
 const stats=state.products.map(product=>{
  const sales=state.movements.filter(m=>m.kind==="Venta"&&m.productId===product.id);
  const sold=(presentation:Presentation)=>sales.filter(m=>(m.unit==="caja"?"caja":"unidad")===presentation).reduce((sum,m)=>sum+m.quantity,0);
  const revenue=(presentation:Presentation)=>sales.filter(m=>(m.unit==="caja"?"caja":"unidad")===presentation).reduce((sum,m)=>sum+m.total,0);
  const cost=(presentation:Presentation)=>sales.filter(m=>(m.unit==="caja"?"caja":"unidad")===presentation).reduce((sum,m)=>sum+m.quantity*unitCostForMovement(m,product),0);
  return {product,sold,revenue,cost,profit:(presentation:Presentation)=>revenue(presentation)-cost(presentation)};
 });
 const visibleStats=selectedProductId?stats.filter(s=>s.product.id===selectedProductId):stats;
 const totalProfit=visibleStats.reduce((sum,s)=>sum+presentations.reduce((n,p)=>n+s.profit(p),0),0);
 const totalUnits=visibleStats.reduce((sum,s)=>sum+productValue(s.product,"unidad","stock"),0);
 const totalBoxes=visibleStats.reduce((sum,s)=>sum+productValue(s.product,"caja","stock"),0);
 const movementRows=state.movements.filter(m=>(!selectedProductId||m.productId===selectedProductId)&&(filter==="todas"||(m.unit==="caja"?"caja":"unidad")===filter));
 const report=movementRows.map(m=>{const product=state.products.find(p=>p.id===m.productId);const presentation=m.unit==="caja"?"caja":"unidad";const signed=m.kind==="Compra"?m.quantity:-m.quantity;return {Fecha:m.date,"Cliente / Proveedor":partyName(m,state),Producto:productName(m,state),Unidad:presentation==="unidad"?signed:"—",Caja:presentation==="caja"?signed:"—","Stock del producto · Unidad":product?productValue(product,"unidad","stock"):0,"Stock del producto · Caja":product?productValue(product,"caja","stock"):0}});
 return <section className="inventory-page">
  <div className="inventory-toolbar"><div><p className="eyebrow">CONTROL POR PRESENTACIÓN</p><h2>{selectedProductId?visibleStats[0]?.product.name:"Detalle completo de productos"}</h2><p>{selectedProductId?"Ficha individual del producto seleccionado.":"Stock, costos, precios y rentabilidad real por unidad y por caja."}</p></div><div className="inventory-actions">{selectedProductId&&<button className="secondary-button" onClick={()=>onSelectProduct(null)}>Ver todo el inventario</button>}<label className="filter-select"><span>Ver presentación</span><select value={filter} onChange={e=>setFilter(e.target.value as "todas"|Presentation)}><option value="todas">Todas</option><option value="unidad">Por unidad</option><option value="caja">Por caja</option></select><ChevronDown/></label><ExportActions title={selectedProductId?`Inventario-${visibleStats[0]?.product.name}`:"Inventario-detallado"} rows={report}/></div></div>
  <div className="inventory-kpis"><article><span className="inventory-kpi-icon teal"><Package/></span><div><small>Stock por unidad</small><strong>{totalUnits}</strong></div></article><article><span className="inventory-kpi-icon blue"><Boxes/></span><div><small>Stock por caja</small><strong>{totalBoxes}</strong></div></article><article><span className="inventory-kpi-icon green"><TrendingUp/></span><div><small>Utilidad generada</small><strong>{money(totalProfit)}</strong></div></article></div>
  <div className="inventory-ledger responsive-table"><table><thead><tr><th>Fecha</th><th>Cliente / Proveedor</th><th>Producto</th><th>Unidad</th><th>Caja</th><th>Stock producto · Unidad</th><th>Stock producto · Caja</th></tr></thead><tbody>{movementRows.map(m=>{const product=state.products.find(p=>p.id===m.productId);const presentation=m.unit==="caja"?"caja":"unidad";const signed=m.kind==="Compra"?m.quantity:-m.quantity;return <tr key={m.id}><td data-label="Fecha">{m.date}</td><td data-label="Cliente / Proveedor"><strong>{partyName(m,state)}</strong></td><td data-label="Producto"><button className="inventory-product-link" onClick={()=>onSelectProduct(m.productId)}>{productName(m,state)}</button></td><td data-label="Unidad">{presentation==="unidad"?<span className={`inventory-quantity ${m.kind==="Compra"?"in":"out"}`}>{signed>0?"+":""}{signed}</span>:"—"}</td><td data-label="Caja">{presentation==="caja"?<span className={`inventory-quantity ${m.kind==="Compra"?"in":"out"}`}>{signed>0?"+":""}{signed}</span>:"—"}</td><td data-label="Stock producto · Unidad"><strong>{product?productValue(product,"unidad","stock"):0}</strong></td><td data-label="Stock producto · Caja"><strong>{product?productValue(product,"caja","stock"):0}</strong></td></tr>})}{!movementRows.length&&<tr><td colSpan={7} className="empty-state">Aún no hay movimientos de inventario para esta selección.</td></tr>}</tbody></table></div>
 </section>
}
function Directory({kind,rows,onNew}:{kind:"Cliente"|"Proveedor";rows:Party[];onNew:()=>void}){const report=rows.map(r=>({Nombre:r.name,RUT:r.rut||"Sin RUT",Teléfono:r.phone||"Sin teléfono"}));return <section className="surface data-surface"><div className="surface-title"><div><p className="eyebrow">DIRECTORIO</p><h2>{kind}s registrados</h2></div><div className="surface-actions"><ExportActions title={`${kind}s`} rows={report}/><button className="primary-button compact" onClick={onNew}><Plus/>Agregar</button></div></div><div className="directory-grid">{rows.map(r=><article className="directory-card" key={r.id}><span className="directory-avatar">{r.name.slice(0,2).toUpperCase()}</span><div><strong>{r.name}</strong><small>RUT {r.rut||"Sin RUT"} · {r.phone||"Sin teléfono"}</small></div></article>)}{!rows.length&&<p className="empty-state">Aún no hay registros.</p>}</div></section>}
function Accounts({kind,state,onPay}:{kind:"Compra"|"Venta";state:State;onPay:()=>void}){const rows=state.movements.filter(m=>m.kind===kind&&m.total>m.paid);return <section className="surface data-surface"><div className="surface-title"><div><p className="eyebrow">PAGADOS Y PENDIENTES</p><h2>{kind==="Venta"?"Clientes pendientes de cobrar":"Proveedores pendientes de pagar"}</h2></div><div className="surface-actions"><ExportActions title={kind==="Venta"?"Cuentas-por-cobrar":"Cuentas-por-pagar"} rows={accountRows(rows,state,kind)}/><button className="primary-button compact" onClick={onPay}>Registrar abono</button></div></div><AccountTable rows={rows} state={state} kind={kind}/></section>}
function AccountTable({rows,state,kind}:{rows:Movement[];state:State;kind:"Compra"|"Venta"}){const partyLabel=kind==="Compra"?"Proveedor":"Cliente";return <div className="responsive-table"><table><thead><tr><th>Fecha</th><th>{partyLabel}</th><th>Producto</th><th>Forma de pago</th><th>Total</th><th>Abono</th><th>Saldo</th><th>Usuario</th></tr></thead><tbody>{rows.map(m=><tr key={m.id}><td data-label="Fecha">{m.date}</td><td data-label={partyLabel}><strong>{partyName(m,state)}</strong></td><td data-label="Producto">{productName(m,state)} · {m.quantity} {m.unit}</td><td data-label="Forma de pago">{m.paymentMethod}</td><td data-label="Total"><strong>{money(m.total)}</strong></td><td data-label="Abono">{money(m.paid)}</td><td data-label="Saldo"><span className={`status ${m.total-m.paid<=0?"paid":"pending"}`}>{money(m.total-m.paid)}</span></td><td data-label="Usuario">{m.user}</td></tr>)}{!rows.length&&<tr><td colSpan={8} className="empty-state">Aún no hay registros pendientes.</td></tr>}</tbody></table></div>}
function partyName(m:Movement,s:State){return [...s.clients,...s.providers].find(p=>p.id===m.partyId)?.name||"Sin identificar"}function productName(m:Movement,s:State){return s.products.find(p=>p.id===m.productId)?.name||"Producto"}

function Modal({kind,state,user,onClose,onSave}:{kind:"Compra"|"Venta"|"Cliente"|"Proveedor"|"Pago";state:State;user:string;onClose:()=>void;onSave:(s:State)=>void}){
 const [productId,setProductId]=useState(state.products[0]?.id||"");const product=state.products.find(p=>p.id===productId);const [presentation,setPresentation]=useState<Presentation>("unidad");const [qty,setQty]=useState(1);const [price,setPrice]=useState(()=>product?productValue(product,"unidad",kind==="Compra"?"buy":"sell"):0);const [method,setMethod]=useState<Movement["paymentMethod"]>("Transferencia");
 function changeProduct(nextId:string){setProductId(nextId);const next=state.products.find(p=>p.id===nextId);setPrice(next?productValue(next,presentation,kind==="Compra"?"buy":"sell"):0)}
 function changePresentation(next:Presentation){setPresentation(next);setPrice(product?productValue(product,next,kind==="Compra"?"buy":"sell"):0)}
 function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const fd=new FormData(e.currentTarget);
  if(kind==="Cliente"||kind==="Proveedor"){const row={id:crypto.randomUUID(),name:String(fd.get("name")),rut:String(fd.get("rut")),phone:String(fd.get("phone"))};onSave({...state,[kind==="Cliente"?"clients":"providers"]:[...(kind==="Cliente"?state.clients:state.providers),row]});return}
  if(kind==="Pago"){const id=String(fd.get("movement"));const amount=Number(fd.get("amount"));onSave({...state,movements:state.movements.map(m=>m.id===id?{...m,paid:Math.min(m.total,m.paid+amount),user}:m)});return}
  const partyId=String(fd.get("party"));const total=qty*price;const paid=method==="Crédito"?Number(fd.get("paid")||0):total;const currentCost=product?productValue(product,presentation,"buy"):0;const m:Movement={id:crypto.randomUUID(),kind,date:String(fd.get("date")),partyId,productId,quantity:qty,unit:presentation,price,total,paymentMethod:method,paid,user,cost:kind==="Venta"?currentCost:price};
  onSave({...state,products:state.products.map(p=>{if(p.id!==productId)return p;const delta=kind==="Compra"?qty:-qty;return presentation==="unidad"?{...p,stockUnit:productValue(p,"unidad","stock")+delta,buyUnit:kind==="Compra"?price:productValue(p,"unidad","buy"),sellUnit:kind==="Venta"?price:productValue(p,"unidad","sell")}:{...p,stockBox:productValue(p,"caja","stock")+delta,buyBox:kind==="Compra"?price:productValue(p,"caja","buy"),sellBox:kind==="Venta"?price:productValue(p,"caja","sell")}}),movements:[m,...state.movements]});
 }
 const pending=state.movements.filter(m=>m.total>m.paid);
 return <div className="modal-layer" onMouseDown={onClose}><div className="modal-card" onMouseDown={e=>e.stopPropagation()}><div className="modal-heading"><div><p className="eyebrow">NUEVO REGISTRO</p><h2>{kind==="Pago"?"Registrar pago o abono":`Registrar ${kind.toLowerCase()}`}</h2></div><button className="icon-button" onClick={onClose}><X/></button></div><form onSubmit={submit}>
  {(kind==="Cliente"||kind==="Proveedor")?<><label>Nombre<input name="name" required/></label><div className="form-grid"><label>RUT<input name="rut"/></label><label>Teléfono<input name="phone"/></label></div></>:kind==="Pago"?<><label>Cuenta pendiente<select name="movement">{pending.map(m=><option key={m.id} value={m.id}>{partyName(m,state)} · {money(m.total-m.paid)}</option>)}</select></label><label>Monto del abono<input name="amount" type="number" min="1" required/></label></>:<><div className="form-grid"><label>Fecha<input name="date" type="date" defaultValue={dateToday()} required/></label><label>{kind==="Venta"?"Cliente":"Proveedor"}<select name="party" required>{(kind==="Venta"?state.clients:state.providers).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label></div><div className="form-grid"><label>Producto<select value={productId} onChange={e=>changeProduct(e.target.value)}>{state.products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>Presentación<select value={presentation} onChange={e=>changePresentation(e.target.value as Presentation)}><option value="unidad">Unidad</option><option value="caja">Caja</option></select></label></div><div className="form-grid"><label>Cantidad<input type="number" min="0.01" step="0.01" value={qty} onChange={e=>setQty(Number(e.target.value))}/></label><label>Precio por {presentation}<input type="number" min="0" value={price} onChange={e=>setPrice(Number(e.target.value))}/></label></div><label>Forma de pago<select value={method} onChange={e=>setMethod(e.target.value as Movement["paymentMethod"])}><option>Transferencia</option><option>Efectivo</option><option>Crédito</option></select></label>{method==="Crédito"&&<label>Abono inicial<input name="paid" type="number" min="0" defaultValue="0"/></label>}<div className="sale-total"><span>Total</span><strong>{money(qty*price)}</strong></div></>}
  <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button className="primary-button" type="submit">Guardar</button></div>
 </form></div></div>
}
