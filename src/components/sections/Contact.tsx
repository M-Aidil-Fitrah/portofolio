"use client";

import { useRef, useState } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { AnimatedText } from "@/components/ui/AnimatedText";
import { ScrambleHover } from "@/components/ui/ScrambleHover";
import { SectionSeam } from "@/components/ui/SectionSeam";
import { LiveClock } from "@/components/ui/LiveClock";
import { SOCIAL } from "@/lib/site";
import { useSectionReveal } from "@/lib/useSectionReveal";

function AvailabilityGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="2.25" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Brand marks vendored inline (simple-icons paths) — no icon library, per
 * the project convention. */
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

function ClockGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7.5V12l3 2" strokeLinecap="round" />
    </svg>
  );
}

export function Contact() {
  const { t, locale } = useLocale();
  const sectionRef = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | undefined>(undefined);

  useSectionReveal(sectionRef);

  const cvHref =
    locale === "id"
      ? "/assets/cv/CV%20Aidil%20(Indonesia).pdf"
      : "/assets/cv/CV%20Aidil%20(Inggris).pdf";

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SOCIAL.email);
      setCopied(true);
      window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be unavailable (permissions, insecure context) —
      // fall back to the plain mailto behavior instead of failing silently.
      window.location.href = `mailto:${SOCIAL.email}`;
    }
  };

  const meta = [
    { icon: AvailabilityGlyph, label: t.contact.meta.availability.label, detail: t.contact.meta.availability.detail },
  ];

  return (
    <section
      ref={sectionRef}
      id="contact"
      aria-labelledby="contact-heading"
      className="px-6 py-24 sm:px-10"
    >
      <div className="mx-auto max-w-[1600px]">
        <SectionSeam className="mb-14" />
        <SectionHeading index="05" label={t.contact.label} />

        <AnimatedText
          as="h2"
          id="contact-heading"
          type="chars"
          className="mt-6 text-[clamp(2.5rem,14vw,9rem)] font-semibold uppercase leading-[0.9] tracking-tight"
        >
          {t.contact.heading}
        </AnimatedText>

        <p className="mt-8 max-w-xl text-lg leading-relaxed text-muted">
          {t.contact.body}
        </p>

        <div className="mt-14 grid grid-cols-1 gap-8 border-t border-hairline pt-10 sm:grid-cols-3">
          {meta.map(({ icon: Icon, label, detail }) => (
            <div key={label} className="flex items-center gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-hairline text-volt">
                <Icon className="h-5 w-5" />
              </span>
              <span>
                <span className="block font-mono text-xs uppercase tracking-widest text-foreground">
                  {label}
                </span>
                <span className="mt-1 block text-sm text-muted">{detail}</span>
              </span>
            </div>
          ))}
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-hairline text-volt">
              <ClockGlyph className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-mono text-xs uppercase tracking-widest text-foreground">
                {t.contact.meta.timezone.label}
              </span>
              <span className="mt-1 block font-mono text-sm tabular-nums text-muted">
                <LiveClock /> ({t.contact.meta.timezone.detail})
              </span>
            </span>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-8 border-t border-hairline pt-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <button
              type="button"
              onClick={copyEmail}
              data-cursor={copied ? t.contact.copied : t.contact.copyEmail}
              className="inline-block max-w-full break-words text-left text-[clamp(1.25rem,7vw,2rem)] font-medium uppercase leading-tight tracking-tight text-foreground [overflow-wrap:anywhere] transition-colors hover:text-volt sm:text-4xl"
            >
              {SOCIAL.email}
            </button>
            <p
              aria-live="polite"
              className="mt-2 font-mono text-xs uppercase tracking-widest text-muted"
            >
              {copied ? (
                <span className="text-volt">{t.contact.copied}</span>
              ) : (
                <>
                  {t.contact.copyEmail} &darr; /{" "}
                  <a
                    href={`mailto:${SOCIAL.email}`}
                    className="underline decoration-hairline underline-offset-4 transition-colors hover:text-volt"
                  >
                    {t.contact.emailLabel}
                  </a>
                </>
              )}
            </p>
          </div>

          <div className="flex flex-col gap-3 font-mono text-xs uppercase tracking-widest text-muted sm:items-end">
            <a
              href={cvHref}
              download
              className="btn-fill inline-flex h-11 w-fit items-center gap-2 rounded-pill border border-volt px-5 text-volt"
            >
              {t.contact.cvLabel} &darr;
            </a>
            <a
              href={SOCIAL.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 transition-colors hover:text-volt"
            >
              <LinkedInMark className="h-3.5 w-3.5" />
              <ScrambleHover text={t.contact.linkedinLabel} /> &rarr;
            </a>
            <a
              href={SOCIAL.github}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 transition-colors hover:text-volt"
            >
              <GitHubMark className="h-3.5 w-3.5" />
              <ScrambleHover text={t.contact.githubLabel} /> &rarr;
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
