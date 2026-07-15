"use client";

import { useRef, useSyncExternalStore } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { DUR, EASE } from "@/lib/animation";
import { useSmoothScroll } from "@/components/providers/SmoothScrollProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import {
  markIntroDone,
  markPreloaderShown,
  sceneState,
  shouldShowPreloader,
} from "@/lib/sceneState";

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
 * A transparent HUD over the ribbon sculpture as it assembles behind it —
 * the counter, label, and progress line drive (and stay perfectly in sync
 * with) `sceneState.assemble`, so the sculpture finishes forming exactly
 * as the counter hits 100.
 */
export function Preloader() {
  const shouldRender = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const { lenis } = useSmoothScroll();
  const { t } = useLocale();

  useGSAP(
    () => {
      if (!shouldRender || !rootRef.current || !counterRef.current) return;

      lenis?.stop();
      document.body.style.overflow = "hidden";

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

      tl.to(
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
        .to(sceneState, { assemble: 1, duration: DUR.preloader, ease: "power2.inOut" }, 0)
        .to(barRef.current, { scaleX: 1, duration: DUR.preloader, ease: "power2.inOut" }, 0)
        .to(
          [counterRef.current, labelRef.current],
          { yPercent: -100, opacity: 0, duration: 0.6, ease: EASE.out },
          "+=0.15"
        )
        .to(barRef.current, { opacity: 0, duration: 0.4, ease: EASE.out }, "<");

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
      className="fixed inset-0 z-[100] flex flex-col justify-between px-6 py-6 sm:px-10 sm:py-8"
    >
      <div className="flex justify-end overflow-hidden">
        <span
          ref={labelRef}
          className="font-mono text-xs uppercase tracking-[0.3em] text-muted"
        >
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
