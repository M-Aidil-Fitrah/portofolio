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

/** Brand marks vendored inline (simple-icons paths) — no icon library, per
 * the project convention. Duplicated from Contact.tsx (that file's copies
 * are unexported local components, same pattern used across the codebase
 * for small one-off SVGs). */
function LinkedInMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function GitHubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

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

        <div className="flex items-center gap-4 sm:gap-6">
          <Logomark className="h-9 w-9 shrink-0 text-foreground sm:h-12 sm:w-12" />
          <p className="font-mono text-xs uppercase tracking-widest text-muted">
            {t.footer.availability}
          </p>
        </div>

        <AnimatedText
          as="h2"
          type="chars"
          className="mt-4 whitespace-nowrap text-[clamp(2.5rem,13vw,9rem)] font-semibold uppercase leading-[0.9] tracking-tight"
        >
          {t.hero.wordmark}
        </AnimatedText>

        <div className="mt-16 grid grid-cols-1 gap-10 border-t border-hairline pt-10 sm:grid-cols-[1.2fr_1fr_auto] sm:gap-16">
          <nav
            aria-label="Footer"
            className="grid grid-cols-2 gap-x-6 gap-y-3 font-mono text-xs uppercase tracking-widest text-muted sm:grid-cols-3"
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
              className="group inline-flex w-fit items-center gap-2 transition-colors hover:text-volt"
            >
              <LinkedInMark className="h-3.5 w-3.5 shrink-0" />
              {t.contact.linkedinLabel} &rarr;
            </a>
            <a
              href={SOCIAL.github}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex w-fit items-center gap-2 transition-colors hover:text-volt"
            >
              <GitHubMark className="h-3.5 w-3.5 shrink-0" />
              {t.contact.githubLabel} &rarr;
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
        </div>
      </div>
    </footer>
  );
}
