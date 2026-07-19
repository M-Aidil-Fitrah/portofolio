"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

/**
 * Replaces a static `border-t border-hairline` seam between sections: a
 * 1px volt line that draws itself in (scaleX 0 -> 1) as the section
 * scrolls into view, instead of a flat rule that's always fully there.
 */
export function SectionSeam({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set(el, { scaleX: 0, transformOrigin: "left center" });
        const tween = gsap.to(el, {
          scaleX: 1,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 92%", toggleActions: "play none none reverse" },
        });
        return () => {
          tween.scrollTrigger?.kill();
          tween.kill();
        };
      });

      return () => mm.revert();
    },
    { scope: ref as React.RefObject<HTMLElement> }
  );

  return (
    <div
      aria-hidden="true"
      className={`h-px w-full bg-volt/70 ${className ?? ""}`}
      ref={ref}
    />
  );
}
