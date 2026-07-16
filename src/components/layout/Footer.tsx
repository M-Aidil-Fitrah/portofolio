"use client";

import { useLocale } from "@/components/providers/LocaleProvider";
import { useSmoothScroll } from "@/components/providers/SmoothScrollProvider";
import { AnimatedText } from "@/components/ui/AnimatedText";
import { MagneticButton } from "@/components/ui/MagneticButton";
import { ScrambleHover } from "@/components/ui/ScrambleHover";
import { SectionSeam } from "@/components/ui/SectionSeam";
import { Logomark } from "@/components/ui/Logomark";
import { NAV_ITEMS } from "@/lib/nav";
import { SOCIAL } from "@/lib/site";

export function Footer() {
  const { t } = useLocale();
  const { lenis } = useSmoothScroll();
  const year = new Date().getFullYear();

  return (
    <footer className="relative px-6 pb-8 pt-16 sm:px-10">
      <div className="mx-auto max-w-[1600px]">
        <SectionSeam className="mb-16" />

        <a href="#contact" data-cursor={t.contact.emailLabel} className="block w-fit">
          <AnimatedText
            as="h2"
            type="chars"
            className="text-[clamp(2.5rem,12vw,8rem)] font-semibold uppercase leading-[0.9] tracking-tight transition-colors hover:text-volt"
          >
            {t.footer.tagline.pre}
            <span className="font-accent italic normal-case text-volt">
              {t.footer.tagline.italic}
            </span>
            {t.footer.tagline.post}
          </AnimatedText>
        </a>

        <p className="mt-6 max-w-md font-mono text-xs uppercase tracking-widest text-muted">
          {t.footer.availability}
        </p>

        <div className="mt-16 grid grid-cols-1 gap-10 border-t border-hairline pt-10 sm:grid-cols-3">
          <nav
            aria-label="Footer"
            className="flex flex-col gap-3 font-mono text-xs uppercase tracking-widest text-muted"
          >
            {NAV_ITEMS.map((item) => (
              <a
                key={item.key}
                href={item.href}
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
              LinkedIn &rarr;
            </a>
          </div>

          <div className="flex items-start sm:justify-end">
            <MagneticButton
              href="#top"
              data-cursor={t.footer.backToTop}
              onClick={(e) => {
                e.preventDefault();
                lenis?.scrollTo("#top");
              }}
              className="inline-flex h-11 items-center gap-2 border border-hairline px-5 font-mono text-xs uppercase tracking-widest text-foreground transition-colors hover:border-volt hover:text-volt"
            >
              {t.footer.backToTop}
            </MagneticButton>
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
