"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { GridLines } from "@/components/ui/GridLines";

/**
 * One persistent, viewport-fixed backdrop shared by every page (mounted
 * once in the root layout) — a Swiss-grid column overlay plus two blurred
 * glow blobs that drift slowly as the whole document scrolls. Replaces the
 * per-section `<GridLines>` instances that used to redraw (and misalign)
 * at each section boundary, and gives Hero/About/Works/Skills/Awards/
 * Contact one continuous canvas instead of hard-bordered blocks.
 */
export function AmbientBackground() {
  const rootRef = useRef<HTMLDivElement>(null);
  const glowARef = useRef<HTMLDivElement>(null);
  const glowBRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // No explicit `trigger` element on purpose: an element-based trigger
        // sized off `document.body`/`documentElement` creates a circular
        // dependency with any pinned section on the page (Works' pinned
        // horizontal scroll changes body height, which would then change
        // this trigger's own range on refresh, which could in turn perturb
        // Works' next refresh). `start:0, end:"max"` — the same idiom this
        // codebase already used safely for whole-page scroll tracking —
        // reads total scroll distance without that feedback loop.
        const tl = gsap.timeline({
          scrollTrigger: {
            start: 0,
            end: "max",
            scrub: 1,
            invalidateOnRefresh: true,
          },
        });

        tl.fromTo(
          glowARef.current,
          { yPercent: -20, xPercent: 0 },
          { yPercent: 45, xPercent: 14, ease: "none" },
          0
        ).fromTo(
          glowBRef.current,
          { yPercent: 15, xPercent: 0 },
          { yPercent: -35, xPercent: -16, ease: "none" },
          0
        );

        return () => {
          tl.scrollTrigger?.kill();
          tl.kill();
        };
      });

      return () => mm.revert();
    },
    { scope: rootRef as React.RefObject<HTMLElement> }
  );

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <GridLines columns={5} className="opacity-[0.1]" />
      <div
        ref={glowARef}
        className="absolute -left-[10%] top-[8%] h-[52%] w-[38%] rounded-full bg-volt opacity-[0.13]"
        style={{ filter: "blur(120px)" }}
      />
      <div
        ref={glowBRef}
        className="absolute -right-[6%] bottom-[6%] h-[46%] w-[34%] rounded-full bg-foreground opacity-[0.08]"
        style={{ filter: "blur(130px)" }}
      />
    </div>
  );
}
