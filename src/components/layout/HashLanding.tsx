"use client";

import { useEffect, useRef } from "react";
import { ScrollTrigger } from "@/lib/gsap";
import { fontsReady } from "@/lib/animation";
import { onIntroDone } from "@/lib/introState";
import { useSmoothScroll } from "@/components/providers/SmoothScrollProvider";

/**
 * Owns landing on `/#section` for the landing page. Navigation pushes with
 * `scroll: false` (see TransitionProvider) because the browser/Next native
 * hash jump fires before ScrollTrigger's pins add their scroll distance —
 * every section after the Works pin would land one viewport-width short.
 * This waits until the layout is truly final (intro finished, fonts
 * swapped, pins refreshed) and then lands exactly once.
 */
export function HashLanding() {
  const { lenis } = useSmoothScroll();
  const lenisRef = useRef(lenis);
  useEffect(() => {
    lenisRef.current = lenis;
  }, [lenis]);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;

    let cancelled = false;
    const land = async () => {
      await new Promise<void>((resolve) => onIntroDone(resolve));
      await fontsReady();
      // Two frames so section effects (including the Works pin) have
      // mounted and painted before distances are measured.
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve))
      );
      if (cancelled) return;

      ScrollTrigger.refresh();
      const target = document.querySelector<HTMLElement>(hash);
      if (!target) return;

      const instance = lenisRef.current;
      if (instance) {
        // -64: keep the section heading clear of the fixed h-16 header.
        instance.scrollTo(target, { immediate: true, force: true, offset: -64 });
      } else {
        // Reduced motion: Lenis never initializes — native jump is right.
        target.scrollIntoView();
      }
      ScrollTrigger.update();
    };

    land();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
