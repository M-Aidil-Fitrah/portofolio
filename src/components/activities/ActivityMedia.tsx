import Image from "next/image";
import type { MediaAsset } from "@/lib/activities";
import { isApiAssetUrl } from "@/lib/api/fetcher";

/** One media frame — real image/video when `src` exists, otherwise the
 * designed placeholder in the same visual language as ProjectCover. Videos
 * without a source render the placeholder with a play glyph so the frame
 * still communicates its type. */
export function ActivityMedia({
  media,
  index,
  sizes = "(max-width: 1024px) 100vw, 50vw",
  className = "",
  videoControls = true,
  fit = "cover",
}: {
  media: MediaAsset;
  /** 1-based position, shown in the placeholder frame. */
  index: number;
  sizes?: string;
  className?: string;
  videoControls?: boolean;
  fit?: "cover" | "contain";
}) {
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-card border border-hairline bg-surface ${className}`}
    >
      {media.src ? (
        media.type === "video" ? (
          <video
            src={media.src}
            poster={media.poster}
            controls={videoControls}
            playsInline
            preload="metadata"
            className={`h-full w-full ${
              fit === "contain" ? "object-contain" : "object-cover"
            }`}
          />
        ) : (
          <Image
            src={media.src}
            alt={media.alt}
            fill
            sizes={sizes}
            loading="lazy"
            unoptimized={
              media.src.startsWith("blob:") ||
              media.src.startsWith("data:") ||
              isApiAssetUrl(media.src)
            }
            className={fit === "contain" ? "object-contain" : "object-cover"}
          />
        )
      ) : (
        <>
          <span
            aria-hidden="true"
            className="pointer-events-none select-none font-mono text-[14vw] leading-none text-hairline sm:text-[7vw]"
          >
            {String(index).padStart(2, "0")}
          </span>
          {media.type === "video" && (
            <span
              aria-hidden="true"
              className="absolute flex h-14 w-14 items-center justify-center rounded-full border border-hairline bg-ink/60 text-volt"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="ml-1 h-5 w-5">
                <path d="M8 5.5v13l11-6.5L8 5.5Z" />
              </svg>
            </span>
          )}
          <span className="absolute bottom-4 left-4 font-mono text-[11px] uppercase tracking-widest text-muted">
            {media.alt}
          </span>
        </>
      )}
    </div>
  );
}
