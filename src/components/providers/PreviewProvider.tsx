"use client";

import Image from "next/image";
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { DUR, EASE, prefersReducedMotion } from "@/lib/animation";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useSmoothScroll } from "@/components/providers/SmoothScrollProvider";

export interface PreviewItem {
  /** Real image path under public/. Omit for a designed placeholder frame. */
  src?: string;
  alt: string;
  /** Mono caption under the media (e.g. "AgriLink — 02" or an award title). */
  caption?: string;
  /** Big dimmed index for the placeholder frame when there's no src yet. */
  index?: string;
}

interface PreviewContextValue {
  openPreview: (item: PreviewItem) => void;
}

const PreviewContext = createContext<PreviewContextValue | null>(null);

export function usePreview() {
  const ctx = useContext(PreviewContext);
  if (!ctx) throw new Error("usePreview must be used inside PreviewProvider");
  return ctx;
}

/**
 * One shared lightbox for every media placeholder on the site (About
 * portrait, award certificates, project galleries). Animated in with a
 * clip-wipe + rise and out with the reverse; Escape, backdrop click, and
 * the close pill all dismiss it. Lenis is stopped while open (same pattern
 * as NavOverlay/Preloader). Reduced motion shows/hides instantly.
 */
export function PreviewProvider({ children }: { children: React.ReactNode }) {
  const [item, setItem] = useState<PreviewItem | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const closingRef = useRef(false);
  const { lenis } = useSmoothScroll();
  const { t } = useLocale();

  const openPreview = useCallback((next: PreviewItem) => {
    closingRef.current = false;
    setItem(next);
  }, []);

  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;

    const overlay = overlayRef.current;
    const panel = panelRef.current;
    if (!overlay || !panel || prefersReducedMotion()) {
      setItem(null);
      return;
    }
    gsap.timeline({ onComplete: () => setItem(null) })
      .to(panel, {
        clipPath: "inset(0% 0% 100% 0% round 1.5rem)",
        y: 24,
        opacity: 0,
        duration: DUR.fast,
        ease: EASE.inOut,
      })
      .to(overlay, { opacity: 0, duration: 0.25, ease: "power2.out" }, "-=0.2");
  }, []);

  useGSAP(
    () => {
      const overlay = overlayRef.current;
      const panel = panelRef.current;
      if (!item || !overlay || !panel) return;

      lenis?.stop();
      document.body.style.overflow = "hidden";
      closeRef.current?.focus();

      const handleKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") close();
      };
      window.addEventListener("keydown", handleKey);

      if (!prefersReducedMotion()) {
        gsap.timeline()
          .fromTo(
            overlay,
            { opacity: 0 },
            { opacity: 1, duration: 0.3, ease: "power2.out" }
          )
          .fromTo(
            panel,
            {
              clipPath: "inset(100% 0% 0% 0% round 1.5rem)",
              y: 32,
              opacity: 0,
            },
            {
              clipPath: "inset(0% 0% 0% 0% round 1.5rem)",
              y: 0,
              opacity: 1,
              duration: DUR.base,
              ease: EASE.expo,
            },
            "-=0.15"
          );
      }

      return () => {
        window.removeEventListener("keydown", handleKey);
        lenis?.start();
        document.body.style.overflow = "";
      };
    },
    { scope: overlayRef as React.RefObject<HTMLElement>, dependencies: [item] }
  );

  return (
    <PreviewContext.Provider value={{ openPreview }}>
      {children}
      {item && (
        <div
          ref={overlayRef}
          role="dialog"
          aria-modal="true"
          aria-label={item.alt}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-ink/90 px-6 py-16 backdrop-blur-sm sm:px-10"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            ref={panelRef}
            className="relative flex max-h-full w-full max-w-4xl flex-col"
          >
            <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-card border border-hairline bg-surface">
              {item.src ? (
                <Image
                  src={item.src}
                  alt={item.alt}
                  width={1920}
                  height={1280}
                  sizes="(max-width: 1024px) 100vw, 896px"
                  className="max-h-[70svh] w-full object-contain"
                />
              ) : (
                <div className="flex aspect-[16/10] w-full items-center justify-center">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none font-mono text-[16vw] leading-none text-hairline sm:text-[9vw]"
                  >
                    {item.index ?? "01"}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between gap-6">
              <p className="font-mono text-xs uppercase tracking-widest text-muted">
                {item.caption ?? item.alt}
              </p>
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                data-cursor={t.preview.close}
                className="btn-fill inline-flex h-10 shrink-0 items-center rounded-pill border border-hairline px-5 font-mono text-xs uppercase tracking-widest text-foreground"
              >
                {t.preview.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </PreviewContext.Provider>
  );
}
