import type { Project } from "@/lib/projects";

/** Designed placeholder cover — used until real project screenshots are
 * dropped into public/assets/projects/{slug}/. No image request, no CLS.
 * Accepts a ref (React 19 ref-as-prop) so callers can drive FLIP-style
 * transforms on the element directly, and a className so callers can layer
 * on sizing constraints (e.g. a max-height so it never forces its parent
 * to overflow inside a fixed-height pinned panel). */
export function ProjectCover({
  project,
  ref,
  className = "",
}: {
  project: Project;
  ref?: React.Ref<HTMLDivElement>;
  className?: string;
}) {
  return (
    <div
      ref={ref}
      className={`relative flex aspect-[16/9] w-full items-center justify-center overflow-hidden border border-hairline bg-surface ${className}`}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none select-none font-mono text-[18vw] leading-none text-hairline sm:text-[12vw]"
      >
        {project.index}
      </span>
      <span className="absolute bottom-6 left-6 font-mono text-xs uppercase tracking-widest text-muted sm:bottom-10 sm:left-10">
        {project.title} — {project.year}
      </span>
    </div>
  );
}
