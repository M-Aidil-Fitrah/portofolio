"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { DUR, EASE } from "@/lib/animation";
import { useSmoothScroll } from "@/components/providers/SmoothScrollProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import { Logomark } from "@/components/ui/Logomark";
import {
  markIntroDone,
  markPreloaderShown,
  shouldShowPreloader,
} from "@/lib/introState";

const listeners = new Set<() => void>();

function getServerSnapshot() {
  return false;
}

function getSnapshot() {
  return shouldShowPreloader();
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function markShown() {
  markPreloaderShown();
  listeners.forEach((listener) => listener());
}

/**
 * Solid ink curtain with a counter, and the header's logomark drawing
 * itself in sync via GSAP's DrawSVG plugin — finishes exactly as the
 * counter hits 100. When this won't render at all (reduced motion, or
 * already shown this session), it still owns firing `markIntroDone()` so
 * Hero's gated entrances aren't left waiting forever.
 */
export function Preloader() {
  const shouldRender = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<SVGSVGElement>(null);
  const { lenis } = useSmoothScroll();
  const { t } = useLocale();

  useEffect(() => {
    if (!shouldRender) markIntroDone();
  }, [shouldRender]);

  useGSAP(
    () => {
      if (!shouldRender || !rootRef.current || !counterRef.current) return;

      lenis?.stop();
      document.body.style.overflow = "hidden";

      const strokes = logoRef.current
        ? Array.from(
            logoRef.current.querySelectorAll<SVGPathElement>(
              "[data-logomark-stroke]"
            )
          )
        : [];

      const counter = { value: 0 };
      const tl = gsap.timeline({
        onComplete: () => {
          lenis?.start();
          document.body.style.overflow = "";
          markIntroDone();
          markShown();
          ScrollTrigger.refresh();
        },
      });

      tl.set(strokes, { drawSVG: "0%" }, 0)
        .to(
          counter,
          {
            value: 100,
            duration: DUR.preloader,
            ease: "power2.inOut",
            onUpdate: () => {
              if (counterRef.current) {
                counterRef.current.textContent = String(
                  Math.round(counter.value)
                ).padStart(3, "0");
              }
            },
          },
          0
        )
        .to(barRef.current, { scaleX: 1, duration: DUR.preloader, ease: "power2.inOut" }, 0)
        .to(strokes, { drawSVG: "100%", duration: DUR.preloader, ease: "power2.inOut" }, 0)
        .to(
          rootRef.current,
          { yPercent: -100, duration: 1, ease: EASE.expoInOut },
          "+=0.2"
        );

      return () => {
        document.body.style.overflow = "";
      };
    },
    { scope: rootRef as React.RefObject<HTMLElement>, dependencies: [shouldRender] }
  );

  if (!shouldRender) return null;

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      inert
      className="fixed inset-0 z-[100] flex flex-col justify-between bg-ink px-6 py-6 sm:px-10 sm:py-8"
    >
      <div className="flex items-center justify-between">
        <Logomark ref={logoRef} className="h-8 w-8 text-volt" />
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted">
          {t.preloader.label}
        </span>
      </div>

      <span
        ref={counterRef}
        className="font-mono text-[clamp(4rem,18vw,11rem)] leading-none tabular-nums text-volt"
      >
        000
      </span>

      <div className="relative h-px w-full bg-hairline">
        <div
          ref={barRef}
          className="absolute inset-y-0 left-0 w-full origin-left scale-x-0 bg-volt"
        />
      </div>
    </div>
  );
}
