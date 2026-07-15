"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { EASE } from "@/lib/animation";
import { useSmoothScroll } from "@/components/providers/SmoothScrollProvider";

const SESSION_KEY = "portfolio-preloader-shown";
const listeners = new Set<() => void>();

function getServerSnapshot() {
  return false;
}

function getSnapshot() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return false;
  }
  return window.sessionStorage.getItem(SESSION_KEY) !== "1";
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function markShown() {
  window.sessionStorage.setItem(SESSION_KEY, "1");
  listeners.forEach((listener) => listener());
}

export function Preloader() {
  const shouldRender = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const { lenis } = useSmoothScroll();

  useEffect(() => {
    if (!shouldRender) return;
    lenis?.stop();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [shouldRender, lenis]);

  useGSAP(
    () => {
      if (!shouldRender || !rootRef.current || !counterRef.current) return;

      const counter = { value: 0 };
      gsap
        .timeline({
          onComplete: () => {
            lenis?.start();
            markShown();
          },
        })
        .to(counter, {
          value: 100,
          duration: 1.6,
          ease: "power2.inOut",
          onUpdate: () => {
            if (counterRef.current) {
              counterRef.current.textContent = String(
                Math.round(counter.value)
              ).padStart(3, "0");
            }
          },
        })
        .to(
          rootRef.current,
          { yPercent: -100, duration: 1.1, ease: EASE.expoInOut },
          "+=0.1"
        );
    },
    { scope: rootRef as React.RefObject<HTMLElement>, dependencies: [shouldRender] }
  );

  if (!shouldRender) return null;

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      inert
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-ink"
    >
      <span ref={counterRef} className="font-mono text-3xl text-volt">
        000
      </span>
      <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted">
        Aidil Fitrah
      </span>
    </div>
  );
}
