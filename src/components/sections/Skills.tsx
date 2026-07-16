"use client";

import { useRef } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { AnimatedText } from "@/components/ui/AnimatedText";
import { Marquee } from "@/components/ui/Marquee";
import { TechIcon, hasTechIcon } from "@/components/ui/TechIcon";
import { SectionSeam } from "@/components/ui/SectionSeam";
import { useSectionReveal } from "@/lib/useSectionReveal";

function renderMarqueeItem(item: string) {
  if (!hasTechIcon(item)) {
    return (
      <span className="font-mono text-sm uppercase tracking-widest text-muted">
        {item}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-3" title={item}>
      <TechIcon name={item} className="h-6 w-6 text-muted" />
      <span className="sr-only">{item}</span>
    </span>
  );
}

export function Skills() {
  const { t, locale } = useLocale();
  const sectionRef = useRef<HTMLElement>(null);

  useSectionReveal(sectionRef, [locale]);

  return (
    <section
      ref={sectionRef}
      id="skills"
      aria-labelledby="skills-heading"
      className="py-24"
    >
      <div className="px-6 sm:px-10">
        <div className="mx-auto max-w-[1600px]">
          <SectionSeam className="mb-14" />
          <SectionHeading index="03" label={t.skills.label} />
          <AnimatedText
            as="h2"
            id="skills-heading"
            className="mt-6 max-w-2xl text-3xl font-semibold uppercase leading-tight tracking-tight sm:text-5xl"
          >
            {t.skills.heading.pre}
            <span className="font-accent italic normal-case text-volt">
              {t.skills.heading.italic}
            </span>
            {t.skills.heading.post}
          </AnimatedText>
        </div>
      </div>

      <div className="mt-14 space-y-4 border-y border-hairline py-6">
        <Marquee
          items={t.skills.languages}
          direction="left"
          speed={26}
          renderItem={renderMarqueeItem}
        />
        <Marquee
          items={t.skills.tools}
          direction="right"
          speed={22}
          renderItem={renderMarqueeItem}
        />
      </div>

      <div className="px-6 sm:px-10">
        <div className="mx-auto max-w-[1600px]">
          <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-3">
            {t.skills.groups.map((group) => (
              <div key={group.title}>
                <h3 className="font-mono text-xs uppercase tracking-widest text-muted">
                  {group.title}
                </h3>
                <ul className="mt-4 space-y-2">
                  {group.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-3 text-lg uppercase tracking-tight text-foreground/90"
                    >
                      <TechIcon name={item} className="h-5 w-5 shrink-0 text-muted" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
