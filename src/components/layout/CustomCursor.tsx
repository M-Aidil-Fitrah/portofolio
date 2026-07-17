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

    // Tracked so a pure scroll (no pointer movement) can still figure out
    // what's really under the cursor right now — see `recheck` below.
    let lastX = -1;
    let lastY = -1;
    let current: HTMLElement | null = null;

    // `overwrite: true` on every tween here matters: grow()'s opacity tween
    // carries a 0.1s delay, so a fast scroll/leave firing shrink() while
    // that delay is still pending used to leave grow's tween alive
    // underneath — it would kick in moments later and animate opacity back
    // to 1 with the stale label text, reopening the pill on its own after
    // it had already shrunk. Without overwrite, neither tween cancels the
    // other since they're separate gsap.to() calls on the same properties.
    const grow = (target: HTMLElement) => {
      label.textContent = target.dataset.cursor ?? "";
      const labelWidth = label.getBoundingClientRect().width;
      const width = Math.max(DOT_SIZE, labelWidth + PILL_PADDING);

      gsap.to(pill, { width, height: PILL_HEIGHT, duration: 0.4, ease: "power3.out", overwrite: true });
      gsap.to(label, { opacity: 1, duration: 0.25, delay: 0.1, overwrite: true });
    };
    const shrink = () => {
      gsap.to(pill, {
        width: DOT_SIZE,
        height: DOT_SIZE,
        duration: 0.3,
        ease: "power3.out",
        overwrite: true,
      });
      gsap.to(label, { opacity: 0, duration: 0.15, overwrite: true });
    };

    const move = (e: MouseEvent) => {
      lastX = e.clientX;
      lastY = e.clientY;
      xTo(lastX);
      yTo(lastY);
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
      current = e.currentTarget as HTMLElement;
      grow(current);
    };
    const handleLeave = () => {
      current = null;
      shrink();
    };

    targets.forEach((t) => {
      t.addEventListener("mouseenter", handleEnter);
      t.addEventListener("mouseleave", handleLeave);
    });

    // A target's own `data-cursor` text can change while the pointer stays
    // put — the Header/NavOverlay menu button relabels itself Menu <-> Close
    // on click without the pointer ever leaving it. `grow()` only reads the
    // attribute on `mouseenter`, so without this the pill would keep
    // showing the stale label. Re-grow (safe/idempotent — just re-measures
    // width and re-sets text) whenever the currently-hovered target's
    // attribute mutates.
    const attrObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.target === current) {
          grow(current);
          return;
        }
      }
    });
    targets.forEach((t) => {
      attrObserver.observe(t, { attributes: true, attributeFilter: ["data-cursor"] });
    });

    // A scroll (wheel, Lenis anchor-scroll from a nav click, scrollIntoView)
    // can carry a hovered `[data-cursor]` element out from under a
    // stationary pointer without ever firing `mouseleave` — browsers only
    // fire enter/leave on actual pointer movement, not on layout shifting
    // underneath it. Left unchecked, the pill gets stuck expanded with a
    // stale label. Re-derive what's really under the last known pointer
    // position whenever the page scrolls.
    const recheck = () => {
      if (lastX < 0) return;
      const el = document.elementFromPoint(lastX, lastY) as HTMLElement | null;
      const next = el?.closest<HTMLElement>("[data-cursor]") ?? null;
      if (next === current) return;
      current = next;
      if (next) grow(next);
      else shrink();
    };
    window.addEventListener("scroll", recheck, { passive: true });

    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("scroll", recheck);
      attrObserver.disconnect();
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
