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
  navigate: (href: string) => void;
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
  const router = useRouter();
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const overlay = overlayRef.current;
    if (!overlay) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    gsap.set(overlay, { transformOrigin: "top" });
    gsap.to(overlay, {
      scaleY: 0,
      duration: 0.8,
      ease: "power3.inOut",
      onComplete: () => ScrollTrigger.refresh(),
    });
  }, [pathname]);

  const navigate = useCallback(
    (href: string) => {
      const overlay = overlayRef.current;
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      if (!overlay || reduceMotion) {
        router.push(href);
        return;
      }

      gsap.set(overlay, { transformOrigin: "bottom" });
      gsap.to(overlay, {
        scaleY: 1,
        duration: 0.5,
        ease: "power3.inOut",
        onComplete: () => {
          window.scrollTo(0, 0);
          router.push(href);
        },
      });
    },
    [router]
  );

  return (
    <TransitionContext.Provider value={{ navigate }}>
      <div
        ref={overlayRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[95] bg-ink"
        style={{ transform: "scaleY(0)", transformOrigin: "top" }}
      />
      {children}
    </TransitionContext.Provider>
  );
}

export function useTransition() {
  return useContext(TransitionContext);
}
