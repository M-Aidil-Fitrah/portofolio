"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useSmoothScroll } from "@/components/providers/SmoothScrollProvider";
import { AnimatedText } from "@/components/ui/AnimatedText";
import { ScrambleHover } from "@/components/ui/ScrambleHover";
import { SectionSeam } from "@/components/ui/SectionSeam";
import { Logomark } from "@/components/ui/Logomark";
import { NAV_ITEMS } from "@/lib/nav";
import { SOCIAL } from "@/lib/site";
import { useSectionReveal } from "@/lib/useSectionReveal";

export function Footer() {
  const { t } = useLocale();
  const { lenis } = useSmoothScroll();
  const pathname = usePathname();
  const year = new Date().getFullYear();
  const footerRef = useRef<HTMLElement>(null);

  const homePath = pathname.startsWith("/en") ? "/en" : "/";
  const onHome = pathname === homePath;

  // Same branching as NavOverlay: hashes only work on the landing page —
  // off-home they must point back at it; page links get the locale prefix.
  const navHref = (href: string) => {
    if (href.startsWith("/")) return homePath === "/en" ? `/en${href}` : href;
    return onHome ? href : `${homePath}${href}`;
  };

  useSectionReveal(footerRef);

  return (
    <footer ref={footerRef} className="relative px-6 pb-8 pt-16 sm:px-10">
      <div className="mx-auto max-w-[1600px]">
        <SectionSeam className="mb-16" />

        <p className="font-mono text-xs uppercase tracking-widest text-muted">
          {t.footer.availability}
        </p>

        <AnimatedText
          as="h2"
          type="chars"
          className="mt-4 whitespace-nowrap text-[clamp(2.5rem,13vw,9rem)] font-semibold uppercase leading-[0.9] tracking-tight"
        >
          {t.hero.wordmark}
        </AnimatedText>

        <div className="mt-16 grid grid-cols-1 gap-10 border-t border-hairline pt-10 sm:grid-cols-3">
          <nav
            aria-label="Footer"
            className="flex flex-col gap-3 font-mono text-xs uppercase tracking-widest text-muted"
          >
            {NAV_ITEMS.map((item) => (
              <a
                key={item.key}
                href={navHref(item.href)}
                className="w-fit transition-colors hover:text-volt"
              >
                <ScrambleHover text={t.nav[item.key]} />
              </a>
            ))}
          </nav>

          <div className="flex flex-col gap-3 font-mono text-xs uppercase tracking-widest text-muted">
            <a
              href={`mailto:${SOCIAL.email}`}
              className="w-fit transition-colors hover:text-volt"
            >
              {SOCIAL.email}
            </a>
            <a
              href={SOCIAL.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="w-fit transition-colors hover:text-volt"
            >
              {t.contact.linkedinLabel} &rarr;
            </a>
          </div>

          <div className="flex items-start sm:justify-end">
            <a
              href="#top"
              data-cursor={t.footer.backToTop}
              onClick={(e) => {
                e.preventDefault();
                lenis?.scrollTo("#top");
              }}
              className="btn-fill inline-flex h-11 items-center gap-2 rounded-pill border border-hairline px-5 font-mono text-xs uppercase tracking-widest text-foreground"
            >
              {t.footer.backToTop}
            </a>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-hairline pt-6 font-mono text-xs uppercase tracking-widest text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {year} Muhammad Aidil Fitrah — {t.footer.rights}
          </p>
          <Logomark className="h-4 w-4" />
        </div>
      </div>
    </footer>
  );
}
