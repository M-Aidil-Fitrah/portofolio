"use client";

import { useRef } from "react";
import { gsap } from "@/lib/gsap";
import { useLocale } from "@/components/providers/LocaleProvider";
import { toggleActivityLike, useActivityLiked } from "@/lib/activity-likes-store";

/** Mock like: one toggle per visitor, persisted in localStorage so counts
 * survive reloads. The seed count comes from the data layer — a backend
 * will own both later, and only this component changes. */
export function LikeButton({
  slug,
  seed,
  className = "",
}: {
  slug: string;
  seed: number;
  className?: string;
}) {
  const { t } = useLocale();
  const rootRef = useRef<HTMLButtonElement>(null);
  const liked = useActivityLiked(slug);

  const toggle = (e: React.MouseEvent) => {
    // Cards wrap this button in a link — a like must never navigate.
    e.preventDefault();
    e.stopPropagation();
    const next = toggleActivityLike(slug);

    if (next && rootRef.current) {
      gsap.fromTo(
        rootRef.current,
        { scale: 1.25 },
        { scale: 1, duration: 0.4, ease: "back.out(3)" }
      );
    }
  };

  return (
    <button
      ref={rootRef}
      type="button"
      onClick={toggle}
      aria-pressed={liked}
      data-cursor={liked ? t.activities.liked : t.activities.like}
      className={`inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest transition-colors ${
        liked ? "text-volt" : "text-muted hover:text-foreground"
      } ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill={liked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={1.6}
        className="h-4 w-4"
        aria-hidden="true"
      >
        <path d="M12 20.5c-5.2-3.4-8.5-6.6-8.5-10A4.6 4.6 0 0 1 8.1 5.8c1.6 0 3 .8 3.9 2 0.9-1.2 2.3-2 3.9-2a4.6 4.6 0 0 1 4.6 4.7c0 3.4-3.3 6.6-8.5 10Z" />
      </svg>
      <span className="tabular-nums">{seed + (liked ? 1 : 0)}</span>
    </button>
  );
}
