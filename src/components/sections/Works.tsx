"use client";

import { useRef } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
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
  const pinRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const coverRefs = useRef<Record<string, HTMLDivElement | null>>({});

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

          const tween = gsap.to(track, {
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
            if (!cancelled) ScrollTrigger.refresh();
          });

          return () => {
            cancelled = true;
            tween.scrollTrigger?.kill();
            tween.kill();
          };
        }
      );

      return () => mm.revert();
    },
    { scope: pinRef as React.RefObject<HTMLElement>, dependencies: [locale] }
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
        className="relative mt-12 overflow-hidden lg:mt-16 lg:h-svh"
      >
        <div
          ref={trackRef}
          className="flex flex-col lg:h-full lg:flex-row lg:flex-nowrap"
        >
          {projects.map((project) => (
            <div
              key={project.slug}
              data-cursor={t.works.viewCase}
              className="work-panel flex w-full min-h-0 shrink-0 flex-col gap-3 border-t border-hairline px-6 py-8 sm:px-10 lg:h-full lg:w-screen lg:justify-center lg:gap-4 lg:border-t-0 lg:border-l lg:py-10"
            >
              <span className="font-mono text-sm text-volt">
                {project.index}{" "}
                <span className="text-muted">
                  / {String(projects.length).padStart(2, "0")}
                </span>
              </span>
              <h3 className="max-w-4xl text-[clamp(2rem,6vw,4.5rem)] font-semibold uppercase leading-[0.95] tracking-tight">
                {project.title}
              </h3>
              <div className="w-full max-w-2xl min-h-0">
                <ProjectCover
                  project={project}
                  className="max-h-[38svh]"
                  ref={(el) => {
                    coverRefs.current[project.slug] = el;
                  }}
                />
              </div>
              <p className="max-w-xl text-sm leading-relaxed text-muted">
                {project.tagline[locale]}
              </p>
              <div className="flex flex-wrap gap-2 font-mono text-[11px] uppercase tracking-widest text-muted">
                {project.stack.map((tech) => (
                  <span
                    key={tech}
                    className="border border-hairline px-2 py-1"
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
                className="inline-flex w-fit items-center gap-2 font-mono text-xs uppercase tracking-widest text-foreground transition-colors hover:text-volt"
              >
                <ScrambleHover text={t.works.viewCase} /> &rarr;
              </TransitionLink>
            </div>
          ))}
        </div>

        <div className="pointer-events-none absolute bottom-6 right-6 hidden font-mono text-xs uppercase tracking-widest text-muted lg:block">
          <span ref={progressRef} className="text-volt">
            01
          </span>{" "}
          &mdash; {String(projects.length).padStart(2, "0")}
        </div>
      </div>
    </section>
  );
}
