export type Section =
  | "resumen"
  | "compras"
  | "ventas"
  | "inventario"
  | "clientes"
  | "proveedores"
  | "cobrar"
  | "pagar"
  | "auditoria";

export type Presentation = "unidad" | "caja";

export interface Product {
  id: string;
  name: string;
  stock: number;
  unit: string;
  buy: number;
  sell: number;
  minimum: number;
  category?: string;
  stockUnit?: number;
  stockBox?: number;
  buyUnit?: number;
  buyBox?: number;
  sellUnit?: number;
  sellBox?: number;
  minimumUnit?: number;
  minimumBox?: number;
}

export interface Party {
  id: string;
  name: string;
  rut: string;
  phone: string;
}

export interface Movement {
  id: string;
  kind: "Compra" | "Venta" | "Ajuste";
  date: string;
  partyId: string;
  productId: string;
  quantity: number;
  unit: string;
  price: number;
  total: number;
  paymentMethod: "Transferencia" | "Efectivo" | "Crédito";
  paid: number;
  user: string;
  cost?: number;
  reason?: string;
  notes?: string;
}

export interface State {
  products: Product[];
  clients: Party[];
  providers: Party[];
  movements: Movement[];
}

export interface TrendData {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
}

export type ModalKind =
  | "Compra"
  | "Venta"
  | "Cliente"
  | "Proveedor"
  | "Pago"
  | "Ajuste"
  | "EditProducto"
  | "EditCliente"
  | "EditProveedor"
  | "EditMovimiento"
  | "AddProducto"
  | "ImportCsv";

export type ExportRow = Record<string, string | number>;
