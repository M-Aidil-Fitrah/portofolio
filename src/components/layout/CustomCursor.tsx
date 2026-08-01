"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { gsap } from "@/lib/gsap";

const DOT_SIZE = 10;
const PILL_HEIGHT = 44;
const PILL_PADDING = 40;

/** Dot cursor that grows into a labelled plate over `[data-cursor]`. */
export function CustomCursor() {
  const pillRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const sizedRef = useRef(false);
  // Refs, not effect-locals: a route change must not reset the pill to (0, 0).
  const posRef = useRef({ x: 0, y: 0 });
  const targetRef = useRef({ x: 0, y: 0 });
  const snapRef = useRef(true);
  const pointerRef = useRef({ x: -1, y: -1 });
  const pathname = usePathname();

  // Not useGSAP: gsap.context() would revert the pill's inline styles.
  useEffect(() => {
    const canHover =
      window.matchMedia("(pointer: fine)").matches &&
      window.matchMedia("(min-width: 768px)").matches;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const pill = pillRef.current;
    const label = labelRef.current;
    if (!canHover || reduceMotion || !pill || !label) return;

    // First mount only: stay hidden until a real pointer move.
    if (!sizedRef.current) {
      sizedRef.current = true;
      gsap.set(pill, {
        width: DOT_SIZE,
        height: DOT_SIZE,
        autoAlpha: 0,
      });
    }

    // rAF, not gsap: a position tween fights grow/shrink and can freeze.
    const pos = posRef.current;
    const target = targetRef.current;
    let rafId = 0;
    let lastTime = performance.now();
    const render = (now: number) => {
      // Time-based damping so the glide matches at 60 and 144 Hz.
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      const ease = 1 - Math.exp(-dt * 14);
      pos.x += (target.x - pos.x) * ease;
      pos.y += (target.y - pos.y) * ease;
      pill.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%)`;
      rafId = requestAnimationFrame(render);
    };
    rafId = requestAnimationFrame(render);

    // Last pointer position, so `recheck` works without a mouse event.
    const pointer = pointerRef.current;
    let current: HTMLElement | null = null;

    // overwrite: true — the 0.1s delay would survive a shrink() otherwise.
    const grow = (target: HTMLElement) => {
      label.textContent = target.dataset.cursor ?? "";
      const labelWidth = label.getBoundingClientRect().width;
      const width = Math.max(DOT_SIZE, labelWidth + PILL_PADDING);

      gsap.to(pill, { width, height: PILL_HEIGHT, duration: 0.4, ease: "power3.out", overwrite: "auto" });
      gsap.to(label, { opacity: 1, duration: 0.25, delay: 0.1, overwrite: true });
    };
    const shrink = () => {
      gsap.to(pill, {
        width: DOT_SIZE,
        height: DOT_SIZE,
        duration: 0.3,
        ease: "power3.out",
        overwrite: "auto",
      });
      gsap.to(label, { opacity: 0, duration: 0.15, overwrite: true });
    };
    // A route change unmounts the hovered target without a mouseleave.
    current = null;
    shrink();

    const move = (e: PointerEvent) => {
      // Hybrid laptops match `(pointer: fine)` but still send touch moves.
      if (e.pointerType === "touch") return;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      target.x = pointer.x;
      target.y = pointer.y;
      if (snapRef.current) {
        // Jump before fading in, or the dot streaks across the screen.
        snapRef.current = false;
        pos.x = pointer.x;
        pos.y = pointer.y;
        gsap.to(pill, { autoAlpha: 1, duration: 0.2, overwrite: "auto" });
      }
    };
    window.addEventListener("pointermove", move);

    // One delegated listener, so late-mounted targets need no bookkeeping.
    const over = (e: MouseEvent) => {
      const next =
        (e.target as Element | null)?.closest?.<HTMLElement>("[data-cursor]") ??
        null;
      if (next === current) return;
      current = next;
      if (next) grow(next);
      else shrink();
    };
    document.addEventListener("mouseover", over);

    // A hovered target can relabel itself (Menu <-> Close).
    const attrObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.target === current) {
          grow(current);
          return;
        }
      }
    });
    attrObserver.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ["data-cursor"],
    });

    // Scroll and `inert` change the hovered element without a mouse event.
    const recheck = () => {
      if (pointer.x < 0) return;
      const el = document.elementFromPoint(
        pointer.x,
        pointer.y
      ) as HTMLElement | null;
      const next = el?.closest<HTMLElement>("[data-cursor]") ?? null;
      if (next === current) return;
      current = next;
      if (next) grow(next);
      else shrink();
    };
    window.addEventListener("scroll", recheck, { passive: true });

    // After a route change the DOM under a still pointer is new.
    const navRecheck = requestAnimationFrame(recheck);

    const clickRecheck = () => requestAnimationFrame(recheck);
    document.addEventListener("click", clickRecheck);

    // Hide on leave, and require a fresh move so re-entry snaps.
    const hide = () => {
      snapRef.current = true;
      current = null;
      shrink();
      gsap.to(pill, { autoAlpha: 0, duration: 0.2, overwrite: "auto" });
    };
    document.documentElement.addEventListener("mouseleave", hide);

    return () => {
      cancelAnimationFrame(rafId);
      cancelAnimationFrame(navRecheck);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("scroll", recheck);
      document.removeEventListener("mouseover", over);
      document.removeEventListener("click", clickRecheck);
      document.documentElement.removeEventListener("mouseleave", hide);
      attrObserver.disconnect();
    };
  }, [pathname]);

  return (
    <div aria-hidden="true" role="presentation">
      <div
        ref={pillRef}
        className="cursor-dot pointer-events-none fixed left-0 top-0 z-[110] flex items-center justify-center overflow-hidden whitespace-nowrap rounded-full bg-volt"
      >
        <span
          ref={labelRef}
          className="font-mono text-[11px] font-semibold uppercase tracking-widest text-ink opacity-0"
        />
      </div>
    </div>
  );
}
