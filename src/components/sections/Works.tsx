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
import { DUR, EASE, fontsReady } from "@/lib/animation";
import { projects } from "@/lib/projects";
import { saveCoverRect } from "@/lib/flipTransition";

export function Works() {
  const { t, locale } = useLocale();
  const { lenis } = useSmoothScroll();
  const pinRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const coverRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Outside the pin deps so the hash correction sees a fresh Lenis.
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

          const scrub = gsap.to(track, {
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

          // Driven by the scrub, so each panel is directed as it crosses.
          panels.forEach((panel) => {
            const coverWrap = panel.querySelector<HTMLElement>(".work-cover");
            const title = panel.querySelector<HTMLElement>("h3");

            if (coverWrap) {
              gsap.fromTo(
                coverWrap,
                { xPercent: 5, scale: 0.97 },
                {
                  xPercent: -5,
                  scale: 1,
                  ease: "none",
                  scrollTrigger: {
                    containerAnimation: scrub,
                    trigger: panel,
                    start: "left right",
                    end: "right left",
                    scrub: true,
                  },
                }
              );
            }
            if (title) {
              gsap.from(title, {
                yPercent: 70,
                opacity: 0,
                immediateRender: false,
                duration: DUR.base,
                ease: EASE.expo,
                scrollTrigger: {
                  containerAnimation: scrub,
                  trigger: panel,
                  start: "left 75%",
                  toggleActions: "play none none reverse",
                },
              });
            }
          });

          // Fonts swap in after first paint and shift track width.
          let cancelled = false;
          fontsReady().then(() => {
            if (cancelled) return;
            ScrollTrigger.refresh();

            // A later-section hash resolves before this pin adds its distance.
            const hash = window.location.hash;
            if (hash) {
              const target = document.querySelector<HTMLElement>(hash);
              if (target) lenisRef.current?.scrollTo(target, { immediate: true });
            }
          });

          // No manual kill: matchMedia already reverts everything here.
          return () => {
            cancelled = true;
          };
        }
      );

      return () => mm.revert();
    },
    // No `locale` dep: panel width is the viewport, not the text.
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
        // Pinned at its natural top, so `pt-16` clears the fixed header.
        className="relative mt-8 motion-safe:lg:mt-0 motion-safe:lg:h-dvh motion-safe:lg:overflow-hidden motion-safe:lg:pt-16"
      >
        <div
          ref={trackRef}
          className="flex flex-col motion-safe:lg:h-full motion-safe:lg:flex-row motion-safe:lg:flex-nowrap"
        >
          {projects.map((project) => (
            // The whole panel is the link; the pill below is only an affordance.
            <TransitionLink
              key={project.slug}
              href={`/projects/${project.slug}`}
              label={`${project.index} — ${project.title}`}
              aria-label={`${project.title} — ${t.works.viewCase}`}
              data-cursor={`${t.works.viewCase} — ${project.title}`}
              onClick={() =>
                saveCoverRect(project.slug, coverRefs.current[project.slug])
              }
              className="work-panel group grid min-h-0 w-full shrink-0 gap-3 border-t border-hairline px-6 py-8 sm:px-10 motion-safe:lg:h-full motion-safe:lg:w-screen motion-safe:lg:grid-cols-[minmax(340px,0.58fr)_minmax(0,1fr)] motion-safe:lg:items-center motion-safe:lg:gap-14 motion-safe:lg:border-l motion-safe:lg:border-t-0 motion-safe:lg:py-12"
            >
              <div className="flex min-w-0 flex-col gap-3 motion-safe:lg:gap-5">
                <span className="shrink-0 font-mono text-sm text-volt">
                  {project.index}{" "}
                  <span className="text-muted">
                    / {String(projects.length).padStart(2, "0")}
                  </span>
                </span>
                <h3 className="shrink-0 max-w-4xl text-[clamp(1.75rem,5vw,4.75rem)] font-semibold uppercase leading-[0.95] tracking-tight">
                  {project.title}
                </h3>
                <p className="line-clamp-3 shrink-0 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
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
                <span className="btn-fill inline-flex w-fit shrink-0 items-center gap-2 rounded-pill border border-hairline px-5 py-2.5 font-mono text-xs uppercase tracking-widest text-foreground">
                  <ScrambleHover text={t.works.viewCase} /> &rarr;
                </span>
              </div>
              <div className="work-cover aspect-[16/9] min-h-0 w-full max-w-2xl motion-safe:lg:aspect-auto motion-safe:lg:h-[min(62svh,620px)] motion-safe:lg:max-w-none">
                <ProjectCover
                  project={project}
                  fill
                  ref={(el) => {
                    coverRefs.current[project.slug] = el;
                  }}
                />
              </div>
            </TransitionLink>
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
