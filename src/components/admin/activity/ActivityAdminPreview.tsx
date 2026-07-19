"use client";

import { useEffect } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { ActivityMedia } from "@/components/activities/ActivityMedia";
import { formatActivityDate } from "@/components/activities/ActivityCard";
import type { ActivityPost } from "@/lib/activities";

export function ActivityAdminPreview({
  post,
  onClose,
}: {
  post: ActivityPost;
  onClose: () => void;
}) {
  const { t, locale } = useLocale();

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.activities.admin.preview}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[130] overflow-y-auto bg-ink/95 px-6 py-12 backdrop-blur-sm sm:px-10"
    >
      <div className="mx-auto max-w-[1000px] rounded-card border border-hairline bg-surface p-6 sm:p-10">
        <div className="flex items-center justify-between gap-6 border-b border-hairline pb-5">
          <p className="font-mono text-xs uppercase tracking-widest text-volt">
            {t.activities.admin.preview} /{" "}
            {t.activities.admin.statuses[post.status]}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="btn-fill inline-flex h-10 items-center rounded-pill border border-hairline px-5 font-mono text-xs uppercase tracking-widest text-foreground"
          >
            {t.activities.admin.closePreview}
          </button>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-muted">
          <span className="text-volt">
            {t.activities.filters[post.category]}
          </span>
          <span>{formatActivityDate(post.date, locale)}</span>
          {post.progress && (
            <span className="rounded-pill border border-hairline px-3 py-1">
              {t.activities.progress[post.progress]}
            </span>
          )}
        </div>
        <h2 className="mt-4 text-3xl font-semibold uppercase leading-tight sm:text-5xl">
          {post.title[locale] || t.activities.admin.untitled}
        </h2>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-foreground/90">
          {post.caption[locale]}
        </p>

        {post.media.length > 0 && (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {post.media.map((media, index) => (
              <ActivityMedia
                key={`${media.alt}-${index}`}
                media={media}
                index={index + 1}
                className={
                  index === 0 ? "aspect-video sm:col-span-2" : "aspect-[4/3]"
                }
              />
            ))}
          </div>
        )}

        <p className="mt-10 max-w-2xl whitespace-pre-line text-base leading-relaxed text-foreground/90">
          {post.body[locale]}
        </p>
        <div className="mt-8 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-pill border border-hairline px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-muted"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
