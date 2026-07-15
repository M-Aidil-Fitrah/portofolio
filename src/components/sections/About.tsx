"use client";

import Image from "next/image";
import { useLocale } from "@/components/providers/LocaleProvider";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { AnimatedText } from "@/components/ui/AnimatedText";

export function About() {
  const { t, locale } = useLocale();

  return (
    <section
      id="about"
      aria-labelledby="about-heading"
      className="border-t border-hairline px-6 py-24 sm:px-10"
    >
      <div className="mx-auto max-w-[1600px]">
        <SectionHeading index="01" label={t.about.label} />

        <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-20">
          <div className="relative aspect-[2/3] w-full max-w-md overflow-hidden bg-surface lg:sticky lg:top-28">
            <Image
              src="/assets/orang/FotoUSKcrop.png"
              alt={
                locale === "id"
                  ? "Foto Muhammad Aidil Fitrah"
                  : "Portrait of Muhammad Aidil Fitrah"
              }
              width={1600}
              height={2400}
              sizes="(max-width: 1024px) 100vw, 40vw"
              quality={75}
              className="h-full w-full object-cover grayscale transition-[filter] duration-700 hover:grayscale-0"
            />
          </div>

          <div>
            <AnimatedText
              as="h2"
              id="about-heading"
              className="max-w-2xl text-3xl font-semibold uppercase leading-tight tracking-tight sm:text-5xl"
            >
              {t.about.heading.pre}
              <span className="font-accent italic normal-case text-volt">
                {t.about.heading.italic}
              </span>
              {t.about.heading.post}
            </AnimatedText>

            <div className="mt-8 max-w-2xl space-y-5 text-lg leading-relaxed text-foreground/90">
              {t.about.paragraphs.map((paragraph) => (
                <AnimatedText as="p" key={paragraph}>
                  {paragraph}
                </AnimatedText>
              ))}
            </div>

            <dl className="mt-12 grid grid-cols-2 gap-6 border-t border-hairline pt-8 sm:grid-cols-4">
              {t.about.stats.map((stat) => (
                <div key={stat.label}>
                  <dt className="sr-only">{stat.label}</dt>
                  <dd className="font-mono text-3xl text-volt">
                    {stat.value}
                  </dd>
                  <dd className="mt-1 font-mono text-xs uppercase tracking-widest text-muted">
                    {stat.label}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-12 border-t border-hairline pt-8">
              <h3 className="font-mono text-xs uppercase tracking-widest text-muted">
                {t.about.organizationsLabel}
              </h3>
              <ul className="mt-4 space-y-6">
                {t.about.organizations.map((org) => (
                  <li
                    key={org.org}
                    className="border-b border-hairline pb-6 last:border-b-0"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <p className="font-semibold uppercase tracking-tight">
                        {org.org}
                      </p>
                      <p className="font-mono text-xs uppercase tracking-widest text-muted">
                        {org.period}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-muted">{org.role}</p>
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-foreground/80">
                      {org.detail}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
