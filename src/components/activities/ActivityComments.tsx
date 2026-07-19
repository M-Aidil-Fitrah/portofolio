"use client";

import { useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import { DUR, EASE } from "@/lib/animation";
import { useLocale } from "@/components/providers/LocaleProvider";
import { formatActivityDate } from "@/components/activities/ActivityCard";
import type { ActivityComment } from "@/lib/activities";
import {
  addActivityComment,
  useVisibleActivityComments,
} from "@/lib/activity-comments-store";

/** Guest comments, mock edition: seed comments come from the data layer,
 * new ones persist to localStorage per slug. The form shape (name +
 * honeypot anti-spam) is what a real backend endpoint would receive. */
export function ActivityComments({
  slug,
  seed,
}: {
  slug: string;
  seed: ActivityComment[];
}) {
  const { t, locale } = useLocale();
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [sortNewest, setSortNewest] = useState(true);
  const listRef = useRef<HTMLUListElement>(null);
  const visibleComments = useVisibleActivityComments(slug, seed);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Honeypot: bots fill every field — humans never see this one.
    const honey = (
      e.currentTarget.elements.namedItem("website") as HTMLInputElement | null
    )?.value;
    if (honey) return;
    if (!name.trim() || !body.trim()) return;

    const comment: ActivityComment = {
      id: `local-${Date.now()}`,
      author: name.trim(),
      body: body.trim(),
      date: new Date().toISOString().slice(0, 10),
    };
    addActivityComment(slug, comment);
    setBody("");

    requestAnimationFrame(() => {
      const items = listRef.current?.querySelectorAll("li");
      const last = sortNewest ? items?.[0] : items?.[items.length - 1];
      if (last) {
        gsap.from(last, { y: 24, opacity: 0, duration: DUR.fast, ease: EASE.out });
      }
    });
  };

  const comments = [...visibleComments].sort((a, b) =>
    sortNewest ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-6">
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted">
          {t.activities.commentsLabel} ({comments.length})
        </h2>
        <button
          type="button"
          onClick={() => setSortNewest((v) => !v)}
          className="font-mono text-xs uppercase tracking-widest text-muted transition-colors hover:text-volt"
        >
          {sortNewest ? t.activities.sortNewest : t.activities.sortOldest} &darr;&uarr;
        </button>
      </div>

      <ul ref={listRef} className="mt-6 space-y-6">
        {comments.map((comment) => (
          <li key={comment.id} className="border-t border-hairline pt-5">
            <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="font-mono text-xs uppercase tracking-widest text-volt">
                {comment.author}
              </span>
              <span className="font-mono text-[11px] uppercase tracking-widest text-muted">
                {formatActivityDate(comment.date, locale)}
              </span>
            </p>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-foreground/90">
              {comment.body}
            </p>
          </li>
        ))}
      </ul>

      <form onSubmit={submit} className="mt-10 border-t border-hairline pt-8">
        <h3 className="font-mono text-xs uppercase tracking-widest text-foreground">
          {t.activities.commentForm.title}
        </h3>
        <div className="mt-4 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-[240px_1fr]">
          <label className="flex flex-col gap-2">
            <span className="font-mono text-[11px] uppercase tracking-widest text-muted">
              {t.activities.commentForm.name}
            </span>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.activities.commentForm.namePlaceholder}
              className="h-11 rounded-pill border border-hairline bg-transparent px-4 text-sm text-foreground placeholder:text-muted focus:border-volt focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-mono text-[11px] uppercase tracking-widest text-muted">
              {t.activities.commentForm.body}
            </span>
            <textarea
              required
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t.activities.commentForm.bodyPlaceholder}
              className="rounded-card border border-hairline bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-volt focus:outline-none"
            />
          </label>
          {/* Honeypot — visually hidden, tabbed past, bots fill it. */}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="hidden"
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-6">
          <button
            type="submit"
            className="btn-fill inline-flex h-11 items-center rounded-pill border border-volt px-6 font-mono text-xs uppercase tracking-widest text-volt"
          >
            {t.activities.commentForm.submit}
          </button>
          <p className="max-w-xs font-mono text-[11px] leading-relaxed text-muted">
            {t.activities.commentForm.note}
          </p>
        </div>
      </form>
    </div>
  );
}
