"use client";

import { memo, useMemo, useState } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { ActivityPost, ActivityStatus } from "@/lib/activities";
import { ACTIVITY_STATUSES } from "./activity-admin-config";

type StatusFilter = "all" | ActivityStatus;

export const ActivityPostList = memo(function ActivityPostList({
  posts,
  selectedSlug,
  onCreate,
  onSelect,
}: {
  posts: ActivityPost[];
  selectedSlug: string | null;
  onCreate: () => void;
  onSelect: (post: ActivityPost) => void;
}) {
  const { t, locale } = useLocale();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const filteredPosts = useMemo(
    () =>
      posts
        .filter(
          (post) => statusFilter === "all" || post.status === statusFilter
        )
        .sort((left, right) => right.date.localeCompare(left.date)),
    [posts, statusFilter]
  );

  return (
    <aside className="border-b border-hairline py-6 md:sticky md:top-20 md:max-h-[calc(100svh-5rem)] md:self-start md:overflow-hidden md:border-b-0 md:border-r md:pr-6 lg:py-8 lg:pr-8">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted">
          {t.activities.admin.posts} ({posts.length})
        </h2>
        <button
          type="button"
          onClick={onCreate}
          className="btn-fill inline-flex h-10 items-center rounded-pill border border-volt px-4 font-mono text-xs uppercase tracking-widest text-volt"
        >
          + {t.activities.admin.newPost}
        </button>
      </div>

      <div
        className="mt-5 flex flex-wrap gap-2 lg:mt-6"
        role="group"
        aria-label={t.activities.admin.status}
      >
        {(["all", ...ACTIVITY_STATUSES] as StatusFilter[]).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            aria-pressed={statusFilter === status}
            className={`rounded-pill border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors ${
              statusFilter === status
                ? "border-volt bg-volt text-ink"
                : "border-hairline text-muted hover:text-foreground"
            }`}
          >
            {status === "all"
              ? t.activities.admin.all
              : t.activities.admin.statuses[status]}
          </button>
        ))}
      </div>

      <div className="mt-5 max-h-[220px] overflow-y-auto border-t border-hairline pr-1 md:max-h-[calc(100svh-18rem)] lg:mt-6">
        {filteredPosts.length === 0 && (
          <p className="py-10 text-sm text-muted">
            {t.activities.admin.empty}
          </p>
        )}
        {filteredPosts.map((post) => (
          <button
            key={post.slug}
            type="button"
            onClick={() => onSelect(post)}
            aria-current={selectedSlug === post.slug ? "true" : undefined}
            className={`block w-full border-b border-hairline py-3 text-left transition-colors lg:py-5 ${
              selectedSlug === post.slug
                ? "text-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            <span className="flex items-center justify-between gap-4 font-mono text-[10px] uppercase tracking-widest">
              <span
                className={post.status === "published" ? "text-volt" : ""}
              >
                {t.activities.admin.statuses[post.status]}
              </span>
              <span>{post.date}</span>
            </span>
            <span className="mt-2 block text-sm font-medium uppercase leading-snug">
              {post.title[locale] || t.activities.admin.untitled}
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
});
