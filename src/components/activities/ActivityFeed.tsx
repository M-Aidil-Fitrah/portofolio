"use client";

import { useMemo, useRef, useState } from "react";
import { ActivityCard } from "@/components/activities/ActivityCard";
import { useLocale } from "@/components/providers/LocaleProvider";
import { DUR, EASE, STAGGER } from "@/lib/animation";
import {
  ACTIVITY_CATEGORIES,
  type ActivityCategory,
  type ActivityPost,
} from "@/lib/activities";
import { gsap, useGSAP } from "@/lib/gsap";
import { usePublishedActivities } from "@/lib/activity-store";

const PAGE_SIZE = 6;

type Filter = "all" | ActivityCategory;

export function ActivityFeed({
  initialPosts,
}: {
  initialPosts?: ActivityPost[];
}) {
  const { t, locale } = useLocale();
  const listRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const published = usePublishedActivities(initialPosts);

  const ordered = useMemo(
    () => [...published].sort((a, b) => b.date.localeCompare(a.date)),
    [published]
  );
  const featured = useMemo(
    () => ordered.find((post) => post.pinned) ?? ordered[0],
    [ordered]
  );
  const normalizedQuery = query.trim().toLowerCase();
  const filtering = filter !== "all" || normalizedQuery.length > 0;

  const filtered = useMemo(
    () =>
      ordered.filter((post) => {
        if (filter !== "all" && post.category !== filter) return false;
        if (!normalizedQuery) return true;
        return [
          post.title.en,
          post.title.id,
          post.caption.en,
          post.caption.id,
          ...post.tags,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      }),
    [filter, normalizedQuery, ordered]
  );

  const gridPosts = (
    filtering
      ? filtered
      : filtered.filter((post) => post.slug !== featured?.slug)
  ).slice(0, visible);
  const totalGridPosts = filtering
    ? filtered.length
    : filtered.filter((post) => post.slug !== featured?.slug).length;

  useGSAP(
    () => {
      const list = listRef.current;
      if (!list) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const cards = list.querySelectorAll("[data-activity-card]");
        const tween = gsap.fromTo(
          cards,
          { y: 40, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: DUR.base,
            ease: EASE.expo,
            stagger: STAGGER.items,
            overwrite: "auto",
          }
        );
        return () => tween.kill();
      });
      return () => mm.revert();
    },
    {
      scope: listRef as React.RefObject<HTMLElement>,
      dependencies: [filter, normalizedQuery, visible, locale, featured?.slug],
      revertOnUpdate: true,
    }
  );

  const setFilterAndReset = (next: Filter) => {
    setFilter(next);
    setVisible(PAGE_SIZE);
  };

  return (
    <div data-activity-feed data-filter-active={filtering ? "true" : "false"}>
      <div className="border-t border-hairline pt-7">
        <p className="font-mono text-xs uppercase tracking-widest text-muted">
          {t.activities.browseLabel}
        </p>

        <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div
            role="group"
            aria-label={t.activities.label}
            className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {(["all", ...ACTIVITY_CATEGORIES] as Filter[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilterAndReset(item)}
                aria-pressed={filter === item}
                className={`inline-flex h-9 shrink-0 items-center rounded-pill border px-4 font-mono text-[11px] uppercase tracking-widest transition-colors ${
                  filter === item
                    ? "border-volt bg-volt text-ink"
                    : "btn-fill border-hairline text-foreground"
                }`}
              >
                {t.activities.filters[item === "all" ? "all" : item]}
              </button>
            ))}
          </div>

          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setVisible(PAGE_SIZE);
            }}
            placeholder={t.activities.searchPlaceholder}
            aria-label={t.activities.searchPlaceholder}
            className="h-10 w-full rounded-pill border border-hairline bg-transparent px-4 font-mono text-[11px] uppercase tracking-widest text-foreground placeholder:text-muted focus:border-volt focus:outline-none lg:max-w-[260px]"
          />
        </div>
      </div>

      <div ref={listRef} className="mt-10">
        {!filtering && featured && (
          <section
            data-featured-activity
            aria-labelledby="featured-activity-heading"
          >
            <div className="flex items-center gap-4">
              <span className="h-px w-8 bg-volt" aria-hidden="true" />
              <h2
                id="featured-activity-heading"
                className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted"
              >
                {t.activities.featured}
              </h2>
            </div>
            <ActivityCard post={featured} variant="featured" />
          </section>
        )}

        {(gridPosts.length > 0 || filtering) && (
          <section
            className={!filtering && featured ? "mt-14" : ""}
            aria-labelledby="activity-grid-heading"
          >
            <div className="flex items-center gap-4 border-b border-hairline pb-4">
              <span className="h-px w-8 bg-volt" aria-hidden="true" />
              <h2
                id="activity-grid-heading"
                className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted"
              >
                {filtering ? t.activities.results : t.activities.latest}
              </h2>
            </div>

            {gridPosts.length > 0 ? (
              <div
                data-activity-grid
                className="grid grid-cols-1 gap-x-7 md:grid-cols-2 lg:gap-x-10"
              >
                {gridPosts.map((post) => (
                  <ActivityCard key={post.slug} post={post} />
                ))}
              </div>
            ) : (
              <p className="py-16 text-center font-mono text-sm text-muted">
                {t.activities.empty}
              </p>
            )}
          </section>
        )}

        {!featured && !filtering && (
          <p className="border-t border-hairline py-16 text-center font-mono text-sm text-muted">
            {t.activities.empty}
          </p>
        )}
      </div>

      {visible < totalGridPosts && (
        <div className="mt-12 flex justify-center border-t border-hairline pt-10">
          <button
            type="button"
            onClick={() => setVisible((current) => current + PAGE_SIZE)}
            className="btn-fill inline-flex h-12 items-center rounded-pill border border-volt px-8 font-mono text-xs uppercase tracking-widest text-volt"
          >
            {t.activities.loadMore} ({totalGridPosts - visible})
          </button>
        </div>
      )}
    </div>
  );
}
