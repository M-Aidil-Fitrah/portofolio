"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { gsap, useGSAP } from "@/lib/gsap";
import { DUR, EASE, STAGGER } from "@/lib/animation";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useSmoothScroll } from "@/components/providers/SmoothScrollProvider";
import { useTransition } from "@/components/providers/TransitionProvider";
import { ScrambleHover } from "@/components/ui/ScrambleHover";
import { SOCIAL } from "@/lib/site";
import type { NavItem } from "@/lib/nav";

interface NavOverlayProps {
  open: boolean;
  onClose: () => void;
  items: NavItem[];
  activeSection: string | null;
}

/** Full-screen menu panel toggled by Header's "Menu" pill. Stops Lenis
 * while open (same pattern as Preloader), reveals links with a staggered
 * GSAP entrance, and is fully skippable under reduced motion (instant
 * show/hide, no stagger). */
export function NavOverlay({ open, onClose, items, activeSection }: NavOverlayProps) {
  const { t } = useLocale();
  const rootRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const { lenis } = useSmoothScroll();
  const { navigate } = useTransition();
  const pathname = usePathname();
  // The landing page for the current locale route — section anchors only
  // exist there. `/en` mirrors `/` (see app/en), so both count as home.
  const homePath = pathname.startsWith("/en") ? "/en" : "/";
  const onHome = pathname === homePath;

  useEffect(() => {
    if (open) {
      lenis?.stop();
    } else {
      lenis?.start();
    }
    return () => {
      lenis?.start();
    };
  }, [open, lenis]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      const root = rootRef.current;
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !root) return;

      const focusable = Array.from(
        root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("inert"));

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    const raf = requestAnimationFrame(() => closeButtonRef.current?.focus());
    window.addEventListener("keydown", handleKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose]);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root || !open) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const links = root.querySelectorAll("[data-nav-link]");
        const tween = gsap.from(links, {
          yPercent: 110,
          duration: DUR.base,
          ease: EASE.out,
          stagger: STAGGER.items,
          delay: 0.15,
        });
        return () => {
          tween.kill();
        };
      });

      return () => mm.revert();
    },
    { scope: rootRef as React.RefObject<HTMLElement>, dependencies: [open], revertOnUpdate: true }
  );

  return (
    <div
      id="primary-menu"
      ref={rootRef}
      inert={!open}
      aria-hidden={!open}
      role="dialog"
      aria-modal={open}
      className={`fixed inset-0 z-[80] flex flex-col justify-between overflow-y-auto bg-ink px-6 py-6 transition-opacity duration-300 sm:px-10 sm:py-8 ${
        open ? "visible opacity-100" : "invisible opacity-0"
      }`}
    >
      <div className="mb-8 flex items-center justify-end">
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          data-cursor={t.nav.menuClose}
          className="btn-fill inline-flex h-10 items-center justify-center rounded-pill border border-hairline px-5 font-mono text-xs uppercase tracking-widest text-foreground"
        >
          {t.nav.menuClose}
        </button>
      </div>

      <nav aria-label="Primary" className="flex flex-col gap-1">
        {items.map((item, i) => (
          <a
            key={item.key}
            href={item.href}
            data-nav-link
            aria-current={activeSection === item.href ? "true" : undefined}
            onClick={(e) => {
              // Don't let Lenis's own anchors:true click interception (a
              // document-level listener, so it'd still fire after this
              // React bubble-phase handler even with preventDefault) race
              // the menu-close effect's lenis.start() below — two
              // competing scrollTo calls, one of them starting while Lenis
              // is still stopped from the menu being open, is what was
              // sending this way past the target. stopPropagation keeps
              // the click from ever reaching Lenis's listener; we drive
              // the scroll ourselves once Lenis is definitely running.
              e.preventDefault();
              e.stopPropagation();
              onClose();
              // Standalone pages (e.g. /activities) route directly, kept
              // inside the current locale mirror.
              if (item.href.startsWith("/")) {
                const target =
                  homePath === "/en" ? `/en${item.href}` : item.href;
                if (pathname !== target) navigate(target, t.nav[item.key]);
                return;
              }
              // Off the landing page there is no `#about`/`#works` element
              // to scroll to — the click used to silently do nothing.
              // Route home (with the transition overlay) carrying the
              // hash; the landing page scrolls to it once mounted.
              if (!onHome) {
                navigate(`${homePath}${item.href}`, t.nav[item.key]);
                return;
              }
              window.history.pushState(null, "", item.href);
              // Deferred a frame: `onClose` schedules the `open`-watching
              // effect's own `lenis.start()` (below) for right after this
              // handler returns — calling scrollTo before that lands lets
              // it clobber/cancel the animation we're about to start.
              requestAnimationFrame(() => {
                lenis?.start();
                lenis?.scrollTo(item.href);
              });
            }}
            className={`group flex items-baseline gap-4 overflow-hidden border-b border-hairline py-2.5 transition-colors sm:py-3 ${
              // Header shows its own quick link to Activities from sm up —
              // this row stays mobile-only so the two never duplicate.
              item.key === "activities" ? "sm:hidden" : ""
            } ${activeSection === item.href ? "text-volt" : "text-foreground"}`}
          >
            <span className="font-mono text-sm text-muted">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="text-[clamp(1.75rem,6vw,4rem)] font-semibold uppercase leading-none tracking-tight transition-colors group-hover:text-volt">
              <ScrambleHover text={t.nav[item.key]} />
            </span>
          </a>
        ))}
      </nav>

      <div className="flex shrink-0 flex-col gap-4 pt-8 font-mono text-xs uppercase tracking-widest text-muted sm:flex-row sm:items-center sm:justify-between">
        <a
          href={`mailto:${SOCIAL.email}`}
          className="transition-colors hover:text-volt"
        >
          {SOCIAL.email}
        </a>
        <a
          href={SOCIAL.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:text-volt"
        >
          {t.contact.linkedinLabel} &rarr;
        </a>
      </div>
    </div>
  );
}
