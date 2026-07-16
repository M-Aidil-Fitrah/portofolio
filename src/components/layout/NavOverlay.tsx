"use client";

import { useEffect, useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { DUR, EASE, STAGGER } from "@/lib/animation";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useSmoothScroll } from "@/components/providers/SmoothScrollProvider";
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
    { scope: rootRef as React.RefObject<HTMLElement>, dependencies: [open] }
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
          className="inline-flex h-10 items-center justify-center rounded-pill border border-hairline px-5 font-mono text-xs uppercase tracking-widest text-foreground transition-colors hover:border-volt hover:text-volt"
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
            onClick={onClose}
            className={`group flex items-baseline gap-4 overflow-hidden border-b border-hairline py-2.5 transition-colors sm:py-3 ${
              activeSection === item.href ? "text-volt" : "text-foreground"
            }`}
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
