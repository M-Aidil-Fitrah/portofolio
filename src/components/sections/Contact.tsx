"use client";

import { useRef } from "react";
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
  const { t } = useLocale();
  const sectionRef = useRef<HTMLElement>(null);

  useSectionReveal(sectionRef);

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
          <a
            href={`mailto:${SOCIAL.email}`}
            data-cursor={t.contact.emailLabel}
            className="inline-block max-w-full break-words text-[clamp(1.25rem,7vw,2rem)] font-medium uppercase leading-tight tracking-tight text-foreground [overflow-wrap:anywhere] transition-colors hover:text-volt sm:text-4xl"
          >
            {SOCIAL.email}
          </a>

          <div className="flex flex-col gap-2 font-mono text-xs uppercase tracking-widest text-muted sm:items-end">
            <a
              href={SOCIAL.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-volt"
            >
              <ScrambleHover text={t.contact.linkedinLabel} /> &rarr;
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
