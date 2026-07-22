"use client";

import Image from "next/image";
import { PDFViewer } from "@/components/ui/PDFViewer";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { DUR, EASE, prefersReducedMotion } from "@/lib/animation";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useSmoothScroll } from "@/components/providers/SmoothScrollProvider";

export interface PreviewItem {
  /** Real media path under public/. Omit for a designed placeholder frame. */
  src?: string;
  type?: "image" | "video" | "pdf";
  poster?: string;
  alt: string;
  /** Mono caption under the media (e.g. "AgriLink — 02" or an award title). */
  caption?: string;
  /** Big dimmed index for the placeholder frame when there's no src yet. */
  index?: string;
  /** Optional direct download href (used by PDF previews). */
  downloadHref?: string;
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

const ZOOM_MIN = 1;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.75;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * One shared lightbox for every media placeholder on the site (About
 * portrait, award certificates, project galleries, activity media). Animated
 * in with a clip-wipe + rise and out with the reverse; Escape, backdrop
 * click, and the close pill all dismiss it. Lenis is stopped while open
 * (same pattern as NavOverlay/Preloader). Reduced motion shows/hides
 * instantly.
 *
 * Real images additionally get zoom (buttons, double-click, +/-/0 keys),
 * drag-to-pan once zoomed, and a fullscreen toggle — placeholders and video
 * (which already has its own native fullscreen control) skip all of that.
 */
export function PreviewProvider({ children }: { children: React.ReactNode }) {
  const [item, setItem] = useState<PreviewItem | null>(null);
  const [scale, setScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const mediaWrapRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const closingRef = useRef(false);
  const panRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, originX: 0, originY: 0 });
  const { lenis } = useSmoothScroll();
  const { t } = useLocale();

  const zoomable = Boolean(item?.src) && item?.type !== "video";

  const openPreview = useCallback((next: PreviewItem) => {
    closingRef.current = false;
    // Reset any zoom/pan left over from a previous photo — otherwise the
    // next one would open already zoomed/panned from wherever the last one
    // was left. Applied directly here (not in a effect keyed on `item`) so
    // it happens in the same commit as the item swap, before the zoomed-out
    // frame ever paints.
    panRef.current = { x: 0, y: 0 };
    setScale(1);
    if (mediaWrapRef.current) gsap.set(mediaWrapRef.current, { scale: 1, x: 0, y: 0 });
    setItem(next);
  }, []);

  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;

    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});

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

  // Applies the current scale/pan to the media wrapper. `animate: false` is
  // used while actively dragging (direct write, no lag behind the pointer);
  // button/wheel/double-click zooms get a short eased tween instead.
  const applyTransform = useCallback((next: { scale: number; x: number; y: number }, animate = true) => {
    const el = mediaWrapRef.current;
    if (!el) return;
    if (animate && !prefersReducedMotion()) {
      gsap.to(el, { scale: next.scale, x: next.x, y: next.y, duration: 0.3, ease: "power2.out", overwrite: true });
    } else {
      gsap.set(el, { scale: next.scale, x: next.x, y: next.y });
    }
  }, []);

  const clampPan = useCallback((x: number, y: number, scaleValue: number) => {
    const frame = frameRef.current;
    const maxX = frame ? (frame.clientWidth * (scaleValue - 1)) / 2 : 0;
    const maxY = frame ? (frame.clientHeight * (scaleValue - 1)) / 2 : 0;
    return { x: clamp(x, -maxX, maxX), y: clamp(y, -maxY, maxY) };
  }, []);

  const setZoom = useCallback(
    (next: number) => {
      const nextScale = clamp(next, ZOOM_MIN, ZOOM_MAX);
      const pan = clampPan(panRef.current.x, panRef.current.y, nextScale);
      panRef.current = pan;
      setScale(nextScale);
      applyTransform({ scale: nextScale, ...pan });
    },
    [applyTransform, clampPan]
  );

  const zoomIn = useCallback(() => setZoom(scale + ZOOM_STEP), [scale, setZoom]);
  const zoomOut = useCallback(() => setZoom(scale - ZOOM_STEP), [scale, setZoom]);

  const toggleZoom = useCallback(() => {
    setZoom(scale > ZOOM_MIN ? ZOOM_MIN : 2);
  }, [scale, setZoom]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      overlayRef.current?.requestFullscreen?.().catch(() => {});
    }
  }, []);

  // Keeps `isFullscreen` in sync even when fullscreen is exited by the
  // browser directly (native Escape handling, F11, the OS chrome) instead of
  // through `toggleFullscreen` above.
  useEffect(() => {
    const handleChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!zoomable || scale <= ZOOM_MIN) return;
      dragRef.current = {
        dragging: true,
        startX: e.clientX,
        startY: e.clientY,
        originX: panRef.current.x,
        originY: panRef.current.y,
      };
      const move = (ev: PointerEvent) => {
        if (!dragRef.current.dragging) return;
        const pan = clampPan(
          dragRef.current.originX + (ev.clientX - dragRef.current.startX),
          dragRef.current.originY + (ev.clientY - dragRef.current.startY),
          scale
        );
        panRef.current = pan;
        applyTransform({ scale, ...pan }, false);
      };
      const up = () => {
        dragRef.current.dragging = false;
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    },
    [zoomable, scale, clampPan, applyTransform]
  );

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
        if (!zoomable) return;
        if (e.key === "+" || e.key === "=") zoomIn();
        if (e.key === "-" || e.key === "_") zoomOut();
        if (e.key === "0") setZoom(ZOOM_MIN);
        if (e.key === "f" || e.key === "F") toggleFullscreen();
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
    {
      scope: overlayRef.current ? (overlayRef as React.RefObject<HTMLElement>) : undefined,
      dependencies: [item],
      // useGSAP defers its cleanup to unmount-only once a non-empty
      // `dependencies` array is passed (see @gsap/react's `deferCleanup`) —
      // without this flag the close-side effect (lenis.start(), overflow
      // reset, keydown listener removal) below never runs when `item` goes
      // back to null, permanently leaving scroll locked after the first
      // preview closes.
      revertOnUpdate: true,
    }
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
          className={`fixed inset-0 z-[120] flex items-center justify-center bg-ink/90 backdrop-blur-sm [&:fullscreen]:bg-ink [&:fullscreen]:px-0 [&:fullscreen]:py-0 ${
            item.type === "pdf" ? "px-6 py-6 sm:px-10" : "px-6 py-16 sm:px-10"
          }`}
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            ref={panelRef}
            className={`relative flex max-h-full w-full flex-col ${
              item.type === "pdf"
                ? "h-full max-w-5xl"
                : isFullscreen
                ? "h-full max-w-none"
                : "max-w-4xl"
            }`}
          >
            <div
              ref={frameRef}
              className={`relative flex min-h-0 flex-1 items-center justify-center border border-hairline bg-surface ${
                item.type === "pdf" || isFullscreen
                  ? "overflow-hidden rounded-none"
                  : "overflow-hidden rounded-card"
              }`}
            >
              {item.src ? (
                item.type === "pdf" ? (
                  <div
                    ref={mediaWrapRef}
                    data-lenis-prevent
                    onPointerDown={handlePointerDown}
                    onDoubleClick={toggleZoom}
                    data-cursor={scale > ZOOM_MIN ? t.preview.drag : undefined}
                    className={`flex w-full flex-col items-center overflow-y-auto ${
                      scale > ZOOM_MIN ? "cursor-grab" : ""
                    }`}
                    style={{ maxHeight: isFullscreen ? "92svh" : item.type === "pdf" ? "100%" : "75svh" }}
                  >
                    <PDFViewer src={item.src} className="w-full" />
                  </div>
                ) : item.type === "video" ? (
                  <video
                    src={item.src}
                    poster={item.poster}
                    controls
                    autoPlay
                    playsInline
                    className={isFullscreen ? "h-full w-full object-contain" : "max-h-[70svh] w-full object-contain"}
                  />
                ) : (
                  <div
                    ref={mediaWrapRef}
                    onPointerDown={handlePointerDown}
                    onDoubleClick={toggleZoom}
                    data-cursor={scale > ZOOM_MIN ? t.preview.drag : undefined}
                    className={`relative ${scale > ZOOM_MIN ? "cursor-grab" : ""}`}
                  >
                    <Image
                      src={item.src}
                      alt={item.alt}
                      width={1920}
                      height={1280}
                      sizes="(max-width: 1024px) 100vw, 896px"
                      className={`pointer-events-none w-full select-none object-contain ${isFullscreen ? "max-h-[92svh]" : "max-h-[70svh]"}`}
                      draggable={false}
                    />
                  </div>
                )
              ) : (
                <div className="relative flex aspect-[16/10] w-full items-center justify-center">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none font-mono text-[16vw] leading-none text-hairline sm:text-[9vw]"
                  >
                    {item.index ?? "01"}
                  </span>
                  {item.type === "video" && (
                    <span
                      aria-hidden="true"
                      className="absolute flex h-16 w-16 items-center justify-center rounded-full border border-hairline bg-ink/60 text-volt"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="ml-1 h-6 w-6">
                        <path d="M8 5.5v13l11-6.5L8 5.5Z" />
                      </svg>
                    </span>
                  )}
                </div>
              )}

              {zoomable && (
                <div className="absolute right-4 top-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={zoomOut}
                    disabled={scale <= ZOOM_MIN}
                    data-cursor={t.preview.zoomOut}
                    aria-label={t.preview.zoomOut}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline bg-ink/70 text-foreground backdrop-blur-sm transition-opacity disabled:opacity-30"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4" aria-hidden="true">
                      <path d="M5 12h14" strokeLinecap="round" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={zoomIn}
                    disabled={scale >= ZOOM_MAX}
                    data-cursor={t.preview.zoomIn}
                    aria-label={t.preview.zoomIn}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline bg-ink/70 text-foreground backdrop-blur-sm transition-opacity disabled:opacity-30"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4" aria-hidden="true">
                      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    data-cursor={isFullscreen ? t.preview.exitFullscreen : t.preview.fullscreen}
                    aria-label={isFullscreen ? t.preview.exitFullscreen : t.preview.fullscreen}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline bg-ink/70 text-foreground backdrop-blur-sm"
                  >
                    {isFullscreen ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4" aria-hidden="true">
                        <path d="M9 5v3a1 1 0 0 1-1 1H5M15 5v3a1 1 0 0 0 1 1h3M9 19v-3a1 1 0 0 0-1-1H5M15 19v-3a1 1 0 0 1 1-1h3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4" aria-hidden="true">
                        <path d="M8 5H5v3M16 5h3v3M8 19H5v-3M16 19h3v-3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                </div>
              )}
            </div>            <div className="mt-4 flex items-center justify-between gap-6">
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
