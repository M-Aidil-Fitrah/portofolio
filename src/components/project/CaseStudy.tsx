"use client";

import { useRef } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { TransitionLink } from "@/components/layout/TransitionLink";
import { AnimatedText } from "@/components/ui/AnimatedText";
import { ProjectCover } from "@/components/project/ProjectCover";
import { ProjectGallery } from "@/components/project/ProjectGallery";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { DUR, EASE, STAGGER } from "@/lib/animation";
import { consumeCoverRect } from "@/lib/flipTransition";
import type { Project } from "@/lib/projects";

export function CaseStudy({ project }: { project: Project }) {
  const { t, locale } = useLocale();
  const articleRef = useRef<HTMLElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const metaRef = useRef<HTMLDListElement>(null);
  const featuresRef = useRef<HTMLOListElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const article = articleRef.current;
      const cover = coverRef.current;
      const meta = metaRef.current;
      const features = featuresRef.current;
      const progress = progressRef.current;
      if (!article) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const cleanups: (() => void)[] = [];

        // Scroll progress bar down the top edge of the whole case study.
        if (progress) {
          const st = ScrollTrigger.create({
            trigger: "html",
            start: "top top",
            end: "bottom bottom",
            onUpdate: (self) => {
              gsap.set(progress, { scaleX: self.progress });
            },
          });
          cleanups.push(() => st.kill());
        }

        // Meta row (role/year/stack/links) rises in just after the title.
        if (meta) {
          const tween = gsap.fromTo(
            meta.children,
            { y: 24, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: DUR.fast,
              ease: EASE.out,
              stagger: STAGGER.items,
              delay: 0.4,
            }
          );
          cleanups.push(() => tween.kill());
        }

        // Cover: manual FLIP-in from the clicked card's on-screen rect, if
        // we have one (arrives via sessionStorage, set by Works.tsx).
        if (cover) {
          const saved = consumeCoverRect(project.slug);
          if (saved) {
            const raf = requestAnimationFrame(() => {
              const current = cover.getBoundingClientRect();
              if (!current.width || !current.height) return;
              gsap.fromTo(
                cover,
                {
                  x: saved.left - current.left,
                  y: saved.top - current.top,
                  scaleX: saved.width / current.width,
                  scaleY: saved.height / current.height,
                  transformOrigin: "top left",
                },
                {
                  x: 0,
                  y: 0,
                  scaleX: 1,
                  scaleY: 1,
                  duration: 1,
                  ease: EASE.out,
                  delay: 0.15,
                }
              );
            });
            cleanups.push(() => cancelAnimationFrame(raf));
          } else {
            const tween = gsap.from(cover, {
              clipPath: "inset(100% 0 0 0 round 1.5rem)",
              duration: DUR.slow,
              ease: EASE.inOut,
            });
            cleanups.push(() => tween.kill());
          }
        }

        // Feature rows stagger in as they scroll into view.
        if (features) {
          const tween = gsap.fromTo(
            features.children,
            { y: 40, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: DUR.fast,
              ease: EASE.out,
              stagger: STAGGER.items,
              scrollTrigger: { trigger: features, start: "top 85%", toggleActions: "play none none reverse" },
            }
          );
          cleanups.push(() => {
            tween.scrollTrigger?.kill();
            tween.kill();
          });
        }

        return () => cleanups.forEach((fn) => fn());
      });

      return () => mm.revert();
    },
    {
      scope: articleRef as React.RefObject<HTMLElement>,
      dependencies: [project.slug],
      revertOnUpdate: true,
    }
  );

  return (
    <article ref={articleRef} className="relative">
      <div
        ref={progressRef}
        aria-hidden="true"
        className="fixed left-0 top-0 z-[60] h-px w-full origin-left scale-x-0 bg-volt"
      />

      <div className="px-6 pt-28 sm:px-10">
        <div className="mx-auto max-w-[1600px]">
          <TransitionLink
            href="/#works"
            label={t.works.label}
            className="font-mono text-xs uppercase tracking-widest text-muted transition-colors hover:text-volt"
          >
            &larr; {t.works.label} / {project.index}
          </TransitionLink>

          <AnimatedText
            as="h1"
            type="chars"
            scrollTrigger={false}
            className="mt-6 text-[clamp(2.5rem,10vw,8rem)] font-semibold uppercase leading-[0.92] tracking-tight"
          >
            {project.title}
          </AnimatedText>

          <dl
            ref={metaRef}
            className="mt-10 grid grid-cols-2 gap-x-6 gap-y-6 border-y border-hairline py-6 font-mono text-xs uppercase tracking-widest sm:grid-cols-4"
          >
            <div>
              <dt className="text-muted">{t.project.meta.role}</dt>
              <dd className="mt-1 text-foreground normal-case tracking-normal">
                {project.role[locale]}
              </dd>
            </div>
            <div>
              <dt className="text-muted">{t.project.meta.year}</dt>
              <dd className="mt-1 text-foreground">{project.year}</dd>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <dt className="text-muted">{t.project.meta.stack}</dt>
              <dd className="mt-1 text-foreground normal-case tracking-normal">
                {project.stack.join(", ")}
              </dd>
            </div>
            <div>
              <dt className="text-muted">{t.project.meta.links}</dt>
              <dd className="mt-1 flex gap-4 text-foreground">
                {project.links?.live || project.links?.repo ? (
                  <>
                    {project.links.live && (
                      <a
                        href={project.links.live}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline decoration-hairline underline-offset-4 hover:text-volt"
                      >
                        {t.project.live}
                      </a>
                    )}
                    {project.links.repo && (
                      <a
                        href={project.links.repo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline decoration-hairline underline-offset-4 hover:text-volt"
                      >
                        {t.project.repo}
                      </a>
                    )}
                  </>
                ) : (
                  <span className="normal-case tracking-normal text-muted">
                    &mdash;
                  </span>
                )}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-12 px-6 sm:px-10">
        <div className="mx-auto max-w-[1600px]">
          <ProjectCover project={project} ref={coverRef} />
        </div>
      </div>

      <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-12 px-6 py-20 sm:px-10 lg:grid-cols-[200px_minmax(0,60ch)]">
        <p className="font-mono text-xs uppercase tracking-widest text-muted lg:sticky lg:top-28 lg:self-start">
          ({t.project.overview})
        </p>
        <div className="space-y-8">
          <AnimatedText
            as="p"
            className="text-lg leading-relaxed text-foreground/90"
          >
            {project.caseStudy.overview[locale]}
          </AnimatedText>
          <div>
            <h2 className="font-mono text-xs uppercase tracking-widest text-muted">
              {t.project.problem}
            </h2>
            <AnimatedText
              as="p"
              className="mt-3 text-lg leading-relaxed text-foreground/90"
            >
              {project.caseStudy.problem[locale]}
            </AnimatedText>
          </div>
        </div>
      </div>

      <div className="border-t border-hairline px-6 py-20 sm:px-10">
        <div className="mx-auto max-w-[1600px]">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted">
            {t.project.features}
          </h2>
          <ol
            ref={featuresRef}
            className="mt-8 divide-y divide-hairline border-t border-hairline"
          >
            {project.caseStudy.features.map((feature, i) => (
              <li
                key={feature.title.en}
                className="grid grid-cols-1 gap-3 py-8 sm:grid-cols-[80px_1fr_minmax(0,45ch)]"
              >
                <span className="font-mono text-sm text-volt">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="text-xl font-semibold uppercase tracking-tight">
                  {feature.title[locale]}
                </p>
                <p className="text-sm leading-relaxed text-muted">
                  {feature.body[locale]}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <ProjectGallery project={project} />

      <div className="border-t border-hairline px-6 py-20 sm:px-10">
        <div className="mx-auto max-w-[1600px]">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted">
            {t.project.outcome}
          </h2>
          <AnimatedText
            as="p"
            className="mt-4 max-w-3xl text-2xl font-medium leading-snug tracking-tight sm:text-4xl"
          >
            {project.caseStudy.outcome[locale]}
          </AnimatedText>
        </div>
      </div>
    </article>
  );
}
