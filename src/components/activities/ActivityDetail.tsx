"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { ActivityAttachments } from "@/components/activities/ActivityAttachments";
import { ActivityCard, formatActivityDate } from "@/components/activities/ActivityCard";
import { ActivityComments } from "@/components/activities/ActivityComments";
import { ActivityCover } from "@/components/activities/ActivityCover";
import { ActivityGallery } from "@/components/activities/ActivityGallery";
import { LikeButton } from "@/components/activities/LikeButton";
import { TransitionLink } from "@/components/layout/TransitionLink";
import { useLocale } from "@/components/providers/LocaleProvider";
import { AnimatedText } from "@/components/ui/AnimatedText";
import { TechStackList } from "@/components/ui/TechStack";
import { DUR, EASE, STAGGER } from "@/lib/animation";
import type { ActivityPost } from "@/lib/activities";
import { usePublishedActivities } from "@/lib/activity-store";
import { gsap, useGSAP } from "@/lib/gsap";
import { getProject } from "@/lib/projects";

export function ActivityDetail({
  post,
  previewMode = false,
}: {
  post: ActivityPost;
  previewMode?: boolean;
}) {
  const { t, locale } = useLocale();
  const pathname = usePathname();
  const rootRef = useRef<HTMLElement>(null);
  const [shared, setShared] = useState(false);
  const shareTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const base = pathname.startsWith("/en") ? "/en" : "";
  const publishedPosts = usePublishedActivities();
  const readyAttachments = post.attachments.filter(
    (attachment) => attachment.status === "ready"
  );

  const related = useMemo(
    () =>
      publishedPosts
        .filter((item) => item.slug !== post.slug)
        .sort((a, b) => {
          const aSame = a.category === post.category ? 0 : 1;
          const bSame = b.category === post.category ? 0 : 1;
          return aSame - bSame || b.date.localeCompare(a.date);
        })
        .slice(0, 2),
    [post.category, post.slug, publishedPosts]
  );
  const relatedProject = post.relatedProject
    ? getProject(post.relatedProject)
    : undefined;

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShared(true);
      toast.success(t.activities.shared, { id: "activity-link-copied" });
      if (shareTimer.current) clearTimeout(shareTimer.current);
      shareTimer.current = setTimeout(() => setShared(false), 2000);
    } catch {
      toast.error(t.activities.copyFailed, { id: "activity-link-copy-error" });
    }
  };

  useEffect(
    () => () => {
      if (shareTimer.current) clearTimeout(shareTimer.current);
    },
    []
  );

  useGSAP(
    () => {
      if (previewMode) return;
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

        root
          .querySelectorAll<HTMLElement>("[data-detail-media]")
          .forEach((element) => {
            const tween = gsap.from(element, {
              clipPath: "inset(100% 0 0 0 round 1.5rem)",
              duration: DUR.slow,
              ease: EASE.inOut,
              scrollTrigger: {
                trigger: element,
                start: "top 88%",
                toggleActions: "play none none reverse",
              },
            });
            cleanups.push(() => {
              tween.scrollTrigger?.kill();
              tween.kill();
            });
          });

        const cards = root.querySelectorAll(
          "[data-detail-related] .activity-card"
        );
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

        return () => cleanups.forEach((cleanup) => cleanup());
      });
      return () => mm.revert();
    },
    {
      scope: rootRef as React.RefObject<HTMLElement>,
      dependencies: [post.slug, previewMode],
      revertOnUpdate: true,
    }
  );

  return (
    <article
      ref={rootRef}
      data-activity-detail
      data-activity-detail-preview={previewMode ? "true" : "false"}
      className="px-6 pt-28 sm:px-10"
    >
      <div className="mx-auto max-w-[1100px]">
        <TransitionLink
          href={`${base}/activities`}
          label={t.activities.back}
          className="font-mono text-xs uppercase tracking-widest text-muted transition-colors hover:text-volt"
        >
          &larr; {t.activities.back}
        </TransitionLink>

        <header className="mt-8">
          <div
            data-detail-rise
            className="flex flex-wrap items-center gap-3 font-mono text-[11px] uppercase tracking-widest text-muted"
          >
            <span className="text-volt">
              {t.activities.filters[post.category]}
            </span>
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

          <div data-detail-rise className="mt-6">
            <TechStackList items={post.tags} colorOnHover />
          </div>

          <div
            data-detail-rise
            aria-label={t.activities.engagementToolbar}
            className="mt-7 inline-flex items-center divide-x divide-hairline border-y border-hairline"
          >
            <LikeButton
              slug={post.slug}
              seed={post.likes}
              className="min-h-11 px-4"
            />
            <button
              type="button"
              onClick={share}
              data-cursor={shared ? t.activities.shared : t.activities.share}
              className={`inline-flex min-h-11 items-center gap-2 px-4 font-mono text-xs uppercase tracking-widest transition-colors ${
                shared ? "text-volt" : "text-muted hover:text-foreground"
              }`}
            >
              <ShareIcon />
              <span aria-live="polite">
                {shared ? t.activities.shared : t.activities.share}
              </span>
            </button>
          </div>
        </header>

        {post.cover?.src && (
          <section
            data-detail-section="cover"
            aria-label={t.activities.cover}
            className="mt-12"
          >
            <ActivityCover
              cover={post.cover}
              title={post.title[locale]}
              category={t.activities.filters[post.category]}
              date={post.date}
              locale={locale}
              priority
              className="rounded-card"
            />
          </section>
        )}

        <DetailSection
          label={t.activities.sections.story}
          dataSection="story"
        >
          <AnimatedText
            as="p"
            className="max-w-[64ch] whitespace-pre-line text-lg leading-relaxed text-foreground/90"
          >
            {post.body[locale]}
          </AnimatedText>
        </DetailSection>

        {post.media.length > 0 && (
          <DetailSection
            label={`${t.activities.sections.gallery} (${post.media.length})`}
            dataSection="gallery"
          >
            <ActivityGallery
              media={post.media}
              title={post.title[locale]}
            />
          </DetailSection>
        )}

        {readyAttachments.length > 0 && (
          <DetailSection
            label={`${t.activities.sections.attachments} (${readyAttachments.length})`}
            dataSection="attachments"
          >
            <ActivityAttachments attachments={readyAttachments} />
          </DetailSection>
        )}

        {relatedProject && (
          <DetailSection
            label={t.activities.relatedProject}
            dataSection="related-project"
          >
            <TransitionLink
              href={`${base}/projects/${relatedProject.slug}`}
              label={relatedProject.title}
              data-cursor={`${t.works.viewCase} — ${relatedProject.title}`}
              className="group inline-flex flex-col gap-2 sm:flex-row sm:items-baseline sm:gap-4"
            >
              <span className="text-2xl font-semibold uppercase tracking-tight transition-colors group-hover:text-volt sm:text-4xl">
                {relatedProject.title}
              </span>
              <span className="font-mono text-xs uppercase tracking-widest text-muted">
                {relatedProject.tagline[locale]}
              </span>
            </TransitionLink>
          </DetailSection>
        )}

        <section
          data-detail-section="comments"
          className="mt-16 border-t border-hairline pt-8"
        >
          <ActivityComments slug={post.slug} seed={post.comments} />
        </section>

        {related.length > 0 && (
          <section
            data-detail-related
            data-detail-section="related"
            className="mt-20 border-t border-hairline pb-4 pt-8"
          >
            <h2 className="font-mono text-xs uppercase tracking-widest text-muted">
              {t.activities.related}
            </h2>
            <div className="mt-5 grid grid-cols-1 gap-x-8 md:grid-cols-2">
              {related.map((item) => (
                <ActivityCard key={item.slug} post={item} />
              ))}
            </div>
          </section>
        )}
      </div>
    </article>
  );
}

function DetailSection({
  label,
  dataSection,
  children,
}: {
  label: string;
  dataSection: string;
  children: React.ReactNode;
}) {
  return (
    <section
      data-detail-section={dataSection}
      className="mt-16 border-t border-hairline pt-8"
    >
      <div className="grid grid-cols-1 gap-7 lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-10">
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted lg:sticky lg:top-28 lg:self-start">
          {label}
        </h2>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}

function ShareIcon() {
  return (
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
  );
}
