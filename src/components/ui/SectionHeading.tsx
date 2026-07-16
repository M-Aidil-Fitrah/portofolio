interface SectionHeadingProps {
  index: string;
  label: string;
  meta?: string;
}

export function SectionHeading({ index, label, meta }: SectionHeadingProps) {
  return (
    <div className="flex items-center justify-between gap-3 font-mono text-xs uppercase tracking-widest text-muted">
      <div className="flex items-center gap-3">
        <span className="text-volt">{index}</span>
        <span>{label}</span>
      </div>
      {meta && <span>{meta}</span>}
    </div>
  );
}
