"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { gsap, ScrollTrigger } from "@/lib/gsap";

interface TransitionContextValue {
  navigate: (href: string, label?: string) => void;
}

const TransitionContext = createContext<TransitionContextValue>({
  navigate: () => {},
});

export function TransitionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const overlay = overlayRef.current;
    const label = labelRef.current;
    if (!overlay) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    gsap.set(overlay, { transformOrigin: "top" });
    const tl = gsap.timeline({
      onComplete: () => ScrollTrigger.refresh(),
    });
    if (label) {
      tl.to(label, {
        yPercent: -120,
        opacity: 0,
        duration: 0.3,
        ease: "power3.in",
      });
    }
    tl.to(
      overlay,
      { scaleY: 0, duration: 0.8, ease: "power3.inOut" },
      label ? "-=0.15" : 0
    );
  }, [pathname]);

  const navigate = useCallback(
    (href: string, label?: string) => {
      const overlay = overlayRef.current;
      const labelEl = labelRef.current;
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      if (!overlay || reduceMotion) {
        router.push(href);
        return;
      }

      gsap.set(overlay, { transformOrigin: "bottom" });
      if (labelEl) {
        labelEl.textContent = label ?? "";
        gsap.set(labelEl, { yPercent: 120, opacity: 0 });
      }

      const tl = gsap.timeline({
        onComplete: () => {
          window.scrollTo(0, 0);
          router.push(href);
        },
      });
      tl.to(overlay, { scaleY: 1, duration: 0.5, ease: "power3.inOut" });
      if (labelEl && label) {
        tl.to(
          labelEl,
          { yPercent: 0, opacity: 1, duration: 0.4, ease: "power3.out" },
          "-=0.25"
        );
      }
    },
    [router]
  );

  return (
    <TransitionContext.Provider value={{ navigate }}>
      <div
        ref={overlayRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[95] flex items-center justify-center overflow-hidden bg-ink"
        style={{ transform: "scaleY(0)", transformOrigin: "top" }}
      >
        <span
          ref={labelRef}
          className="font-mono text-xs uppercase tracking-[0.3em] text-volt opacity-0"
        />
      </div>
      {children}
    </TransitionContext.Provider>
  );
}

export function useTransition() {
  return useContext(TransitionContext);
}
