"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useSmoothScroll } from "@/components/providers/SmoothScrollProvider";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { AnimatedText } from "@/components/ui/AnimatedText";
import { ProjectCover } from "@/components/project/ProjectCover";
import { TransitionLink } from "@/components/layout/TransitionLink";
import { ScrambleHover } from "@/components/ui/ScrambleHover";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { fontsReady } from "@/lib/animation";
import { projects } from "@/lib/projects";
import { saveCoverRect } from "@/lib/flipTransition";

export function Works() {
  const { t, locale } = useLocale();
  const { lenis } = useSmoothScroll();
  const pinRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const coverRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Kept outside the pin effect's own deps (see the comment on that effect
  // for why `locale`/`lenis` can't safely be added there) so the one-time
  // hash correction below can still read a fresh Lenis instance.
  const lenisRef = useRef(lenis);
  useEffect(() => {
    lenisRef.current = lenis;
  }, [lenis]);

  useGSAP(
    () => {
      const pinTarget = pinRef.current;
      const track = trackRef.current;
      if (!pinTarget || !track) return;

      const mm = gsap.matchMedia();
      mm.add(
        {
          isDesktop: "(min-width: 1024px)",
          reduceMotion: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          const { isDesktop, reduceMotion } = context.conditions as {
            isDesktop: boolean;
            reduceMotion: boolean;
          };
          if (!isDesktop || reduceMotion) return;

          const panels = track.querySelectorAll<HTMLElement>(".work-panel");
          const getDistance = () => track.scrollWidth - window.innerWidth;

          gsap.to(track, {
            x: () => -getDistance(),
            ease: "none",
            scrollTrigger: {
              trigger: pinTarget,
              start: "top top",
              end: () => `+=${getDistance()}`,
              scrub: 1,
              pin: true,
              invalidateOnRefresh: true,
              onUpdate: (self) => {
                const idx = Math.min(
                  panels.length - 1,
                  Math.floor(self.progress * panels.length)
                );
                if (progressRef.current) {
                  progressRef.current.textContent = String(
                    idx + 1
                  ).padStart(2, "0");
                }
              },
            },
          });

          // Web fonts can swap in after first paint and shift text/track
          // widths — refresh once metrics are final so the pin distance
          // (and thus panel positions) stay accurate.
          let cancelled = false;
          fontsReady().then(() => {
            if (cancelled) return;
            ScrollTrigger.refresh();

            // A hash landing on a section *after* this pin (e.g. a hard
            // reload on `/#contact`) resolves before the pin's extra
            // scroll distance exists, so the browser's native jump lands
            // short — inside this pin's scroll range instead of at the
            // real target. Re-land on it now that distances are final.
            const hash = window.location.hash;
            if (hash) {
              const target = document.querySelector<HTMLElement>(hash);
              if (target) lenisRef.current?.scrollTo(target, { immediate: true });
            }
          });

          // No manual tween/ScrollTrigger kill here — gsap.matchMedia
          // already tracks and reverts everything created inside this
          // callback (including the pin) when its cleanup runs. Killing
          // the ScrollTrigger manually *and* letting matchMedia revert it
          // right after was compounding: each locale switch re-created the
          // pin on top of a not-fully-reverted previous one, growing the
          // pinned scroll distance by one full track-width every time.
          return () => {
            cancelled = true;
          };
        }
      );

      return () => mm.revert();
    },
    // No `locale` dependency: panel width is fixed to the viewport
    // (`lg:w-screen`), not to translated text length, so the pin/scrub
    // geometry never actually needs to be torn down and rebuilt when the
    // language changes — doing so was the root cause of a compounding bug
    // (each switch re-pinned on top of the previous one, growing the
    // scroll distance by a full track-width every time).
    { scope: pinRef as React.RefObject<HTMLElement>, dependencies: [] }
  );

  return (
    <section
      id="works"
      aria-labelledby="works-heading"
      className="border-t border-hairline"
    >
      <div className="px-6 pt-24 sm:px-10">
        <div className="mx-auto max-w-[1600px]">
          <SectionHeading index="02" label={t.works.label} />
          <AnimatedText
            as="h2"
            id="works-heading"
            className="mt-6 text-3xl font-semibold uppercase tracking-tight sm:text-5xl"
          >
            {t.works.heading}
          </AnimatedText>
        </div>
      </div>

      <div
        ref={pinRef}
        // GSAP pins this element at its own natural top (~0, i.e. under the
        // fixed h-16 header — see Header.tsx), not at some offset start
        // point, so the header would otherwise cover the first 4rem of
        // pinned content. `pt-16` pushes the content itself below that
        // strip instead, while the box still spans the full `h-dvh` so its
        // bottom edge lands exactly at the viewport bottom — the pinned
        // panel fits exactly one screen.
        className="relative mt-8 motion-safe:lg:mt-0 motion-safe:lg:h-dvh motion-safe:lg:overflow-hidden motion-safe:lg:pt-16"
      >
        <div
          ref={trackRef}
          className="flex flex-col motion-safe:lg:h-full motion-safe:lg:flex-row motion-safe:lg:flex-nowrap"
        >
          {projects.map((project) => (
            <div
              key={project.slug}
              data-cursor={t.works.viewCase}
              className="work-panel flex min-h-0 w-full shrink-0 flex-col gap-3 border-t border-hairline px-6 py-8 sm:px-10 motion-safe:lg:h-full motion-safe:lg:w-screen motion-safe:lg:gap-3 motion-safe:lg:border-l motion-safe:lg:border-t-0 motion-safe:lg:py-6"
            >
              <span className="shrink-0 font-mono text-sm text-volt">
                {project.index}{" "}
                <span className="text-muted">
                  / {String(projects.length).padStart(2, "0")}
                </span>
              </span>
              <h3 className="shrink-0 max-w-4xl truncate text-[clamp(1.75rem,5vw,3.25rem)] font-semibold uppercase leading-[0.95] tracking-tight">
                {project.title}
              </h3>
              <div className="aspect-[16/9] min-h-0 w-full max-w-2xl motion-safe:lg:aspect-auto motion-safe:lg:flex-1">
                <ProjectCover
                  project={project}
                  fill
                  ref={(el) => {
                    coverRefs.current[project.slug] = el;
                  }}
                />
              </div>
              <p className="line-clamp-2 shrink-0 max-w-xl text-sm leading-relaxed text-muted">
                {project.tagline[locale]}
              </p>
              <div className="flex shrink-0 flex-wrap gap-2 font-mono text-[11px] uppercase tracking-widest text-muted">
                {project.stack.map((tech) => (
                  <span
                    key={tech}
                    className="rounded-full border border-hairline px-2 py-1"
                  >
                    {tech}
                  </span>
                ))}
              </div>
              <TransitionLink
                href={`/projects/${project.slug}`}
                label={`${project.index} — ${project.title}`}
                onClick={() =>
                  saveCoverRect(project.slug, coverRefs.current[project.slug])
                }
                className="btn-fill inline-flex w-fit shrink-0 items-center gap-2 rounded-pill border border-hairline px-5 py-2.5 font-mono text-xs uppercase tracking-widest text-foreground"
              >
                <ScrambleHover text={t.works.viewCase} /> &rarr;
              </TransitionLink>
            </div>
          ))}
        </div>

        <div className="pointer-events-none absolute bottom-6 right-6 hidden font-mono text-xs uppercase tracking-widest text-muted motion-safe:lg:block">
          <span ref={progressRef} className="text-volt">
            01
          </span>{" "}
          &mdash; {String(projects.length).padStart(2, "0")}
        </div>
      </div>
    </section>
  );
}
