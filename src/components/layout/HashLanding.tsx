"use client";

import { useEffect, useRef } from "react";
import { ScrollTrigger } from "@/lib/gsap";
import { fontsReady } from "@/lib/animation";
import { onIntroDone } from "@/lib/introState";
import { useSmoothScroll } from "@/components/providers/SmoothScrollProvider";

/** Lands on `/#section` only once pins are refreshed and layout is final. */
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
      // Two frames so pins have mounted before distances are measured.
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
