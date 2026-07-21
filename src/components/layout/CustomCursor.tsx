"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { gsap } from "@/lib/gsap";

const DOT_SIZE = 10;
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
 *
 * Hover detection is fully delegated (one document-level `mouseover` +
 * `closest("[data-cursor]")`) rather than per-element listeners: targets
 * that mount late (streamed routes, conditional subtrees, locale remounts)
 * work without this component ever having to know about them, and nothing
 * goes stale when the page's DOM is swapped under a stationary pointer.
 */
export function CustomCursor() {
  const pillRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const sizedRef = useRef(false);
  // Position state lives in refs (not effect-local variables) so a route
  // change re-running the effect can't reset the pill back to (0, 0) —
  // the loop keeps rendering from wherever the dot already was.
  const posRef = useRef({ x: 0, y: 0 });
  const targetRef = useRef({ x: 0, y: 0 });
  const snapRef = useRef(true);
  const pointerRef = useRef({ x: -1, y: -1 });
  const pathname = usePathname();

  // Plain useEffect, deliberately not useGSAP: this component has no
  // gsap.matchMedia()/ScrollTrigger to manage, only DOM listeners + a raf
  // id, and useGSAP's underlying gsap.context() reverts (clears) any inline
  // style it recorded during the *synchronous* body of this effect on every
  // re-run — including the pill's width/height/opacity set by shrink() a
  // few lines down. On a route change that wiped the pill back to its
  // CSS-default `opacity: 0`, and since the pointer hadn't left the window
  // (no mouseleave), nothing re-triggered the snap-reveal in `move()` to
  // bring it back — the cursor stayed invisible until the pointer actually
  // left and re-entered the browser. A plain effect's cleanup runs on every
  // dependency change with no such side effect.
  useEffect(() => {
    const canHover = window.matchMedia("(pointer: fine)").matches;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const pill = pillRef.current;
    const label = labelRef.current;
    if (!canHover || reduceMotion || !pill || !label) return;

    // First mount only: give the pill its dot size before anything shows.
    // It stays invisible (autoAlpha) until the first real pointer move so
    // it never sits half-offscreen at 0,0 — and on later reruns of this
    // effect (route changes) the current size/position must carry over
    // untouched, hence the ref guard instead of an unconditional set.
    if (!sizedRef.current) {
      sizedRef.current = true;
      gsap.set(pill, {
        width: DOT_SIZE,
        height: DOT_SIZE,
        autoAlpha: 0,
      });
    }

    // Position is deliberately NOT gsap-driven (no tween, no quickTo): a
    // position tween shares its target element with the grow/shrink/fade
    // tweens, and anything that overwrites or reverts it mid-flight leaves
    // a dead tween that never moves again — the "cursor suddenly freezes
    // after fast scroll + hover churn" bug. Instead a private rAF loop
    // lerps toward the pointer and writes `transform` directly; gsap only
    // ever touches width/height/opacity, so the two can't interact. The
    // trailing `translate(-50%, -50%)` keeps the pill centered on the
    // point regardless of its current tweened size.
    const pos = posRef.current;
    const target = targetRef.current;
    let rafId = 0;
    let lastTime = performance.now();
    const render = (now: number) => {
      // Time-based damping so the glide feels identical at 60 vs 144 Hz.
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      const ease = 1 - Math.exp(-dt * 14);
      pos.x += (target.x - pos.x) * ease;
      pos.y += (target.y - pos.y) * ease;
      pill.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%)`;
      rafId = requestAnimationFrame(render);
    };
    rafId = requestAnimationFrame(render);

    // Tracked so a pure scroll (no pointer movement) can still figure out
    // what's really under the cursor right now — see `recheck` below.
    // Ref-backed so it also survives route changes (a stationary pointer
    // should be re-evaluated against the NEW page's DOM, see below).
    const pointer = pointerRef.current;
    let current: HTMLElement | null = null;

    // `overwrite: true` on every tween here is safe *because* position is
    // rAF-driven above — gsap tweens on the pill only ever control
    // width/height/opacity, so killing them wholesale can't break
    // movement. It's also necessary: grow()'s label tween carries a 0.1s
    // delay, and a fast scroll/leave firing shrink() while that delay is
    // pending used to leave grow's tween alive underneath — it would kick
    // in moments later and reopen the pill with stale text ("auto" can't
    // stop it: it only sees tweens that have already started rendering).
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
    // (Pill tweens keep overwrite "auto" out of caution — width/height are
    // the only contested properties and "auto" resolves those; there is no
    // position tween left for `true` to collateral-kill either way.)

    // Route change while the pill is grown (clicking a project card is
    // exactly that): the old target unmounted without a mouseleave, so
    // settle back to the dot with the normal animation instead of the old
    // behavior of snapping instantly.
    current = null;
    shrink();

    const move = (e: PointerEvent) => {
      // Hybrid laptops match `(pointer: fine)` but still send synthetic
      // moves for touches — without this the dot teleports on every tap.
      if (e.pointerType === "touch") return;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      target.x = pointer.x;
      target.y = pointer.y;
      if (snapRef.current) {
        // Jump straight to the pointer before fading in — gliding from
        // wherever the dot last was (or 0,0) would streak it across the
        // screen.
        snapRef.current = false;
        pos.x = pointer.x;
        pos.y = pointer.y;
        gsap.to(pill, { autoAlpha: 1, duration: 0.2, overwrite: "auto" });
      }
    };
    window.addEventListener("pointermove", move);

    // Delegated hover: one listener, resolved per-event via closest(), so
    // late-mounted/remounted `[data-cursor]` elements need no bookkeeping.
    // mouseover only fires on element-boundary crossings, and closest() on
    // an already-current target no-ops — this stays cheap.
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

    // A target's own `data-cursor` text can change while the pointer stays
    // put — the Header/NavOverlay menu button relabels itself Menu <-> Close
    // on click without the pointer ever leaving it. `grow()` only reads the
    // attribute on `mouseover`, so without this the pill would keep showing
    // the stale label. Re-grow (safe/idempotent — just re-measures width
    // and re-sets text) whenever the currently-hovered target's attribute
    // mutates.
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

    // The hovered element can change out from under a stationary pointer
    // without any mouse event firing: a scroll carries it away (wheel,
    // Lenis anchor-scroll from a nav click), or a click toggles `inert` on
    // an overlay — inert drops the element from hit-testing without ever
    // firing mouseleave. Re-derive what's really under the last known
    // pointer position in both cases.
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

    // After a route change the pointer usually hasn't moved, but the DOM
    // under it is brand new (the old page unmounted without a mouseleave).
    // Re-derive against the new page once it has painted.
    const navRecheck = requestAnimationFrame(recheck);

    const clickRecheck = () => requestAnimationFrame(recheck);
    document.addEventListener("click", clickRecheck);

    // Leaving the window: hide the dot like a native cursor would, and
    // require a fresh move to re-reveal so re-entry snaps to the new
    // position instead of streaking in from where it left.
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
