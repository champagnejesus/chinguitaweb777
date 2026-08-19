"use client";
import { Component, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="login-page">
          <div
            className="login-card"
            style={{ textAlign: "center", maxWidth: 480 }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "var(--coral-100)",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 20px",
                color: "var(--coral-600)",
              }}
            >
              <AlertTriangle size={32} />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
              Algo salió mal
            </h2>
            <p
              style={{
                color: "var(--slate-600)",
                fontSize: 14,
                lineHeight: 1.6,
                marginBottom: 24,
              }}
            >
              La aplicación encontró un error inesperado. Podés intentar
              recargar la página.
            </p>
            <button
              className="primary-button"
              onClick={() => window.location.reload()}
              style={{ width: "100%" }}
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
