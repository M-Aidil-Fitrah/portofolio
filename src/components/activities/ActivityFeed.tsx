"use client";

import { useMemo, useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { DUR, EASE, STAGGER } from "@/lib/animation";
import { useLocale } from "@/components/providers/LocaleProvider";
import { ActivityCard } from "@/components/activities/ActivityCard";
import { ACTIVITY_CATEGORIES, type ActivityCategory } from "@/lib/activities";
import { usePublishedActivities } from "@/lib/activity-store";

const PAGE_SIZE = 4;

type Filter = "all" | ActivityCategory;

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

/**
 * The public feed. Deliberately paginated client-side (`PAGE_SIZE` + load
 * more) so the DOM stays small no matter how long the log grows — when a
 * backend replaces the mock module this becomes a fetch cursor without any
 * UI changes. Filter/search changes re-run the entrance stagger so the
 * feed feels re-choreographed, not just re-filtered.
 */
export function ActivityFeed() {
  const { t, locale } = useLocale();
  const listRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const all = usePublishedActivities();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((post) => {
      if (filter !== "all" && post.category !== filter) return false;
      if (!q) return true;
      const haystack = [
        post.title.en,
        post.title.id,
        post.caption.en,
        post.caption.id,
        ...post.tags,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [all, filter, query]);

  const shown = filtered.slice(0, visible);
  const pinnedFirst = filter === "all" && !query.trim() && shown[0]?.pinned;

  // Group the non-featured remainder by month for the timeline headers.
  const groups = useMemo(() => {
    const rest = pinnedFirst ? shown.slice(1) : shown;
    const map = new Map<string, typeof rest>();
    rest.forEach((post) => {
      const key = monthKey(post.date);
      map.set(key, [...(map.get(key) ?? []), post]);
    });
    return Array.from(map.entries());
  }, [shown, pinnedFirst]);

  useGSAP(
    () => {
      const list = listRef.current;
      if (!list) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const cards = list.querySelectorAll(".activity-card, .activity-month");
        const tween = gsap.fromTo(
          cards,
          { y: 48, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: DUR.base,
            ease: EASE.expo,
            stagger: STAGGER.items,
            overwrite: "auto",
          }
        );
        return () => {
          tween.kill();
        };
      });
      return () => mm.revert();
    },
    // Re-choreograph whenever the visible set changes shape. revertOnUpdate
    // is required so the previous tween is actually killed on each change —
    // @gsap/react otherwise defers that cleanup to unmount only, stacking a
    // new stagger tween on top of the old one every filter/search keystroke.
    { scope: listRef as React.RefObject<HTMLElement>, dependencies: [filter, query, visible, locale], revertOnUpdate: true }
  );

  const setFilterAndReset = (next: Filter) => {
    setFilter(next);
    setVisible(PAGE_SIZE);
  };

  const monthLabel = (key: string) =>
    new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", {
      month: "long",
      year: "numeric",
    }).format(new Date(`${key}-01T00:00:00`));

  return (
    <div>
      <div className="flex flex-col gap-6 border-t border-hairline pt-8 lg:flex-row lg:items-center lg:justify-between">
        <div role="group" aria-label={t.activities.label} className="flex flex-wrap gap-2">
          {(["all", ...ACTIVITY_CATEGORIES] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilterAndReset(f)}
              aria-pressed={filter === f}
              className={`inline-flex h-10 items-center rounded-pill border px-5 font-mono text-xs uppercase tracking-widest transition-colors ${
                filter === f
                  ? "border-volt bg-volt text-ink"
                  : "btn-fill border-hairline text-foreground"
              }`}
            >
              {t.activities.filters[f === "all" ? "all" : f]}
            </button>
          ))}
        </div>

        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setVisible(PAGE_SIZE);
          }}
          placeholder={t.activities.searchPlaceholder}
          aria-label={t.activities.searchPlaceholder}
          className="h-11 w-full rounded-pill border border-hairline bg-transparent px-5 font-mono text-xs uppercase tracking-widest text-foreground placeholder:text-muted focus:border-volt focus:outline-none lg:max-w-xs"
        />
      </div>

      <div ref={listRef} className="mt-10">
        {shown.length === 0 && (
          <p className="border-t border-hairline py-16 text-center font-mono text-sm text-muted">
            {t.activities.empty}
          </p>
        )}

        {pinnedFirst && <ActivityCard post={shown[0]} featured />}

        {groups.map(([key, posts]) => (
          <section key={key} aria-label={monthLabel(key)}>
            <h2 className="activity-month mt-12 flex items-baseline gap-4 font-mono text-xs uppercase tracking-[0.3em] text-muted first:mt-0">
              <span className="text-volt">&mdash;</span>
              {monthLabel(key)}
            </h2>
            <div className="mt-4">
              {posts.map((post) => (
                <ActivityCard key={post.slug} post={post} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {visible < filtered.length && (
        <div className="mt-12 flex justify-center border-t border-hairline pt-10">
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="btn-fill inline-flex h-12 items-center rounded-pill border border-volt px-8 font-mono text-xs uppercase tracking-widest text-volt"
          >
            {t.activities.loadMore} ({filtered.length - visible})
          </button>
        </div>
      )}
    </div>
  );
}
