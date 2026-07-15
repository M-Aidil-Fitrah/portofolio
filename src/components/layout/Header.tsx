"use client";

import Link from "next/link";
import { useLocale } from "@/components/providers/LocaleProvider";
import { LangToggle } from "@/components/ui/LangToggle";

const NAV_ITEMS = [
  { href: "#about", key: "about" as const },
  { href: "#works", key: "works" as const },
  { href: "#skills", key: "skills" as const },
  { href: "#awards", key: "awards" as const },
  { href: "#contact", key: "contact" as const },
];

export function Header() {
  const { t } = useLocale();

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-hairline/60 bg-ink/80 backdrop-blur-sm">
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
              className="transition-colors hover:text-volt"
            >
              {t.nav[item.key]}
            </a>
          ))}
        </nav>

        <LangToggle />
      </div>
    </header>
  );
}
