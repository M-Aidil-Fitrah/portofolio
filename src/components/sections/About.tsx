"use client";

import Image from "next/image";
import { useRef } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { AnimatedText } from "@/components/ui/AnimatedText";
import { SectionSeam } from "@/components/ui/SectionSeam";
import { gsap, useGSAP } from "@/lib/gsap";
import { DUR, EASE, STAGGER } from "@/lib/animation";
import { useSectionReveal } from "@/lib/useSectionReveal";

/** Animates a stat's numeric lead-in from 0 once it enters view, preserving
 * any trailing unit text (e.g. "6th", "3.74") by splitting on the first
 * non-numeric character. Falls back to the static value if it can't parse. */
function StatValue({ value }: { value: string }) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      const match = value.match(/^(\d+(\.\d+)?)(.*)$/);
      if (!el || !match) return;

      const target = parseFloat(match[1]);
      const decimals = match[2] ? match[2].length - 1 : 0;
      const suffix = match[3] ?? "";

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const counter = { value: 0 };
        el.textContent = `${(0).toFixed(decimals)}${suffix}`;

        const tween = gsap.to(counter, {
          value: target,
          duration: 1.4,
          ease: EASE.out,
          scrollTrigger: { trigger: el, start: "top 90%", once: true },
          onUpdate: () => {
            el.textContent = `${counter.value.toFixed(decimals)}${suffix}`;
          },
        });
        return () => {
          tween.scrollTrigger?.kill();
          tween.kill();
        };
      });

      return () => mm.revert();
    },
    { scope: ref as React.RefObject<HTMLElement>, dependencies: [value] }
  );

  return (
    <dd ref={ref} className="font-mono text-3xl text-volt">
      {value}
    </dd>
  );
}

export function About() {
  const { t, locale } = useLocale();
  const sectionRef = useRef<HTMLElement>(null);
  const portraitRef = useRef<HTMLDivElement>(null);
  const portraitImgRef = useRef<HTMLImageElement>(null);
  const orgListRef = useRef<HTMLUListElement>(null);
  const [introParagraph, ...detailParagraphs] = t.about.paragraphs;

  useSectionReveal(sectionRef);

  useGSAP(
    () => {
      const wrap = portraitRef.current;
      const img = portraitImgRef.current;
      if (!wrap || !img) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const reveal = gsap.fromTo(
          wrap,
          {
            clipPath: "inset(0% 0% 100% 0% round 1.5rem)",
            opacity: 0,
            scale: 0.94,
          },
          {
            clipPath: "inset(0% 0% 0% 0% round 1.5rem)",
            opacity: 1,
            scale: 1,
            duration: DUR.slow,
            ease: EASE.expo,
            scrollTrigger: { trigger: wrap, start: "top 85%", once: true },
          }
        );

        const parallax = gsap.fromTo(
          img,
          { yPercent: -8, scale: 1.15 },
          {
            yPercent: 8,
            scale: 1.15,
            ease: "none",
            scrollTrigger: {
              trigger: wrap,
              start: "top bottom",
              end: "bottom top",
              scrub: 0.6,
            },
          }
        );

        const colorReveal = gsap.fromTo(
          img,
          { filter: "grayscale(1)" },
          {
            filter: "grayscale(0)",
            ease: "none",
            scrollTrigger: {
              trigger: wrap,
              start: "top 70%",
              end: "top 30%",
              scrub: 0.6,
            },
          }
        );

        return () => {
          reveal.scrollTrigger?.kill();
          parallax.scrollTrigger?.kill();
          colorReveal.scrollTrigger?.kill();
        };
      });

      return () => mm.revert();
    },
    { scope: portraitRef as React.RefObject<HTMLElement>, dependencies: [] }
  );

  useGSAP(
    () => {
      const list = orgListRef.current;
      if (!list) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const items = list.querySelectorAll("li");
        const tween = gsap.from(items, {
          y: 40,
          opacity: 0,
          duration: DUR.fast,
          ease: EASE.out,
          stagger: STAGGER.items,
          scrollTrigger: { trigger: list, start: "top 85%", once: true },
        });
        return () => {
          tween.scrollTrigger?.kill();
          tween.kill();
        };
      });

      return () => mm.revert();
    },
    { scope: orgListRef as React.RefObject<HTMLElement>, dependencies: [] }
  );

  return (
    <section
      ref={sectionRef}
      id="about"
      aria-labelledby="about-heading"
      className="relative px-6 pb-24 pt-16 sm:px-10 lg:pb-32 lg:pt-20"
    >
      <div className="relative z-10 mx-auto max-w-[1600px]">
        <SectionSeam className="mb-14 lg:mb-16" />
        <SectionHeading index="01" label={t.about.label} meta={t.about.meta} />

        <div className="mx-auto mt-14 max-w-5xl text-center sm:mt-16">
          <AnimatedText
            as="h2"
            id="about-heading"
            scrub
            className="text-[clamp(2.35rem,7vw,7.5rem)] font-semibold uppercase leading-[0.9] tracking-tight"
          >
            {t.about.heading.pre}
            <span className="font-accent italic normal-case text-volt">
              {t.about.heading.italic}
            </span>
            {t.about.heading.post}
          </AnimatedText>

          {introParagraph && (
            <AnimatedText
              as="p"
              className="mx-auto mt-8 max-w-3xl text-lg leading-relaxed text-foreground/85 sm:text-xl"
            >
              {introParagraph}
            </AnimatedText>
          )}

          <div className="mt-10 flex justify-center">
            <a
              href="#contact"
              data-cursor={t.about.ctaLabel}
              className="btn-fill inline-flex min-h-12 items-center justify-center rounded-pill border border-volt px-6 font-mono text-xs uppercase tracking-widest text-volt"
            >
              {t.about.ctaLabel}
            </a>
          </div>
        </div>

        <div className="mt-20 grid grid-cols-1 gap-12 border-t border-hairline pt-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-20 lg:pt-16">
          <div
            ref={portraitRef}
            className="relative aspect-[2/3] w-full max-w-md overflow-hidden rounded-card bg-surface lg:sticky lg:top-28"
          >
            <Image
              ref={portraitImgRef}
              src="/assets/orang/FotoUSKcrop.png"
              alt={
                locale === "id"
                  ? "Foto Muhammad Aidil Fitrah"
                  : "Portrait of Muhammad Aidil Fitrah"
              }
              width={1600}
              height={2400}
              sizes="(max-width: 1024px) 100vw, 40vw"
              quality={75}
              className="h-full w-full object-cover grayscale transition-[filter] duration-700 hover:grayscale-0"
            />
          </div>

          <div>
            <div className="max-w-2xl space-y-5 text-lg leading-relaxed text-foreground/90">
              {detailParagraphs.map((paragraph) => (
                <AnimatedText as="p" key={paragraph}>
                  {paragraph}
                </AnimatedText>
              ))}
            </div>

            <dl className="mt-12 grid grid-cols-2 gap-6 border-t border-hairline pt-8 sm:grid-cols-4">
              {t.about.stats.map((stat) => (
                <div key={stat.label}>
                  <dt className="sr-only">{stat.label}</dt>
                  <StatValue value={stat.value} />
                  <dd className="mt-1 font-mono text-xs uppercase tracking-widest text-muted">
                    {stat.label}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-12 border-t border-hairline pt-8">
              <h3 className="font-mono text-xs uppercase tracking-widest text-muted">
                {t.about.organizationsLabel}
              </h3>
              <ul ref={orgListRef} className="mt-4 space-y-6">
                {t.about.organizations.map((org) => (
                  <li
                    key={org.org}
                    className="border-b border-hairline pb-6 last:border-b-0"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <p className="font-semibold uppercase tracking-normal">
                        {org.org}
                      </p>
                      <p className="font-mono text-xs uppercase tracking-widest text-muted">
                        {org.period}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-muted">{org.role}</p>
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-foreground/80">
                      {org.detail}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
