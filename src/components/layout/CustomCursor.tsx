"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation";
import { gsap, useGSAP } from "@/lib/gsap";

const DOT_SIZE = 12;
const PILL_HEIGHT = 44;
const PILL_PADDING = 40;

/**
 * A small square replaces the native pointer everywhere, and grows into a
 * labelled volt plate exactly over elements marked `data-cursor="LABEL"`
 * (project cards, the pager, contact/CTA links). The plate's width is
 * measured from the label's own natural size each time (not a fixed circle
 * scaled up) so multi-word/translated labels never wrap or spill outside
 * it. Coarse pointers and reduced-motion never run this at all — the
 * native cursor stays untouched (see the matching `body { cursor: none }`
 * rule in globals.css, gated the same way).
 */
export function CustomCursor() {
  const pillRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const pathname = usePathname();

  useGSAP(() => {
    const canHover = window.matchMedia("(pointer: fine)").matches;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const pill = pillRef.current;
    const label = labelRef.current;
    if (!canHover || reduceMotion || !pill || !label) return;

    gsap.set(pill, {
      xPercent: -50,
      yPercent: -50,
      width: DOT_SIZE,
      height: DOT_SIZE,
    });

    const xTo = gsap.quickTo(pill, "x", { duration: 0.35, ease: "power3.out" });
    const yTo = gsap.quickTo(pill, "y", { duration: 0.35, ease: "power3.out" });

    const move = (e: MouseEvent) => {
      xTo(e.clientX);
      yTo(e.clientY);
    };
    window.addEventListener("mousemove", move);

    // Re-query on every route change: client-side navigation swaps the
    // page's DOM without remounting CustomCursor (it lives in the root
    // layout, outside `children`), so a one-time query would keep
    // pointing at elements the previous page already unmounted.
    const targets = Array.from(
      document.querySelectorAll<HTMLElement>("[data-cursor]")
    );

    const handleEnter = (e: MouseEvent) => {
      const target = e.currentTarget as HTMLElement;
      label.textContent = target.dataset.cursor ?? "";
      const labelWidth = label.getBoundingClientRect().width;
      const width = Math.max(DOT_SIZE, labelWidth + PILL_PADDING);

      gsap.to(pill, { width, height: PILL_HEIGHT, duration: 0.4, ease: "power3.out" });
      gsap.to(label, { opacity: 1, duration: 0.25, delay: 0.1 });
    };
    const handleLeave = () => {
      gsap.to(pill, {
        width: DOT_SIZE,
        height: DOT_SIZE,
        duration: 0.3,
        ease: "power3.out",
      });
      gsap.to(label, { opacity: 0, duration: 0.15 });
    };

    targets.forEach((t) => {
      t.addEventListener("mouseenter", handleEnter);
      t.addEventListener("mouseleave", handleLeave);
    });

    return () => {
      window.removeEventListener("mousemove", move);
      targets.forEach((t) => {
        t.removeEventListener("mouseenter", handleEnter);
        t.removeEventListener("mouseleave", handleLeave);
      });
    };
  }, [pathname]);

  return (
    <div aria-hidden="true" role="presentation">
      <div
        ref={pillRef}
        className="cursor-dot pointer-events-none fixed left-0 top-0 z-[90] flex items-center justify-center overflow-hidden whitespace-nowrap bg-volt"
      >
        <span
          ref={labelRef}
          className="font-mono text-[11px] font-semibold uppercase tracking-widest text-ink opacity-0"
        />
      </div>
    </div>
  );
}
