"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/components/providers/LocaleProvider";
import { LangToggle } from "@/components/ui/LangToggle";
import { ScrambleHover } from "@/components/ui/ScrambleHover";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";

const NAV_ITEMS = [
  { href: "#about", key: "about" as const },
  { href: "#works", key: "works" as const },
  { href: "#skills", key: "skills" as const },
  { href: "#awards", key: "awards" as const },
  { href: "#contact", key: "contact" as const },
];

export function Header() {
  const { t } = useLocale();
  const headerRef = useRef<HTMLElement>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useGSAP(() => {
    const header = headerRef.current;
    if (!header) return;

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const st = ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate: (self) => {
          if (self.scroll() < 80) {
            gsap.to(header, { yPercent: 0, duration: 0.3, ease: "power2.out" });
            return;
          }
          gsap.to(header, {
            yPercent: self.direction === 1 ? -100 : 0,
            duration: 0.3,
            ease: "power2.out",
          });
        },
      });
      return () => st.kill();
    });

    return () => mm.revert();
  }, { scope: headerRef as React.RefObject<HTMLElement> });

  useEffect(() => {
    const sections = NAV_ITEMS.map((item) =>
      document.querySelector(item.href)
    ).filter((el): el is Element => Boolean(el));

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
    <header
      ref={headerRef}
      className="fixed inset-x-0 top-0 z-50 border-b border-hairline/60 bg-ink/80 backdrop-blur-sm"
    >
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-6 sm:px-10">
        <Link
          href="#top"
          className="font-mono text-sm tracking-widest text-foreground"
          style={{ mixBlendMode: "difference" }}
        >
          AF&copy;
        </Link>

        <nav
          aria-label="Primary"
          className="hidden gap-8 font-mono text-xs uppercase tracking-widest text-muted md:flex"
        >
          {NAV_ITEMS.map((item) => (
            <a
              key={item.key}
              href={item.href}
              aria-current={activeSection === item.href ? "true" : undefined}
              className={`transition-colors hover:text-volt ${
                activeSection === item.href ? "text-volt" : ""
              }`}
            >
              <ScrambleHover text={t.nav[item.key]} />
            </a>
          ))}
        </nav>

        <LangToggle />
      </div>
    </header>
  );
}
