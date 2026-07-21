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
  const portraitScrollRef = useRef<HTMLDivElement>(null);
  const portraitRevealRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      const sticky = stickyRef.current;
      const portraitScroll = portraitScrollRef.current;
      const portraitReveal = portraitRevealRef.current;
      if (!root || !sticky || !portraitScroll || !portraitReveal) return;

      const mm = gsap.matchMedia();
      mm.add(
        {
          reduceMotion: "(prefers-reduced-motion: reduce)",
          canHover: "(pointer: fine)",
        },
        (context) => {
          const { reduceMotion, canHover } = context.conditions as {
            reduceMotion: boolean;
            canHover: boolean;
          };
          if (reduceMotion) return;

          let entrance: gsap.core.Timeline | undefined;
          let scrollMotion: gsap.core.Timeline | undefined;

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

            const marquee = sticky.querySelector<HTMLElement>("[data-hero-marquee]");
            scrollMotion = gsap
              .timeline({
                scrollTrigger: {
                  trigger: root,
                  start: "top top",
                  end: "bottom bottom",
                  scrub: 0.8,
                },
              })
              .to(portraitScroll, { scale: 1.04, duration: 1, ease: "none" }, 0)
              .to(
                marquee,
                { xPercent: -7, duration: 1, ease: "none" },
                0
              );
          };

          const removeIntroListener = onIntroDone(playEntrance);

          let removePointerListeners: (() => void) | undefined;
          if (canHover) {
            const motionLayer = portraitScroll.querySelector<HTMLElement>(
              "[data-hero-portrait-motion]"
            );
            if (motionLayer) {
              const xTo = gsap.quickTo(motionLayer, "x", {
                duration: DUR.base,
                ease: EASE.out,
              });
              const yTo = gsap.quickTo(motionLayer, "y", {
                duration: DUR.base,
                ease: EASE.out,
              });

              const handlePointerMove = (event: PointerEvent) => {
                const x = event.clientX / window.innerWidth - 0.5;
                const y = event.clientY / window.innerHeight - 0.5;
                xTo(x * 18);
                yTo(y * 10);
              };
              const resetPointer = () => {
                xTo(0);
                yTo(0);
              };

              sticky.addEventListener("pointermove", handlePointerMove);
              sticky.addEventListener("pointerleave", resetPointer);
              removePointerListeners = () => {
                sticky.removeEventListener("pointermove", handlePointerMove);
                sticky.removeEventListener("pointerleave", resetPointer);
              };
            }
          }

          return () => {
            removeIntroListener();
            removePointerListeners?.();
            entrance?.kill();
            scrollMotion?.kill();
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

        <div
          ref={portraitScrollRef}
          className="pointer-events-none absolute bottom-[-36svh] left-1/2 z-20 h-[125svh] aspect-[2/3] -translate-x-1/2 sm:bottom-[-50svh] sm:h-[150svh]"
        >
          <div data-hero-portrait-motion className="h-full w-full">
            <div ref={portraitRevealRef} className="relative h-full w-full">
              <Image
                src="/assets/orang/FotoUSKcrop.png"
                alt={t.hero.fullName}
                fill
                priority
                sizes="(max-width: 767px) 64vw, 42vw"
                className="object-contain object-bottom"
              />
            </div>
          </div>
        </div>

        <p
          data-hero-detail
          className="absolute left-6 top-[24%] z-30 max-w-[9.5rem] font-accent text-base italic leading-tight text-muted sm:left-10 sm:max-w-xs sm:text-xl md:top-[39%]"
        >
          {t.hero.subline.pre}
          <span className="text-foreground">{t.hero.subline.italic}</span>
          {t.hero.subline.post}
        </p>

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

        <div
          data-hero-detail
          className="absolute right-10 top-[39%] z-30 hidden max-w-[15rem] text-right font-mono text-xs uppercase tracking-widest md:block"
        >
          <span className="block text-muted">{t.hero.statusLabel}</span>
          <span className="mt-1 block text-foreground">{t.hero.status}</span>
        </div>
      </div>
    </section>
  );
}
