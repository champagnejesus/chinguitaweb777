import { Fish } from "lucide-react";

export function Brand() {
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
