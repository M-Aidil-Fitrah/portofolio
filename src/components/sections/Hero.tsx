"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { DUR, EASE, STAGGER } from "@/lib/animation";
import { onIntroDone } from "@/lib/introState";
import { useLocale } from "@/components/providers/LocaleProvider";
import { HeroHeadline } from "@/components/sections/HeroHeadline";
import { LiveClock } from "@/components/ui/LiveClock";

export function Hero() {
  const { t } = useLocale();
  const rootRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const portraitRevealRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      const sticky = stickyRef.current;
      const portraitReveal = portraitRevealRef.current;
      if (!root || !sticky || !portraitReveal) return;

      const mm = gsap.matchMedia();
      mm.add(
        {
          reduceMotion: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          const { reduceMotion } = context.conditions as {
            reduceMotion: boolean;
          };
          if (reduceMotion) return;

          let entrance: gsap.core.Timeline | undefined;

          const playEntrance = () => {
            const details = sticky.querySelectorAll("[data-hero-detail]");

            gsap.set(portraitReveal, {
              clipPath: "inset(100% 0% 0% 0%)",
              scale: 1.08,
              filter: "grayscale(1)",
              transformOrigin: "center bottom",
            });

            entrance = gsap
              .timeline()
              .to(
                portraitReveal,
                {
                  clipPath: "inset(0% 0% 0% 0%)",
                  scale: 1,
                  filter: "grayscale(0)",
                  duration: DUR.slow,
                  ease: EASE.expo,
                },
                0
              )
              .from(
                details,
                {
                  y: 20,
                  opacity: 0,
                  stagger: STAGGER.items,
                  duration: DUR.base,
                  ease: EASE.out,
                },
                0.24
              );

          };

          const removeIntroListener = onIntroDone(playEntrance);

          return () => {
            removeIntroListener();
            entrance?.kill();
          };
        }
      );

      return () => mm.revert();
    },
    { scope: rootRef as React.RefObject<HTMLElement> }
  );

  return (
    <section
      ref={rootRef}
      id="top"
      aria-label="Intro"
      className="hero-scroll-stage relative bg-ink"
    >
      <div
        ref={stickyRef}
        className="hero-scroll-viewport overflow-hidden bg-ink"
      >
        <div
          data-hero-detail
          className="absolute inset-x-6 top-20 z-30 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted sm:inset-x-10 sm:text-xs"
        >
          <p>{t.hero.eyebrow}</p>
          <p className="tabular-nums">
            <LiveClock />
          </p>
        </div>

        <div
          data-hero-marquee
          className="absolute inset-x-0 top-[56%] z-10 -translate-y-1/2 sm:top-[57%]"
        >
          <HeroHeadline text={t.hero.fullName} />
        </div>

        <div className="pointer-events-none absolute bottom-[-39svh] left-1/2 z-20 h-[130svh] aspect-[2/3] -translate-x-1/2 sm:bottom-[-56svh] sm:h-[156svh]">
          <div ref={portraitRevealRef} className="relative h-full w-full">
            <Image
              src="/assets/orang/FotoUSKcrop.webp"
              alt={t.hero.fullName}
              fill
              priority
              sizes="(max-width: 767px) 70vw, 46vw"
              className="object-contain object-bottom"
            />
          </div>
        </div>

        <a
          data-hero-detail
          href="#works"
          data-cursor={t.hero.cta}
          className="group absolute right-6 top-[24%] z-30 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-volt sm:right-10 sm:text-xs md:top-auto md:bottom-[8%]"
        >
          {t.hero.cta}
          <span
            aria-hidden="true"
            className="inline-block transition-transform duration-300 group-hover:translate-x-1"
          >
            -&gt;
          </span>
        </a>

        <div
          data-hero-detail
          className="absolute bottom-[8%] left-10 z-30 hidden font-mono text-xs uppercase tracking-widest md:block"
        >
          <span className="block text-muted">{t.hero.locationLabel}</span>
          <span className="mt-1 block text-foreground">{t.hero.location}</span>
        </div>

      </div>
    </section>
  );
}
