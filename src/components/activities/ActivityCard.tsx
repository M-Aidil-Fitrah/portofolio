"use client";

import { usePathname } from "next/navigation";
import { ActivityCover } from "@/components/activities/ActivityCover";
import { ActivityMedia } from "@/components/activities/ActivityMedia";
import { TransitionLink } from "@/components/layout/TransitionLink";
import { useLocale } from "@/components/providers/LocaleProvider";
import { TechStackList } from "@/components/ui/TechStack";
import type { ActivityPost } from "@/lib/activities";

export function formatActivityDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${iso}T00:00:00`));
}

function formatCompactActivityDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${iso}T00:00:00`));
}

export function ActivityCard({
  post,
  variant = "grid",
}: {
  post: ActivityPost;
  variant?: "grid" | "featured";
}) {
  const { t, locale } = useLocale();
  const pathname = usePathname();
  const base = pathname.startsWith("/en") ? "/en/activities" : "/activities";
  const previewMedia = post.media[0];
  const title = post.title[locale] || t.activities.admin.untitled;
  const href = `${base}/${post.slug}`;
  const featured = variant === "featured";

  return (
    <article
      data-activity-card
      data-activity-card-variant={variant}
      data-activity-slug={post.slug}
      className={`activity-card group border-t border-hairline ${
        featured
          ? "grid gap-6 py-7 md:grid-cols-[minmax(0,1.45fr)_minmax(260px,0.75fr)] md:items-stretch lg:gap-10 lg:py-9"
          : "flex h-full flex-col py-6"
      }`}
    >
      <TransitionLink
        href={href}
        label={title}
        data-cursor={`${t.activities.read} — ${title}`}
        className={`relative block overflow-hidden rounded-card ${
          featured ? "min-h-0" : ""
        }`}
      >
        {post.cover?.src ? (
          <ActivityCover
            cover={post.cover}
            title={title}
            category={t.activities.filters[post.category]}
            date={post.date}
            locale={locale}
            sizes={
              featured
                ? "(max-width: 767px) 100vw, (max-width: 1200px) 65vw, 700px"
                : "(max-width: 767px) 100vw, 50vw"
            }
            priority={featured}
            className="rounded-card transition-transform duration-500 group-hover:scale-[1.015]"
          />
        ) : previewMedia ? (
          <ActivityMedia
            media={previewMedia}
            index={1}
            videoControls={false}
            sizes={
              featured
                ? "(max-width: 767px) 100vw, (max-width: 1200px) 65vw, 700px"
                : "(max-width: 767px) 100vw, 50vw"
            }
            className="aspect-video rounded-card transition-transform duration-500 group-hover:scale-[1.015]"
          />
        ) : (
          <div className="relative aspect-video overflow-hidden rounded-card border border-hairline bg-surface">
            <span
              aria-hidden="true"
              className="absolute right-5 top-3 font-mono text-[clamp(4rem,12vw,9rem)] leading-none text-hairline"
            >
              {post.date.slice(8, 10)}
            </span>
            <span className="absolute bottom-5 left-5 font-mono text-[10px] uppercase tracking-widest text-muted">
              {t.activities.filters[post.category]}
            </span>
          </div>
        )}
      </TransitionLink>

      <div
        className={`min-w-0 ${
          featured ? "flex flex-col justify-center" : "flex flex-1 flex-col"
        }`}
      >
        <div
          data-activity-card-meta
          className={`${featured ? "mt-0" : "mt-5"} flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[10px] uppercase tracking-widest text-muted`}
        >
          <time dateTime={post.date}>
            {formatCompactActivityDate(post.date, locale)}
          </time>
          <span aria-hidden="true" className="text-hairline">
            /
          </span>
          <span className="text-volt">
            {t.activities.filters[post.category]}
          </span>
        </div>

        <TransitionLink
          href={href}
          label={title}
          data-cursor={`${t.activities.read} — ${title}`}
          className="mt-3 block w-fit"
        >
          <h3
            className={`font-semibold uppercase tracking-tight transition-colors group-hover:text-volt ${
              featured
                ? "text-3xl leading-[1.02] sm:text-4xl lg:text-5xl"
                : "text-2xl leading-tight sm:text-[1.7rem]"
            }`}
          >
            {title}
          </h3>
        </TransitionLink>

        <p
          className={`text-foreground/75 ${
            featured
              ? "mt-5 text-base leading-relaxed lg:text-lg"
              : "mt-3 line-clamp-3 text-sm leading-relaxed sm:text-base"
          }`}
        >
          {post.caption[locale]}
        </p>

        <div
          data-activity-card-tags
          className={`${featured ? "mt-7" : "mt-auto pt-5"} flex flex-wrap`}
        >
          <TechStackList items={post.tags} limit={2} colorOnHover />
        </div>
      </div>
    </article>
  );
}
