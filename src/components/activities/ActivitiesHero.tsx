"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { DUR, EASE } from "@/lib/animation";
import { AnimatedText } from "@/components/ui/AnimatedText";
import { useLocale } from "@/components/providers/LocaleProvider";

/** Page header for /activities — label, oversized heading, intro line. */
export function ActivitiesHero() {
  const { t } = useLocale();
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tween = gsap.from(root.querySelectorAll("[data-hero-rise]"), {
          y: 24,
          opacity: 0,
          duration: DUR.fast,
          ease: EASE.out,
          stagger: 0.08,
          delay: 0.3,
        });
        return () => {
          tween.kill();
        };
      });
      return () => mm.revert();
    },
    { scope: rootRef as React.RefObject<HTMLElement> }
  );

  return (
    <div ref={rootRef} className="pt-28">
      <p
        data-hero-rise
        className="font-mono text-xs uppercase tracking-widest text-muted"
      >
        ({t.activities.label})
      </p>
      <AnimatedText
        as="h1"
        type="chars"
        scrollTrigger={false}
        className="mt-6 text-[clamp(2.5rem,10vw,8rem)] font-semibold uppercase leading-[0.92] tracking-tight"
      >
        {t.activities.heading}
      </AnimatedText>
      <p
        data-hero-rise
        className="mt-6 max-w-xl text-base leading-relaxed text-muted"
      >
        {t.activities.intro}
      </p>
    </div>
  );
}
