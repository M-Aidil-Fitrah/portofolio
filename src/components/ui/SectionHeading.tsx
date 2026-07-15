interface SectionHeadingProps {
  index: string;
  label: string;
}

export function SectionHeading({ index, label }: SectionHeadingProps) {
  return (
    <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-muted">
      <span className="text-volt">{index}</span>
      <span>{label}</span>
    </div>
  );
}
