"use client";

import { useMemo } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { formatActivityDate } from "@/components/activities/ActivityCard";
import type { ActivityComment } from "@/lib/activities";
import {
  setActivityCommentHidden,
  useActivityCommentStore,
} from "@/lib/activity-comments-store";

export function ActivityCommentsSection({
  slug,
  seedComments,
}: {
  slug: string;
  seedComments: ActivityComment[];
}) {
  const { t, locale } = useLocale();
  const commentStore = useActivityCommentStore();
  const comments = useMemo(
    () => [...seedComments, ...(commentStore.extra[slug] ?? [])],
    [commentStore.extra, seedComments, slug]
  );
  const hiddenIds = useMemo(
    () => new Set(commentStore.hiddenIds),
    [commentStore.hiddenIds]
  );

  return (
    <section className="border-t border-hairline py-8">
      <h3 className="font-mono text-xs uppercase tracking-widest text-muted">
        {t.activities.admin.comments} ({comments.length})
      </h3>
      {comments.length === 0 ? (
        <p className="mt-6 text-sm text-muted">
          {t.activities.admin.commentsEmpty}
        </p>
      ) : (
        <ul className="mt-6">
          {comments.map((comment) => {
            const hidden = hiddenIds.has(comment.id);
            return (
              <li
                key={comment.id}
                className="flex flex-col gap-4 border-t border-hairline py-5 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className={hidden ? "opacity-50" : ""}>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-volt">
                    {comment.author} / {formatActivityDate(comment.date, locale)}
                  </p>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-foreground/90">
                    {comment.body}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                    {hidden
                      ? t.activities.admin.hidden
                      : t.activities.admin.visible}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setActivityCommentHidden(comment.id, !hidden)
                    }
                    className="rounded-pill border border-hairline px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-foreground transition-colors hover:border-volt hover:text-volt"
                  >
                    {hidden ? t.activities.admin.show : t.activities.admin.hide}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
