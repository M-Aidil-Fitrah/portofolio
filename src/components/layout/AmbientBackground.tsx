import { GridLines } from "@/components/ui/GridLines";

/**
 * One persistent, viewport-fixed editorial backdrop shared by every page:
 * column lines plus a few static tonal bands. It stays deliberately flat so
 * the page keeps its dark print-system feel without decorative glow shapes.
 */
export function AmbientBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <GridLines columns={5} className="opacity-[0.04]" />
      <div className="absolute inset-x-0 top-[8%] h-px bg-hairline/60" />
    </div>
  );
}
