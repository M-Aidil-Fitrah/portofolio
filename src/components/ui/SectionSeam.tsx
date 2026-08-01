"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

/** A volt seam that draws itself in as the section scrolls into view. */
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
