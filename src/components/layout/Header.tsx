"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/components/providers/LocaleProvider";
import { LangToggle } from "@/components/ui/LangToggle";
import { Logomark } from "@/components/ui/Logomark";
import { NavOverlay } from "@/components/layout/NavOverlay";
import { NAV_ITEMS } from "@/lib/nav";

export function Header() {
  const { t } = useLocale();
  const pathname = usePathname();
  // `#top` only exists on the landing page — from a project detail page the
  // logomark must route home (locale-aware: /en mirrors /) instead of
  // pointing at an anchor that silently does nothing.
  const homePath = pathname.startsWith("/en") ? "/en" : "/";
  const onHome = pathname === homePath;
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

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

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-hairline/60 bg-ink/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-6 sm:px-10">
          <Link
            href={onHome ? "#top" : homePath}
            aria-label="Muhammad Aidil Fitrah"
            className="text-foreground"
            style={{ mixBlendMode: "difference" }}
          >
            <Logomark className="h-6 w-6" />
          </Link>

          <div className="flex items-center gap-6">
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
