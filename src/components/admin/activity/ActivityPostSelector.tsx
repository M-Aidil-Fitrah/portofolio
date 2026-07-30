"use client";

import { useLocale } from "@/components/providers/LocaleProvider";
import type { ActivityPost } from "@/lib/activities";

export function ActivityPostSelector({
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

  return (
    <div className="hidden border-b border-hairline py-6 md:block lg:hidden">
      <div className="flex items-end gap-4">
        <label className="min-w-0 flex-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {t.activities.admin.selectActivity}
          </span>
          <select
            id="activity-tablet-selector"
            value={selectedSlug ?? ""}
            onChange={(event) => {
              const post = posts.find(
                (candidate) => candidate.slug === event.target.value
              );
              if (post) onSelect(post);
            }}
            className="mt-2 h-12 w-full border border-hairline bg-ink px-4 text-sm text-foreground focus:border-volt focus:outline-none"
          >
            <option value="">{t.activities.admin.selectPlaceholder}</option>
            {posts.map((post) => (
              <option key={post.slug} value={post.slug}>
                {post.title[locale] || t.activities.admin.untitled}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={onCreate}
          className="btn-fill inline-flex h-12 shrink-0 items-center rounded-pill border border-volt px-5 font-mono text-xs uppercase tracking-widest text-volt"
        >
          + {t.activities.admin.newPost}
        </button>
      </div>
    </div>
  );
}
