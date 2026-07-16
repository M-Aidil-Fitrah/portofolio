"use client";

import type { RefObject } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { DUR, EASE } from "@/lib/animation";

/** Fades + rises a section's whole wrapper in as it scrolls into view —
 * layered on top of that section's own per-element reveals (headings,
 * stats, etc.) to give each section a clear, connected "arrival" instead
 * of just appearing already in its final state. */
export function useSectionReveal(
  ref: RefObject<HTMLElement | null>,
  deps: unknown[] = []
) {
  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tween = gsap.fromTo(
          el,
          { opacity: 0, y: 56 },
          {
            opacity: 1,
            y: 0,
            duration: DUR.slow,
            ease: EASE.expo,
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          }
        );
        return () => {
          tween.scrollTrigger?.kill();
          tween.kill();
        };
      });

      return () => mm.revert();
    },
    { scope: ref as RefObject<HTMLElement>, dependencies: deps }
  );
}
