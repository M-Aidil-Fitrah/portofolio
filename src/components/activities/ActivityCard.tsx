"use client";

import { usePathname } from "next/navigation";
import { TransitionLink } from "@/components/layout/TransitionLink";
import { ActivityMedia } from "@/components/activities/ActivityMedia";
import { LikeButton } from "@/components/activities/LikeButton";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { ActivityPost } from "@/lib/activities";

export function formatActivityDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${iso}T00:00:00`));
}

/** One feed entry. The whole card is the link to the detail page (same
 * pattern as the Works panels); like is a nested non-navigating control. */
export function ActivityCard({
  post,
  featured = false,
}: {
  post: ActivityPost;
  featured?: boolean;
}) {
  const { t, locale } = useLocale();
  const pathname = usePathname();
  const base = pathname.startsWith("/en") ? "/en/activities" : "/activities";

  return (
    <TransitionLink
      href={`${base}/${post.slug}`}
      label={post.title[locale]}
      data-cursor={`${t.activities.read} — ${post.title[locale]}`}
      className={`activity-card group flex flex-col gap-4 border-t border-hairline py-8 ${
        featured ? "sm:flex-row sm:gap-10" : ""
      }`}
    >
      <div className={featured ? "sm:w-1/2" : ""}>
        <div className="relative">
          <ActivityMedia
            media={post.media[0] ?? { type: "image", alt: post.title.en }}
            index={1}
            className={featured ? "aspect-[16/9]" : "aspect-[16/9] max-w-2xl"}
          />
          {post.media.length > 1 && (
            <span className="absolute right-4 top-4 rounded-pill border border-hairline bg-ink/70 px-3 py-1 font-mono text-[11px] tracking-widest text-foreground">
              +{post.media.length - 1}
            </span>
          )}
          {post.pinned && (
            <span className="absolute left-4 top-4 rounded-pill bg-volt px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-ink">
              {t.activities.pinned}
            </span>
          )}
        </div>
      </div>

      <div className={`flex flex-col gap-3 ${featured ? "sm:w-1/2" : ""}`}>
        <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] uppercase tracking-widest text-muted">
          <span className="text-volt">{t.activities.filters[post.category]}</span>
          <span>{formatActivityDate(post.date, locale)}</span>
          {post.progress && (
            <span className="rounded-pill border border-hairline px-2.5 py-0.5">
              {t.activities.progress[post.progress]}
            </span>
          )}
        </div>

        <h3
          className={`font-semibold uppercase leading-tight tracking-tight transition-colors group-hover:text-volt ${
            featured ? "text-2xl sm:text-4xl" : "text-xl sm:text-2xl"
          }`}
        >
          {post.title[locale]}
        </h3>

        <p className="line-clamp-2 max-w-xl text-sm leading-relaxed text-muted">
          {post.caption[locale]}
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-x-6 gap-y-3">
          <LikeButton slug={post.slug} seed={post.likes} />
          <span className="font-mono text-xs uppercase tracking-widest text-muted">
            {post.comments.length} {t.activities.commentsLabel}
          </span>
          <span className="flex flex-wrap gap-2 font-mono text-[11px] uppercase tracking-widest text-muted">
            {post.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-pill border border-hairline px-2.5 py-0.5">
                {tag}
              </span>
            ))}
          </span>
        </div>
      </div>
    </TransitionLink>
  );
}
