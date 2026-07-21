"use client";

import { usePathname } from "next/navigation";
import { TransitionLink } from "@/components/layout/TransitionLink";
import { ActivityMedia } from "@/components/activities/ActivityMedia";
import { TechStackList } from "@/components/ui/TechStack";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { ActivityPost } from "@/lib/activities";

export function formatActivityDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${iso}T00:00:00`));
}

/** One journal entry. The list view prioritizes what happened and why it
 * matters; social engagement stays on the detail page. */
export function ActivityCard({
  post,
}: {
  post: ActivityPost;
}) {
  const { t, locale } = useLocale();
  const pathname = usePathname();
  const base = pathname.startsWith("/en") ? "/en/activities" : "/activities";
  const previewMedia = post.media[0];
  const date = new Date(`${post.date}T00:00:00`);
  const month = new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", {
    month: "short",
  }).format(date);
  const day = new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", {
    day: "2-digit",
  }).format(date);

  return (
    <article
      className={`activity-card group grid gap-5 border-t border-hairline py-7 ${
        previewMedia
          ? "sm:grid-cols-[112px_minmax(0,1fr)] lg:grid-cols-[112px_minmax(0,1fr)_168px]"
          : "lg:grid-cols-[112px_minmax(0,1fr)]"
      }`}
    >
      <div className="flex items-start justify-between gap-4 lg:block">
        <time
          dateTime={post.date}
          className="block font-mono uppercase tracking-widest text-muted"
        >
          <span className="block text-[11px] text-volt">{month}</span>
          <span className="mt-1 block text-3xl leading-none text-foreground">
            {day}
          </span>
          <span className="mt-1 block text-[10px]">{post.date.slice(0, 4)}</span>
        </time>
        {post.pinned && (
          <span className="rounded-pill bg-volt px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-ink lg:mt-4 lg:inline-block">
            {t.activities.pinned}
          </span>
        )}
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] uppercase tracking-widest text-muted">
          <span className="text-volt">{t.activities.filters[post.category]}</span>
          {post.progress && <span>{t.activities.progress[post.progress]}</span>}
        </div>

        <TransitionLink
          href={`${base}/${post.slug}`}
          label={post.title[locale]}
          data-cursor={`${t.activities.read} — ${post.title[locale]}`}
          className="mt-3 block w-fit"
        >
          <h3 className="max-w-3xl text-2xl font-semibold uppercase leading-tight tracking-tight transition-colors group-hover:text-volt sm:text-3xl">
            {post.title[locale]}
          </h3>
        </TransitionLink>

        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-foreground/75 sm:text-base">
          {post.caption[locale]}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
          <TransitionLink
            href={`${base}/${post.slug}`}
            label={post.title[locale]}
            data-cursor={`${t.activities.read} — ${post.title[locale]}`}
            className="font-mono text-xs uppercase tracking-widest text-volt transition-colors hover:text-foreground"
          >
            {t.activities.readNote} &rarr;
          </TransitionLink>
          <TechStackList items={post.tags} limit={2} colorOnHover />
        </div>
      </div>

      {previewMedia && (
        <TransitionLink
          href={`${base}/${post.slug}`}
          label={post.title[locale]}
          data-cursor={`${t.activities.read} — ${post.title[locale]}`}
          className="relative block max-w-[168px] sm:col-start-2 lg:col-start-auto lg:max-w-none"
        >
          <ActivityMedia
            media={previewMedia}
            index={1}
            videoControls={false}
            sizes="168px"
            className="aspect-[4/3] rounded-card"
          />
        </TransitionLink>
      )}
    </article>
  );
}
