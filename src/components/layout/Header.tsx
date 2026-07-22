"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/components/providers/LocaleProvider";
import { LangToggle } from "@/components/ui/LangToggle";
import { Logomark } from "@/components/ui/Logomark";
import { NavOverlay } from "@/components/layout/NavOverlay";
import { TransitionLink } from "@/components/layout/TransitionLink";
import { NAV_ITEMS } from "@/lib/nav";

export function Header() {
  const { t } = useLocale();
  const pathname = usePathname();
  // `#top` only exists on the landing page — from a project detail page the
  // logomark must route home (locale-aware: /en mirrors /) instead of
  // pointing at an anchor that silently does nothing.
  const homePath = pathname.startsWith("/en") ? "/en" : "/";
  const onHome = pathname === homePath;
  const activitiesHref = pathname.startsWith("/en") ? "/en/activities" : "/activities";
  const onActivities = pathname.startsWith("/activities") || pathname.startsWith("/en/activities");
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const lastScrollYRef = useRef(0);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    requestAnimationFrame(() => menuButtonRef.current?.focus());
  }, []);

  useEffect(() => {
    // Only section anchors participate in scroll-spy — page items like
    // "/activities" aren't selectors (querySelector would throw on them).
    const sections = NAV_ITEMS.filter((item) => item.href.startsWith("#"))
      .map((item) => document.querySelector(item.href))
      .filter((el): el is Element => Boolean(el));

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(`#${entry.target.id}`);
          }
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let frame = 0;
    lastScrollYRef.current = window.scrollY;

    const handleScroll = () => {
      if (frame) return;

      frame = window.requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const delta = currentY - lastScrollYRef.current;

        if (currentY <= 32) {
          setHeaderHidden(false);
          lastScrollYRef.current = currentY;
        } else if (delta > 8) {
          setHeaderHidden(true);
          lastScrollYRef.current = currentY;
        } else if (delta < -8) {
          setHeaderHidden(false);
          lastScrollYRef.current = currentY;
        }

        frame = 0;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [pathname]);

  return (
    <>
      <header
        onFocusCapture={() => setHeaderHidden(false)}
        className={`fixed inset-x-0 top-0 z-50 border-b border-hairline/60 bg-ink/80 backdrop-blur-sm transition-transform duration-500 ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transform-none motion-reduce:transition-none ${
          headerHidden && !menuOpen ? "-translate-y-full" : "translate-y-0"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-6 sm:px-10">
          <Link
            href={onHome ? "#top" : homePath}
            aria-label="Muhammad Aidil Fitrah"
            className="flex items-center gap-3 text-foreground"
            style={{ mixBlendMode: "difference" }}
          >
            <Logomark className="h-6 w-6" />
            <span className="font-mono text-xs font-semibold tracking-wider uppercase">
              MHDAIDIL.DEV
            </span>
          </Link>

          <div className="flex items-center gap-6">
            <TransitionLink
              href={activitiesHref}
              label={t.nav.activities}
              data-cursor={t.nav.activities}
              className={`hidden font-mono text-xs uppercase tracking-widest transition-colors sm:inline ${
                onActivities ? "text-volt" : "text-muted hover:text-foreground"
              }`}
            >
              {t.nav.activities}
            </TransitionLink>
            <LangToggle />
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-controls="primary-menu"
              aria-expanded={menuOpen}
              data-cursor={menuOpen ? t.nav.menuClose : t.nav.menuOpen}
              className="btn-fill inline-flex h-10 items-center justify-center rounded-pill border border-hairline px-5 font-mono text-xs uppercase tracking-widest text-foreground"
            >
              {menuOpen ? t.nav.menuClose : t.nav.menuOpen}
            </button>
          </div>
        </div>
      </header>

      <NavOverlay
        open={menuOpen}
        onClose={closeMenu}
        items={NAV_ITEMS}
        activeSection={activeSection}
      />
    </>
  );
}
