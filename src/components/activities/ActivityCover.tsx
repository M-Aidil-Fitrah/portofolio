import Image from "next/image";
import type { ActivityCover as ActivityCoverData } from "@/lib/activities";

export function ActivityCover({
  cover,
  title,
  category,
  date,
  locale,
  sizes = "(max-width: 1100px) 100vw, 1100px",
  className = "",
  priority = false,
}: {
  cover: ActivityCoverData;
  title: string;
  category: string;
  date: string;
  locale: "en" | "id";
  sizes?: string;
  className?: string;
  priority?: boolean;
}) {
  const renderedImage = cover.renderedSrc?.[locale];
  const image = renderedImage ?? cover.src;

  return (
    <div
      data-activity-cover
      data-cover-template={cover.template}
      className={`relative aspect-video overflow-hidden border border-hairline bg-surface ${className}`}
    >
      {image && (
        <Image
          src={image}
          alt={cover.alt}
          fill
          sizes={sizes}
          priority={priority}
          unoptimized={
            image.startsWith("data:") ||
            image.startsWith("blob:") ||
            image.includes("/api/v1/assets/")
          }
          className="object-cover"
        />
      )}

      {!renderedImage && cover.template === "editorial" && (
        <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-ink via-ink/25 to-transparent p-[5%]">
          <div className="flex items-center justify-between font-mono text-[clamp(0.45rem,1.2vw,0.75rem)] uppercase tracking-[0.22em] text-white/80">
            <span>{category}</span>
            <span>{date}</span>
          </div>
          <h3 className="max-w-[86%] text-[clamp(1rem,4vw,3.2rem)] font-semibold uppercase leading-[0.92] tracking-tight text-white">
            {title}
          </h3>
        </div>
      )}

      {!renderedImage && cover.template === "project" && (
        <div className="absolute inset-0 bg-ink/45 p-[4.5%] text-white">
          <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:12.5%_25%]" />
          <div className="relative flex h-full flex-col justify-between border border-white/60 p-[4%]">
            <span className="font-mono text-[clamp(0.45rem,1.2vw,0.75rem)] uppercase tracking-[0.24em] text-volt">
              {category} / {date}
            </span>
            <h3 className="max-w-[80%] text-[clamp(1rem,3.8vw,3rem)] font-semibold uppercase leading-[0.94] tracking-tight">
              {title}
            </h3>
            <span className="absolute bottom-[4%] right-[4%] h-[12%] w-[7%] border-b border-r border-volt" />
          </div>
        </div>
      )}

      {!renderedImage && cover.template === "achievement" && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-ink/90 via-ink/45 to-transparent p-[5%] text-center text-white">
          <div className="absolute inset-[5%] border border-volt/80" />
          <div className="relative max-w-[82%]">
            <span className="font-mono text-[clamp(0.45rem,1.2vw,0.75rem)] uppercase tracking-[0.28em] text-volt">
              {category} / {date}
            </span>
            <h3 className="mt-[5%] text-[clamp(1rem,4vw,3.2rem)] font-semibold uppercase leading-[0.92] tracking-tight">
              {title}
            </h3>
          </div>
          <span className="absolute left-[4%] top-[4%] h-[12%] w-[7%] border-l border-t border-volt" />
          <span className="absolute bottom-[4%] right-[4%] h-[12%] w-[7%] border-b border-r border-volt" />
        </div>
      )}

      {!renderedImage &&
        cover.template === "custom" &&
        cover.customOverlaySrc && (
          <Image
            src={cover.customOverlaySrc}
            alt=""
            aria-hidden="true"
            fill
            sizes={sizes}
            unoptimized
            className="object-fill"
          />
        )}
    </div>
  );
}
