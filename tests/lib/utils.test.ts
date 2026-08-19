import { describe, it, expect } from "vitest";
import {
  money,
  dateToday,
  productValue,
  unitCostForMovement,
  partyName,
  productName,
  computeTrend,
  formatTrend,
} from "../../lib/utils";
import { Product, Movement, State } from "../../lib/types";

describe("money", () => {
  it("formats zero as CLP", () => {
    expect(money(0)).toBe("$0");
  });
  it("formats positive values", () => {
    expect(money(1500)).toBe("$1.500");
  });
  it("formats large values", () => {
    expect(money(1250000)).toBe("$1.250.000");
  });
});

describe("dateToday", () => {
  it("returns YYYY-MM-DD format", () => {
    const result = dateToday();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("productValue", () => {
  const product: Product = {
    id: "p1",
    name: "Salmón",
    stock: 10,
    unit: "kg",
    buy: 5000,
    sell: 8000,
    minimum: 5,
    stockUnit: 20,
    stockBox: 30,
    buyUnit: 5000,
    buyBox: 4500,
    sellUnit: 8000,
    sellBox: 7500,
    minimumUnit: 5,
    minimumBox: 10,
  };

  it("returns stored unit values when available", () => {
    expect(productValue(product, "unidad", "stock")).toBe(20);
    expect(productValue(product, "unidad", "buy")).toBe(5000);
  });

  it("returns stored box values when available", () => {
    expect(productValue(product, "caja", "stock")).toBe(30);
    expect(productValue(product, "caja", "buy")).toBe(4500);
  });

  it("falls back for legacy products without stored values", () => {
    const legacy: Product = {
      id: "p2",
      name: "Congrio",
      stock: 15,
      unit: "kg",
      buy: 3000,
      sell: 5000,
      minimum: 3,
    };
    expect(productValue(legacy, "unidad", "stock")).toBe(15);
    expect(productValue(legacy, "unidad", "buy")).toBe(3000);
    expect(productValue(legacy, "caja", "stock")).toBe(0);
  });
});

describe("unitCostForMovement", () => {
  const product: Product = {
    id: "p1",
    name: "Salmón",
    stock: 10,
    unit: "kg",
    buy: 5000,
    sell: 8000,
    minimum: 5,
    buyUnit: 5000,
    buyBox: 4500,
  };

  it("uses stored cost when available", () => {
    const m: Movement = {
      id: "m1",
      kind: "Venta",
      date: "2026-07-01",
      partyId: "c1",
      productId: "p1",
      quantity: 5,
      unit: "unidad",
      price: 8000,
      total: 40000,
      paymentMethod: "Efectivo",
      paid: 40000,
      user: "Test",
      cost: 4800,
    };
    expect(unitCostForMovement(m, product)).toBe(4800);
  });

  it("calculates from product buy price for unidad", () => {
    const m: Movement = {
      id: "m2",
      kind: "Venta",
      date: "2026-07-01",
      partyId: "c1",
      productId: "p1",
      quantity: 5,
      unit: "unidad",
      price: 8000,
      total: 40000,
      paymentMethod: "Efectivo",
      paid: 40000,
      user: "Test",
    };
    expect(unitCostForMovement(m, product)).toBe(5000);
  });

  it("calculates from product buy price for caja", () => {
    const m: Movement = {
      id: "m3",
      kind: "Venta",
      date: "2026-07-01",
      partyId: "c1",
      productId: "p1",
      quantity: 2,
      unit: "caja",
      price: 7500,
      total: 15000,
      paymentMethod: "Efectivo",
      paid: 15000,
      user: "Test",
    };
    expect(unitCostForMovement(m, product)).toBe(4500);
  });
});

describe("partyName", () => {
  const state: State = {
    products: [],
    clients: [{ id: "c1", name: "Juan", rut: "", phone: "" }],
    providers: [{ id: "p1", name: "Proveedor ABC", rut: "", phone: "" }],
    movements: [],
  };

  it("returns client name for Venta", () => {
    const m: Movement = {
      id: "m1",
      kind: "Venta",
      date: "2026-07-01",
      partyId: "c1",
      productId: "x",
      quantity: 1,
      unit: "kg",
      price: 1000,
      total: 1000,
      paymentMethod: "Efectivo",
      paid: 1000,
      user: "Test",
    };
    expect(partyName(m, state)).toBe("Juan");
  });

  it("returns provider name for Compra", () => {
    const m: Movement = {
      id: "m2",
      kind: "Compra",
      date: "2026-07-01",
      partyId: "p1",
      productId: "x",
      quantity: 1,
      unit: "kg",
      price: 1000,
      total: 1000,
      paymentMethod: "Efectivo",
      paid: 1000,
      user: "Test",
    };
    expect(partyName(m, state)).toBe("Proveedor ABC");
  });

  it("returns reason for Ajuste", () => {
    const m: Movement = {
      id: "m3",
      kind: "Ajuste",
      date: "2026-07-01",
      partyId: "",
      productId: "x",
      quantity: -5,
      unit: "kg",
      price: 0,
      total: 0,
      paymentMethod: "Efectivo",
      paid: 0,
      user: "Test",
      reason: "Merma",
    };
    expect(partyName(m, state)).toBe("Merma");
  });
});

describe("productName", () => {
  const state: State = {
    products: [{ id: "p1", name: "Salmón", stock: 0, unit: "kg", buy: 0, sell: 0, minimum: 0 }],
    clients: [],
    providers: [],
    movements: [],
  };

  it("returns product name", () => {
    const m: Movement = {
      id: "m1",
      kind: "Venta",
      date: "2026-07-01",
      partyId: "c1",
      productId: "p1",
      quantity: 1,
      unit: "kg",
      price: 1000,
      total: 1000,
      paymentMethod: "Efectivo",
      paid: 1000,
      user: "Test",
    };
    expect(productName(m, state)).toBe("Salmón");
  });

  it("returns fallback for unknown product", () => {
    const m: Movement = {
      id: "m2",
      kind: "Venta",
      date: "2026-07-01",
      partyId: "c1",
      productId: "unknown",
      quantity: 1,
      unit: "kg",
      price: 1000,
      total: 1000,
      paymentMethod: "Efectivo",
      paid: 1000,
      user: "Test",
    };
    expect(productName(m, state)).toBe("Producto");
  });
});

describe("computeTrend", () => {
  it("calculates positive growth", () => {
    const t = computeTrend(120, 100);
    expect(t.change).toBe(20);
    expect(t.changePercent).toBeCloseTo(20);
  });

  it("calculates negative growth", () => {
    const t = computeTrend(80, 100);
    expect(t.change).toBe(-20);
    expect(t.changePercent).toBeCloseTo(-20);
  });

  it("handles zero previous", () => {
    const t = computeTrend(100, 0);
    expect(t.changePercent).toBe(100);
  });

  it("handles both zero", () => {
    const t = computeTrend(0, 0);
    expect(t.changePercent).toBe(0);
  });
});

describe("formatTrend", () => {
  it("formats positive trend", () => {
    const t = computeTrend(120, 100);
    expect(formatTrend(t)).toBe("+20.0% vs mes anterior");
  });

  it("formats negative trend", () => {
    const t = computeTrend(80, 100);
    expect(formatTrend(t)).toBe("-20.0% vs mes anterior");
  });
});
