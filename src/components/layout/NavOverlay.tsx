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
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
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
      ref={rootRef}
      inert={!open}
      aria-hidden={!open}
      className={`fixed inset-0 z-[80] flex flex-col justify-between bg-ink px-6 py-24 transition-opacity duration-300 sm:px-10 ${
        open ? "visible opacity-100" : "invisible opacity-0"
      }`}
    >
      <nav aria-label="Primary" className="flex flex-1 flex-col justify-center gap-2">
        {items.map((item, i) => (
          <a
            key={item.key}
            href={item.href}
            data-nav-link
            aria-current={activeSection === item.href ? "true" : undefined}
            onClick={onClose}
            className={`group flex items-baseline gap-4 overflow-hidden border-b border-hairline py-4 transition-colors ${
              activeSection === item.href ? "text-volt" : "text-foreground"
            }`}
          >
            <span className="font-mono text-sm text-muted">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="text-[clamp(2.25rem,8vw,5.5rem)] font-semibold uppercase leading-none tracking-tight transition-colors group-hover:text-volt">
              <ScrambleHover text={t.nav[item.key]} />
            </span>
          </a>
        ))}
      </nav>

      <div className="flex flex-col gap-4 font-mono text-xs uppercase tracking-widest text-muted sm:flex-row sm:items-center sm:justify-between">
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
          LinkedIn &rarr;
        </a>
      </div>
    </div>
  );
}
