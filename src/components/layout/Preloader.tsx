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

/** Deterministic scatter pose per facet (A chevron, F diamond, stem upper,
 * F arm, stem lower) — pieces fly in from these offsets and snap together. */
const SCATTER = [
  { x: -70, y: -55, rotation: -14 },
  { x: 85, y: -30, rotation: 11 },
  { x: -65, y: 40, rotation: 9 },
  { x: 75, y: 65, rotation: -12 },
  { x: -35, y: 95, rotation: 13 },
];

/**
 * The brand moment: the AF logomark assembles itself piece by piece — its
 * five facets fly in scattered and snap together while a small counter and
 * hairline bar track progress underneath. The instant the count completes,
 * the assembled mark flashes volt with a scale punch (the payoff), holds a
 * beat, squashes in anticipation, then punches out fast before the two ink
 * panels snap apart to reveal Hero. When this won't render at all (reduced
 * motion, or already shown this session), it still owns firing
 * `markIntroDone()` so Hero's gated entrances aren't left waiting forever.
 */
export function Preloader() {
  const shouldRender = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const logoWrapRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<SVGSVGElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const barHeadRef = useRef<HTMLDivElement>(null);
  const panelLeftRef = useRef<HTMLDivElement>(null);
  const panelRightRef = useRef<HTMLDivElement>(null);
  const { lenis } = useSmoothScroll();
  const { t } = useLocale();

  useEffect(() => {
    if (!shouldRender) markIntroDone();
  }, [shouldRender]);

  useGSAP(
    () => {
      if (!shouldRender || !rootRef.current || !logoRef.current) return;

      lenis?.stop();
      document.body.style.overflow = "hidden";

      const facets = Array.from(
        logoRef.current.querySelectorAll<SVGPathElement>("[data-logomark-facet]")
      );
      const volt =
        getComputedStyle(document.documentElement)
          .getPropertyValue("--color-volt")
          .trim() || "#D9FF3D";

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

      facets.forEach((facet, i) => {
        const pose = SCATTER[i % SCATTER.length];
        gsap.set(facet, {
          x: pose.x,
          y: pose.y,
          rotation: pose.rotation,
          scale: 0.7,
          opacity: 0,
          transformOrigin: "50% 50%",
        });
      });

      tl.from(
        headerRef.current,
        { opacity: 0, y: 8, duration: 0.5, ease: EASE.out },
        0
      )
        .from(
          bottomRef.current,
          { opacity: 0, y: 8, duration: 0.5, ease: EASE.out },
          0
        )
        .to(
          labelRef.current,
          {
            duration: 0.7,
            scrambleText: { text: t.preloader.label, chars: "XO+#01", speed: 0.35 },
            ease: "none",
          },
          0.1
        )
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
              if (barHeadRef.current) {
                barHeadRef.current.style.left = `${counter.value}%`;
              }
            },
          },
          0
        )
        .to(barRef.current, { scaleX: 1, duration: DUR.preloader, ease: "power2.inOut" }, 0)
        // assembly: each piece flies in and snaps into place across the load
        .to(
          facets,
          {
            x: 0,
            y: 0,
            rotation: 0,
            scale: 1,
            opacity: 1,
            duration: 1,
            ease: EASE.expo,
            stagger: DUR.preloader / 12,
          },
          0.15
        )
        // payoff: the completed mark flashes volt with a quick punch
        .to(
          logoRef.current,
          { color: volt, duration: 0.18, ease: "power2.out" },
          DUR.preloader
        )
        .fromTo(
          logoWrapRef.current,
          { scale: 1 },
          { scale: 1.07, duration: 0.13, yoyo: true, repeat: 1, ease: "power2.out" },
          DUR.preloader
        )
        // anticipation squash, then fast punch-out — opposite energy from the build
        .to(
          logoWrapRef.current,
          { scale: 0.94, duration: 0.14, ease: "power2.in" },
          "+=0.18"
        )
        .to(
          logoWrapRef.current,
          { scale: 1.18, opacity: 0, duration: 0.3, ease: "power4.in" },
          ">"
        )
        .to(
          [headerRef.current, bottomRef.current],
          { opacity: 0, y: -10, duration: 0.28, ease: EASE.out },
          "<"
        )
        .to(
          panelLeftRef.current,
          { xPercent: -100, duration: 0.7, ease: EASE.expoInOut },
          "<0.08"
        )
        .to(
          panelRightRef.current,
          { xPercent: 100, duration: 0.7, ease: EASE.expoInOut },
          "<0.05"
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
      className="fixed inset-0 z-[100] overflow-hidden"
    >
      <div ref={panelLeftRef} className="absolute inset-y-0 left-0 w-[51%] bg-ink" />
      <div ref={panelRightRef} className="absolute inset-y-0 right-0 w-[51%] bg-ink" />

      <div className="relative flex h-full flex-col justify-between px-6 py-6 sm:px-10 sm:py-8">
        <div ref={headerRef} className="flex items-center justify-end">
          <span
            ref={labelRef}
            className="font-mono text-xs uppercase tracking-[0.3em] text-muted"
          >
            {t.preloader.label}
          </span>
        </div>

        <div className="grid flex-1 place-items-center">
          <div ref={logoWrapRef}>
            <Logomark
              ref={logoRef}
              className="h-[clamp(11rem,34vh,19rem)] w-auto text-foreground"
            />
          </div>
        </div>

        <div ref={bottomRef} className="flex items-center gap-6">
          <span
            ref={counterRef}
            className="font-mono text-sm tabular-nums text-volt"
          >
            000
          </span>
          <div className="relative h-px flex-1 bg-hairline">
            <div
              ref={barRef}
              className="absolute inset-y-0 left-0 w-full origin-left scale-x-0 bg-volt"
            />
            <div
              ref={barHeadRef}
              className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-volt shadow-[0_0_12px_2px_rgba(217,255,61,0.55)]"
              style={{ left: "0%" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
