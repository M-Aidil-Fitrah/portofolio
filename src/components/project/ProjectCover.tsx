import Image from "next/image";
import type { Project } from "@/lib/projects";

/** Real screenshot when `project.cover` is set, else a designed placeholder. */
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
  /** Fill the parent box instead of the fixed 16:9 ratio. */
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
