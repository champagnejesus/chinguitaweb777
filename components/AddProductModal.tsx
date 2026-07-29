"use client";
import { FormEvent, useState } from "react";
import { X } from "lucide-react";
import { Product } from "../lib/types";

export function AddProductModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (data: { products: Product[] }) => void;
}) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("kg");
  const [category, setCategory] = useState("");
  const [buyUnit, setBuyUnit] = useState(0);
  const [buyBox, setBuyBox] = useState(0);
  const [sellUnit, setSellUnit] = useState(0);
  const [sellBox, setSellBox] = useState(0);
  const [minimumUnit, setMinimumUnit] = useState(0);
  const [minimumBox, setMinimumBox] = useState(0);

  function submit(e: FormEvent) {
    e.preventDefault();
    const product: Product = {
      id: crypto.randomUUID(),
      name,
      stock: 0,
      unit,
      buy: buyUnit,
      sell: sellUnit,
      minimum: minimumUnit,
      category: category || undefined,
      stockUnit: 0,
      stockBox: 0,
      buyUnit,
      buyBox,
      sellUnit,
      sellBox,
      minimumUnit,
      minimumBox,
    };
    onSave({ products: [product] });
  }

  return (
    <div className="modal-layer" onMouseDown={onClose}>
      <div className="modal-card" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-heading">
          <div>
            <p className="eyebrow">NUEVO PRODUCTO</p>
            <h2>Agregar producto al inventario</h2>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X />
          </button>
        </div>
        <form onSubmit={submit}>
          <label>
            Nombre del producto
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Ej: Salmón fresco"
            />
          </label>
          <div className="form-grid">
            <label>
              Unidad de medida
              <select value={unit} onChange={(e) => setUnit(e.target.value)}>
                <option value="kg">kilogramo (kg)</option>
                <option value="unidad">unidad</option>
              </select>
            </label>
            <label>
              Categoría (opcional)
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ej: Pescados, Mariscos"
              />
            </label>
          </div>
          <div className="form-grid">
            <label>
              Precio Compra Unidad
              <input
                type="number"
                min="0"
                value={buyUnit}
                onChange={(e) => setBuyUnit(Number(e.target.value))}
              />
            </label>
            <label>
              Precio Compra Caja
              <input
                type="number"
                min="0"
                value={buyBox}
                onChange={(e) => setBuyBox(Number(e.target.value))}
              />
            </label>
          </div>
          <div className="form-grid">
            <label>
              Precio Venta Unidad
              <input
                type="number"
                min="0"
                value={sellUnit}
                onChange={(e) => setSellUnit(Number(e.target.value))}
              />
            </label>
            <label>
              Precio Venta Caja
              <input
                type="number"
                min="0"
                value={sellBox}
                onChange={(e) => setSellBox(Number(e.target.value))}
              />
            </label>
          </div>
          <div className="form-grid">
            <label>
              Stock Mínimo Unidad
              <input
                type="number"
                min="0"
                value={minimumUnit}
                onChange={(e) => setMinimumUnit(Number(e.target.value))}
              />
            </label>
            <label>
              Stock Mínimo Caja
              <input
                type="number"
                min="0"
                value={minimumBox}
                onChange={(e) => setMinimumBox(Number(e.target.value))}
              />
            </label>
          </div>
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancelar
            </button>
            <button className="primary-button" type="submit" disabled={!name.trim()}>
              Agregar producto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
