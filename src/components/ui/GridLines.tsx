interface GridLinesProps {
  columns?: number;
  className?: string;
}

/** Decorative Swiss-grid column dividers — thin hairlines spanning the
 * full height of the nearest `relative` ancestor. Purely presentational;
 * stack content above it with `relative z-10`. */
export function GridLines({ columns = 4, className }: GridLinesProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 grid ${className ?? ""}`}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: columns }).map((_, i) => (
        <div
          key={i}
          className={i < columns - 1 ? "border-r border-hairline" : ""}
        />
      ))}
    </div>
  );
}
