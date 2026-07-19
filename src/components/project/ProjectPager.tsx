"use client";

import { useLocale } from "@/components/providers/LocaleProvider";
import { TransitionLink } from "@/components/layout/TransitionLink";
import { projects, type Project } from "@/lib/projects";

export function ProjectPager({ current }: { current: Project }) {
  const { t, locale } = useLocale();
  const currentPos = projects.findIndex((p) => p.slug === current.slug);
  const next = projects[(currentPos + 1) % projects.length];

  return (
    <div className="border-t border-hairline px-6 py-20 sm:px-10">
      <div className="mx-auto max-w-[1600px]">
        <p className="font-mono text-xs uppercase tracking-widest text-muted">
          {t.project.next}
        </p>
        <TransitionLink
          href={`/projects/${next.slug}`}
          label={`${next.index} — ${next.title}`}
          data-cursor={`${t.project.open} — ${next.title}`}
          className="group mt-6 block text-[clamp(2.5rem,10vw,8rem)] font-semibold uppercase leading-[0.9] tracking-tight transition-colors hover:text-volt"
        >
          {next.title}
        </TransitionLink>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
          {next.tagline[locale]}
        </p>
      </div>
    </div>
  );
}
