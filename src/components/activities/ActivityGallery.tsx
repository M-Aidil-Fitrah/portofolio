"use client";

import { ActivityMedia } from "@/components/activities/ActivityMedia";
import { useLocale } from "@/components/providers/LocaleProvider";
import { usePreview } from "@/components/providers/PreviewProvider";
import type { MediaAsset } from "@/lib/activities";

const INLINE_MEDIA_LIMIT = 3;

export function ActivityGallery({
  media,
  title,
}: {
  media: MediaAsset[];
  title: string;
}) {
  const { t, locale } = useLocale();
  const { openPreviewGroup } = usePreview();

  if (media.length === 0) return null;

  const show = (index: number) =>
    openPreviewGroup(
      media.map((item, position) => ({
        src: item.src,
        type: item.type,
        poster: item.type === "video" ? item.poster : undefined,
        alt: item.alt,
        caption:
          item.caption?.[locale] ||
          `${title} — ${String(position + 1).padStart(2, "0")}`,
        index: String(position + 1).padStart(2, "0"),
      })),
      index,
      t.activities.gallery.dialogTitle,
    );

  return (
    <>
      <div
        data-activity-gallery
        data-gallery-total={media.length}
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4"
      >
        {media.slice(0, INLINE_MEDIA_LIMIT).map((item, index) => (
          <button
            key={item.id ?? `${item.type}-${index}`}
            type="button"
            onClick={() => show(index)}
            data-cursor={t.preview.open}
            aria-label={`${t.activities.gallery.openItem} ${index + 1}`}
            data-detail-media
            className={`group relative min-w-0 text-left ${
              index === 0 ? "col-span-2 sm:col-span-2 sm:row-span-2" : ""
            }`}
          >
            <ActivityMedia
              media={item}
              index={index + 1}
              videoControls={false}
              sizes={
                index === 0
                  ? "(max-width: 640px) 100vw, 66vw"
                  : "(max-width: 640px) 50vw, 33vw"
              }
              className={
                index === 0
                  ? "aspect-video h-full"
                  : "aspect-square sm:aspect-[4/3]"
              }
            />
            <span className="absolute bottom-3 right-3 rounded-pill border border-hairline bg-ink/80 px-2.5 py-1 font-mono text-[9px] uppercase tracking-widest text-muted backdrop-blur-sm">
              {String(index + 1).padStart(2, "0")}
            </span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => show(0)}
        className="btn-fill mt-5 inline-flex h-11 items-center rounded-pill border border-hairline px-5 font-mono text-[10px] uppercase tracking-widest text-foreground"
      >
        {t.activities.gallery.viewAll.replace("{count}", String(media.length))}
      </button>
    </>
  );
}
