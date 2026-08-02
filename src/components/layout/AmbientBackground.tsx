import { GridLines } from "@/components/ui/GridLines";

/** Fixed editorial backdrop for every page: column lines and tonal bands. */
export function AmbientBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <GridLines columns={5} className="opacity-[0.04]" />
    </div>
  );
}
