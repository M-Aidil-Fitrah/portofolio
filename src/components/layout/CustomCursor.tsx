"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

/**
 * Purposeful cursor: invisible everywhere by default (native pointer stays
 * put), and only reveals a labelled pill over elements explicitly marked
 * with `data-cursor="LABEL"` (project cards, the pager, contact links).
 * No global dot-follows-your-mouse — that pattern is the cursor equivalent
 * of stock hero copy.
 */
export function CustomCursor() {
  const pillRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    const canHover = window.matchMedia("(pointer: fine)").matches;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const pill = pillRef.current;
    const label = labelRef.current;
    if (!canHover || reduceMotion || !pill || !label) return;

    gsap.set(pill, { xPercent: -50, yPercent: -50, scale: 0, opacity: 0 });

    const xTo = gsap.quickTo(pill, "x", { duration: 0.35, ease: "power3.out" });
    const yTo = gsap.quickTo(pill, "y", { duration: 0.35, ease: "power3.out" });

    const move = (e: MouseEvent) => {
      xTo(e.clientX);
      yTo(e.clientY);
    };
    window.addEventListener("mousemove", move);

    const targets = Array.from(
      document.querySelectorAll<HTMLElement>("[data-cursor]")
    );

    const handleEnter = (e: MouseEvent) => {
      const target = e.currentTarget as HTMLElement;
      label.textContent = target.dataset.cursor ?? "";
      gsap.to(pill, {
        scale: 1,
        opacity: 1,
        duration: 0.35,
        ease: "power3.out",
      });
    };
    const handleLeave = () => {
      gsap.to(pill, { scale: 0, opacity: 0, duration: 0.25, ease: "power3.out" });
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
  }, []);

  return (
    <div aria-hidden="true" role="presentation">
      <div
        ref={pillRef}
        className="pointer-events-none fixed left-0 top-0 z-[90] flex h-16 w-16 items-center justify-center rounded-full bg-volt"
      >
        <span
          ref={labelRef}
          className="font-mono text-[10px] font-semibold uppercase tracking-widest text-ink"
        />
      </div>
    </div>
  );
}
