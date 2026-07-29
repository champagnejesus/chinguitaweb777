"use client";

export function Spinner({ size = 24 }: { size?: number }) {
  return (
    <div className="spinner" style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M12 2a10 10 0 0 1 10 10" />
      </svg>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="skeleton-table">
      {Array.from({ length: rows }).map((_, i) => (
        <div className="skeleton-row" key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <div className="skeleton-cell" key={j} style={{ width: j === 0 ? "80px" : "100%" }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="skeleton-cards">
      {Array.from({ length: count }).map((_, i) => (
        <div className="skeleton-card" key={i}>
          <div className="skeleton-circle" />
          <div className="skeleton-lines">
            <div className="skeleton-line" style={{ width: "60%" }} />
            <div className="skeleton-line short" />
          </div>
        </div>
      ))}
    </div>
  );
}
