"use client";

import Link from "next/link";
import { useLocale } from "@/components/providers/LocaleProvider";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { AnimatedText } from "@/components/ui/AnimatedText";
import { projects } from "@/lib/projects";

export function Works() {
  const { t, locale } = useLocale();

  return (
    <section
      id="works"
      aria-labelledby="works-heading"
      className="border-t border-hairline px-6 py-24 sm:px-10"
    >
      <div className="mx-auto max-w-[1600px]">
        <SectionHeading index="02" label={t.works.label} />
        <AnimatedText
          as="h2"
          id="works-heading"
          className="mt-6 text-3xl font-semibold uppercase tracking-tight sm:text-5xl"
        >
          {t.works.heading}
        </AnimatedText>

        <ul className="mt-12 divide-y divide-hairline border-t border-hairline">
          {projects.map((project) => (
            <li key={project.slug}>
              <Link
                href={`/projects/${project.slug}`}
                className="group grid grid-cols-1 gap-4 py-10 transition-colors hover:bg-surface sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-8 sm:px-4"
              >
                <span className="font-mono text-sm text-volt">
                  {project.index}
                </span>

                <div>
                  <p className="text-2xl font-semibold uppercase tracking-tight sm:text-4xl">
                    {project.title}
                  </p>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
                    {project.tagline[locale]}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 font-mono text-[11px] uppercase tracking-widest text-muted">
                    {project.stack.map((tech) => (
                      <span
                        key={tech}
                        className="border border-hairline px-2 py-1"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                <span className="font-mono text-xs uppercase tracking-widest text-muted transition-colors group-hover:text-volt">
                  {t.works.viewCase} &rarr;
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
