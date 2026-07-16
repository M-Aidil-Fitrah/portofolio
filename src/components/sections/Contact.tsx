"use client";

import { useRef } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { AnimatedText } from "@/components/ui/AnimatedText";
import { MagneticButton } from "@/components/ui/MagneticButton";
import { ScrambleHover } from "@/components/ui/ScrambleHover";
import { SectionSeam } from "@/components/ui/SectionSeam";
import { SOCIAL } from "@/lib/site";
import { useSectionReveal } from "@/lib/useSectionReveal";

export function Contact() {
  const { t, locale } = useLocale();
  const sectionRef = useRef<HTMLElement>(null);

  useSectionReveal(sectionRef, [locale]);

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

        <div className="mt-12 flex flex-col gap-8 border-t border-hairline pt-10 sm:flex-row sm:items-end sm:justify-between">
          <MagneticButton
            href={`mailto:${SOCIAL.email}`}
            data-cursor={t.contact.emailLabel}
            className="inline-block max-w-full break-words text-[clamp(1.25rem,7vw,2rem)] font-medium uppercase leading-tight tracking-tight text-foreground [overflow-wrap:anywhere] transition-colors hover:text-volt sm:text-4xl"
          >
            {SOCIAL.email}
          </MagneticButton>

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
