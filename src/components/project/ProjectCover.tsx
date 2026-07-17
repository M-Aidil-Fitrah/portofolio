import Image from "next/image";
import type { Project } from "@/lib/projects";

/** Real screenshot when `project.cover` is set; otherwise a designed
 * placeholder — used until real project screenshots are dropped into
 * public/assets/projects/{slug}/. No image request, no CLS in the
 * placeholder case. Accepts a ref (React 19 ref-as-prop) so callers can
 * drive FLIP-style transforms on the element directly, and a className so
 * callers can layer on sizing constraints (e.g. a max-height so it never
 * forces its parent to overflow inside a fixed-height pinned panel). */
export function ProjectCover({
  project,
  ref,
  className = "",
  sizes = "(max-width: 1024px) 100vw, 50vw",
  fill = false,
}: {
  project: Project;
  ref?: React.Ref<HTMLDivElement>;
  className?: string;
  sizes?: string;
  /** Skip the fixed 16:9 aspect ratio and just fill the parent box — for
   * callers that already control both dimensions (e.g. a flex-1 slot that
   * must shrink to whatever room is left after fixed-height text). */
  fill?: boolean;
}) {
  return (
    <div
      ref={ref}
      className={`relative flex items-center justify-center overflow-hidden rounded-card border border-hairline bg-surface ${fill ? "h-full w-full" : "aspect-[16/9] w-full"} ${className}`}
    >
      {project.cover ? (
        <Image
          src={project.cover}
          alt={`${project.title} — ${project.year}`}
          fill
          sizes={sizes}
          className="object-cover"
        />
      ) : (
        <>
          <span
            aria-hidden="true"
            className="pointer-events-none select-none font-mono text-[18vw] leading-none text-hairline sm:text-[12vw]"
          >
            {project.index}
          </span>
          <span className="absolute bottom-6 left-6 font-mono text-xs uppercase tracking-widest text-muted sm:bottom-10 sm:left-10">
            {project.title} — {project.year}
          </span>
        </>
      )}
    </div>
  );
}
