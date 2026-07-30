"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityMedia } from "@/components/activities/ActivityMedia";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { MediaAsset } from "@/lib/activities";

const INLINE_MEDIA_LIMIT = 3;
const SWIPE_THRESHOLD = 48;

export function ActivityGallery({
  media,
  title,
}: {
  media: MediaAsset[];
  title: string;
}) {
  const { t, locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef<number | null>(null);

  const show = (index: number) => {
    setActiveIndex(index);
    setOpen(true);
  };
  const close = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);
  const previous = useCallback(
    () =>
      setActiveIndex(
        (current) => (current - 1 + media.length) % media.length
      ),
    [media.length]
  );
  const next = useCallback(
    () => setActiveIndex((current) => (current + 1) % media.length),
    [media.length]
  );

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowLeft") previous();
      if (event.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [close, next, open, previous]);

  if (media.length === 0) return null;

  const active = media[activeIndex];
  const activeCaption =
    active.caption?.[locale] ||
    `${title} — ${String(activeIndex + 1).padStart(2, "0")}`;

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
            ref={index === 0 ? triggerRef : undefined}
            type="button"
            onClick={() => show(index)}
            aria-label={`${t.activities.gallery.openItem} ${index + 1}`}
            data-detail-media
            className={`group relative min-w-0 text-left ${
              index === 0
                ? "col-span-2 sm:col-span-2 sm:row-span-2"
                : ""
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
        {t.activities.gallery.viewAll.replace(
          "{count}",
          String(media.length)
        )}
      </button>

      {open && active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t.activities.gallery.dialogTitle}
          data-gallery-dialog
          data-gallery-index={activeIndex}
          data-gallery-total={media.length}
          onClick={(event) => {
            if (event.target === event.currentTarget) close();
          }}
          onPointerDown={(event) => {
            if (event.pointerType !== "touch") return;
            touchStartX.current = event.clientX;
          }}
          onPointerUp={(event) => {
            if (event.pointerType !== "touch") return;
            if (touchStartX.current === null) return;
            const distance = event.clientX - touchStartX.current;
            touchStartX.current = null;
            if (Math.abs(distance) < SWIPE_THRESHOLD) return;
            if (distance > 0) previous();
            else next();
          }}
          className="fixed inset-0 z-[130] flex min-h-0 touch-pan-y flex-col bg-ink/97 px-4 py-4 backdrop-blur-sm sm:px-6 sm:py-6"
        >
          <div className="flex shrink-0 items-center justify-between gap-5 border-b border-hairline pb-4">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-volt">
                {t.activities.gallery.dialogTitle}
              </p>
              <p
                aria-live="polite"
                className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted"
              >
                {t.activities.gallery.position
                  .replace("{current}", String(activeIndex + 1))
                  .replace("{total}", String(media.length))}
              </p>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={close}
              className="btn-fill inline-flex h-10 items-center rounded-pill border border-hairline px-5 font-mono text-[10px] uppercase tracking-widest text-foreground"
            >
              {t.activities.gallery.close}
            </button>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center py-4 sm:py-6">
            <div
              data-gallery-active-media
              className="h-full w-full max-w-[1500px]"
            >
              <ActivityMedia
                key={active.id ?? `${active.type}-${activeIndex}`}
                media={active}
                index={activeIndex + 1}
                fit="contain"
                sizes="100vw"
                className="h-full rounded-none border-0 bg-transparent"
              />
            </div>

            {media.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={previous}
                  aria-label={t.activities.gallery.previous}
                  className="absolute left-0 grid h-11 w-11 place-items-center rounded-full border border-hairline bg-ink/80 font-mono text-lg text-foreground backdrop-blur-sm sm:left-2"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={next}
                  aria-label={t.activities.gallery.next}
                  className="absolute right-0 grid h-11 w-11 place-items-center rounded-full border border-hairline bg-ink/80 font-mono text-lg text-foreground backdrop-blur-sm sm:right-2"
                >
                  →
                </button>
              </>
            )}
          </div>

          <div className="shrink-0 border-t border-hairline pt-4">
            <p className="mx-auto max-w-3xl text-center text-sm leading-relaxed text-muted">
              {activeCaption}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
