"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { AnimatedText } from "@/components/ui/AnimatedText";
import { MagneticButton } from "@/components/ui/MagneticButton";
import { ScrambleHover } from "@/components/ui/ScrambleHover";

const EMAIL = "muhammadfitrah46@gmail.com";
const LINKEDIN_URL = "https://linkedin.com/in/muhammadaidilfitrahh";

function useBandaAcehTime() {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const formatter = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta",
    });
    const tick = () => setTime(formatter.format(new Date()));
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  return time;
}

export function Contact() {
  const { t } = useLocale();
  const time = useBandaAcehTime();

  return (
    <section
      id="contact"
      aria-labelledby="contact-heading"
      className="border-t border-hairline px-6 py-24 sm:px-10"
    >
      <div className="mx-auto max-w-[1600px]">
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
            href={`mailto:${EMAIL}`}
            data-cursor={t.contact.emailLabel}
            className="inline-block text-2xl font-medium uppercase tracking-tight text-foreground transition-colors hover:text-volt sm:text-4xl"
          >
            {EMAIL}
          </MagneticButton>

          <div className="flex flex-col gap-2 font-mono text-xs uppercase tracking-widest text-muted sm:items-end">
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-volt"
            >
              <ScrambleHover text={t.contact.linkedinLabel} /> &rarr;
            </a>
            <p>
              {t.contact.locationLabel} {t.contact.location}
            </p>
            <p aria-live="off">
              {time ?? "--:--"}{" "}
              <span className="text-muted/70">WIB</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
