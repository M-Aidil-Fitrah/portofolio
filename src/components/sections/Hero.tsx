"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useLocale } from "@/components/providers/LocaleProvider";
import { HeroHeadline } from "@/components/sections/HeroHeadline";
import { TechIcon } from "@/components/ui/TechIcon";
import { LiveClock } from "@/components/ui/LiveClock";
import { MagneticButton } from "@/components/ui/MagneticButton";

export function Hero() {
  const { t } = useLocale();
  const contentRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = contentRef.current;
      if (!el) return;
      const section = el.closest("#top") ?? el;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.to(el, {
          yPercent: 12,
          opacity: 0,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "60% top",
            end: "bottom top",
            scrub: 0.5,
          },
        });
      });

      return () => mm.revert();
    },
    { scope: contentRef as React.RefObject<HTMLElement> }
  );

  return (
    <section
      id="top"
      aria-label="Intro"
      className="relative h-svh overflow-hidden px-6 sm:px-10"
    >
      <div
        ref={contentRef}
        className="relative z-10 flex h-full flex-col justify-between pt-24 pb-8 sm:pb-10"
      >
        <div className="mx-auto w-full max-w-[1800px]">
          <div className="grid grid-cols-2 items-center border-y border-hairline py-3 font-mono text-xs uppercase tracking-widest text-muted sm:grid-cols-3">
            <p>{t.hero.eyebrow}</p>
            <span
              aria-hidden="true"
              className="hidden h-2 w-2 justify-self-center border border-volt sm:block"
            />
            <p className="justify-self-end tabular-nums">
              <LiveClock />
            </p>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[1800px]">
          <p className="font-mono text-xs uppercase tracking-widest text-muted">
            {t.hero.fullName}
          </p>

          <HeroHeadline text={t.hero.wordmark} />

          <p className="mt-4 max-w-2xl font-accent text-2xl italic leading-tight text-muted sm:text-3xl">
            {t.hero.subline.pre}
            <span className="text-foreground">{t.hero.subline.italic}</span>
            {t.hero.subline.post}
          </p>
        </div>

        <div className="mx-auto w-full max-w-[1800px]">
          <div className="grid grid-cols-1 items-stretch gap-6 border-t border-hairline pt-6 md:grid-cols-[1fr_auto] md:items-center md:gap-10">
            <div className="grid gap-6 sm:grid-cols-3">
              {t.hero.highlights.map((item) => (
                <div key={item.label} className="flex items-center gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-hairline text-volt">
                    <TechIcon name={item.icon} className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block font-mono text-xs uppercase tracking-widest text-foreground">
                      {item.label}
                    </span>
                    <span className="mt-1 block text-sm text-muted">
                      {item.detail}
                    </span>
                  </span>
                </div>
              ))}
            </div>

            <MagneticButton
              href="#works"
              data-cursor={t.hero.cta}
              className="inline-flex h-14 items-center justify-center rounded-full border border-volt px-8 font-mono text-xs uppercase tracking-widest text-volt transition-colors hover:bg-volt hover:text-ink"
            >
              {t.hero.cta}
            </MagneticButton>
          </div>
        </div>
      </div>
    </section>
  );
}
