"use client";

import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { gsap, useGSAP } from "@/lib/gsap";
import { DUR, EASE, STAGGER } from "@/lib/animation";
import { useLocale } from "@/components/providers/LocaleProvider";
import { usePreview } from "@/components/providers/PreviewProvider";
import { TransitionLink } from "@/components/layout/TransitionLink";
import { AnimatedText } from "@/components/ui/AnimatedText";
import { ActivityMedia } from "@/components/activities/ActivityMedia";
import { ActivityCard, formatActivityDate } from "@/components/activities/ActivityCard";
import { ActivityComments } from "@/components/activities/ActivityComments";
import { LikeButton } from "@/components/activities/LikeButton";
import { getRelatedActivities, type ActivityPost } from "@/lib/activities";
import { getProject } from "@/lib/projects";

export function ActivityDetail({ post }: { post: ActivityPost }) {
  const { t, locale } = useLocale();
  const { openPreview } = usePreview();
  const pathname = usePathname();
  const rootRef = useRef<HTMLElement>(null);
  const [shared, setShared] = useState(false);
  const shareTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const base = pathname.startsWith("/en") ? "/en" : "";
  const related = getRelatedActivities(post.slug);
  const relatedProject = post.relatedProject
    ? getProject(post.relatedProject)
    : undefined;

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShared(true);
      if (shareTimer.current) clearTimeout(shareTimer.current);
      shareTimer.current = setTimeout(() => setShared(false), 2000);
    } catch {
      // Clipboard unavailable (permissions/http) — nothing sensible to do.
    }
  };

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const cleanups: (() => void)[] = [];

        const meta = root.querySelectorAll("[data-detail-rise]");
        if (meta.length) {
          const tween = gsap.from(meta, {
            y: 24,
            opacity: 0,
            duration: DUR.fast,
            ease: EASE.out,
            stagger: 0.08,
            delay: 0.35,
          });
          cleanups.push(() => tween.kill());
        }

        // Media frames unveil from the bottom edge as they enter the viewport.
        root.querySelectorAll<HTMLElement>("[data-detail-media]").forEach((el) => {
          const tween = gsap.from(el, {
            clipPath: "inset(100% 0 0 0 round 1.5rem)",
            duration: DUR.slow,
            ease: EASE.inOut,
            scrollTrigger: {
              trigger: el,
              start: "top 88%",
              toggleActions: "play none none reverse",
            },
          });
          cleanups.push(() => {
            tween.scrollTrigger?.kill();
            tween.kill();
          });
        });

        // Related cards re-use the feed stagger.
        const cards = root.querySelectorAll("[data-detail-related] .activity-card");
        if (cards.length) {
          const tween = gsap.from(cards, {
            y: 48,
            opacity: 0,
            duration: DUR.base,
            ease: EASE.expo,
            stagger: STAGGER.items,
            scrollTrigger: {
              trigger: cards[0],
              start: "top 88%",
              toggleActions: "play none none reverse",
            },
          });
          cleanups.push(() => {
            tween.scrollTrigger?.kill();
            tween.kill();
          });
        }

        return () => cleanups.forEach((fn) => fn());
      });
      return () => mm.revert();
    },
    { scope: rootRef as React.RefObject<HTMLElement>, dependencies: [post.slug] }
  );

  return (
    <article ref={rootRef} className="px-6 pt-28 sm:px-10">
      <div className="mx-auto max-w-[1100px]">
        <TransitionLink
          href={`${base}/activities`}
          label={t.activities.back}
          className="font-mono text-xs uppercase tracking-widest text-muted transition-colors hover:text-volt"
        >
          &larr; {t.activities.back}
        </TransitionLink>

        <div
          data-detail-rise
          className="mt-8 flex flex-wrap items-center gap-3 font-mono text-[11px] uppercase tracking-widest text-muted"
        >
          <span className="text-volt">{t.activities.filters[post.category]}</span>
          <span>{formatActivityDate(post.date, locale)}</span>
          {post.progress && (
            <span className="rounded-pill border border-hairline px-2.5 py-0.5">
              {t.activities.progress[post.progress]}
            </span>
          )}
        </div>

        <AnimatedText
          as="h1"
          type="chars"
          scrollTrigger={false}
          className="mt-4 text-[clamp(2rem,6vw,4.5rem)] font-semibold uppercase leading-[0.95] tracking-tight"
        >
          {post.title[locale]}
        </AnimatedText>

        <p
          data-detail-rise
          className="mt-6 max-w-2xl text-lg leading-relaxed text-foreground/90"
        >
          {post.caption[locale]}
        </p>

        <div
          data-detail-rise
          className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4 border-y border-hairline py-5"
        >
          <LikeButton slug={post.slug} seed={post.likes} />
          <button
            type="button"
            onClick={share}
            data-cursor={shared ? t.activities.shared : t.activities.share}
            className={`inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest transition-colors ${
              shared ? "text-volt" : "text-muted hover:text-foreground"
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M9.5 13.5 14.5 10.5M9.5 10.5 14.5 13.5M8 15.5a3.5 3.5 0 1 1 0-7M16 8.5a3.5 3.5 0 1 1 0 7" />
              <path d="M10 7.5A3.5 3.5 0 1 1 14 7.5M10 16.5a3.5 3.5 0 1 0 4 0" />
            </svg>
            <span aria-live="polite">
              {shared ? t.activities.shared : t.activities.share}
            </span>
          </button>
          <span className="flex flex-wrap gap-2 font-mono text-[11px] uppercase tracking-widest text-muted">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-pill border border-hairline px-2.5 py-0.5"
              >
                {tag}
              </span>
            ))}
          </span>
        </div>

        {post.media.length > 0 && (
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {post.media.map((media, i) => (
              <button
                key={`${media.alt}-${i}`}
                type="button"
                onClick={() =>
                  openPreview({
                    src: media.type === "image" ? media.src : undefined,
                    alt: media.alt,
                    caption: `${post.title[locale]} — ${String(i + 1).padStart(2, "0")}`,
                    index: String(i + 1).padStart(2, "0"),
                  })
                }
                data-cursor={t.preview.open}
                data-detail-media
                className={`group block text-left ${i === 0 ? "sm:col-span-2" : ""}`}
              >
                <ActivityMedia
                  media={media}
                  index={i + 1}
                  sizes={i === 0 ? "(max-width: 1100px) 100vw, 1100px" : "(max-width: 640px) 100vw, 550px"}
                  className={i === 0 ? "aspect-[16/9]" : "aspect-[4/3]"}
                />
              </button>
            ))}
          </div>
        )}

        <div className="mt-16 grid grid-cols-1 gap-12 lg:grid-cols-[200px_minmax(0,60ch)]">
          <p className="font-mono text-xs uppercase tracking-widest text-muted lg:sticky lg:top-28 lg:self-start">
            ({t.activities.label})
          </p>
          <AnimatedText as="p" className="text-lg leading-relaxed text-foreground/90">
            {post.body[locale]}
          </AnimatedText>
        </div>

        {relatedProject && (
          <div className="mt-16 border-t border-hairline pt-8">
            <h2 className="font-mono text-xs uppercase tracking-widest text-muted">
              {t.activities.relatedProject}
            </h2>
            <TransitionLink
              href={`${base}/projects/${relatedProject.slug}`}
              label={relatedProject.title}
              data-cursor={`${t.works.viewCase} — ${relatedProject.title}`}
              className="group mt-4 inline-flex items-baseline gap-4"
            >
              <span className="text-2xl font-semibold uppercase tracking-tight transition-colors group-hover:text-volt sm:text-4xl">
                {relatedProject.title}
              </span>
              <span className="font-mono text-xs uppercase tracking-widest text-muted">
                {relatedProject.tagline[locale]}
              </span>
            </TransitionLink>
          </div>
        )}

        <div className="mt-16 border-t border-hairline pt-10">
          <ActivityComments slug={post.slug} seed={post.comments} />
        </div>

        {related.length > 0 && (
          <div data-detail-related className="mt-20 border-t border-hairline pt-10 pb-4">
            <h2 className="font-mono text-xs uppercase tracking-widest text-muted">
              {t.activities.related}
            </h2>
            <div className="mt-6">
              {related.map((item) => (
                <ActivityCard key={item.slug} post={item} />
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
