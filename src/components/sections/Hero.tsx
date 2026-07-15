"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useLocale } from "@/components/providers/LocaleProvider";
import { HeroHeadline } from "@/components/sections/HeroHeadline";

export function Hero() {
  const { t } = useLocale();
  const contentRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = contentRef.current;
      if (!el) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.to(el, {
          yPercent: 12,
          opacity: 0,
          ease: "none",
          scrollTrigger: {
            trigger: "#top",
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
      className="relative flex min-h-svh flex-col justify-center overflow-hidden px-6 pt-24 pb-16 sm:px-10"
    >
      <div ref={contentRef} className="relative z-10">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted">
          {t.hero.eyebrow}
        </p>

        <HeroHeadline lines={t.hero.lines} />

        <p className="mt-8 max-w-xl font-accent text-2xl italic text-muted sm:text-3xl">
          {t.hero.subline.pre}
          <span className="text-foreground">{t.hero.subline.italic}</span>
          {t.hero.subline.post}
        </p>

        <div className="mt-16 flex flex-wrap gap-x-3 gap-y-2 border-t border-hairline pt-4 font-mono text-xs uppercase tracking-widest text-muted">
          {t.hero.marquee.map((item, i) => (
            <span key={item} className="flex items-center gap-3">
              {item}
              {i < t.hero.marquee.length - 1 && (
                <span aria-hidden="true" className="text-volt">
                  —
                </span>
              )}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
