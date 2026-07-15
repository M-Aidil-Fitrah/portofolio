"use client";

import Link from "next/link";
import { useLocale } from "@/components/providers/LocaleProvider";
import { ProjectCover } from "@/components/project/ProjectCover";
import type { Project } from "@/lib/projects";

export function CaseStudy({ project }: { project: Project }) {
  const { t, locale } = useLocale();

  return (
    <article>
      <div className="px-6 pt-28 sm:px-10">
        <div className="mx-auto max-w-[1600px]">
          <Link
            href="/#works"
            className="font-mono text-xs uppercase tracking-widest text-muted transition-colors hover:text-volt"
          >
            &larr; {t.works.label} / {project.index}
          </Link>

          <h1 className="mt-6 text-[clamp(2.5rem,10vw,8rem)] font-semibold uppercase leading-[0.92] tracking-tight">
            {project.title}
          </h1>

          <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-6 border-y border-hairline py-6 font-mono text-xs uppercase tracking-widest sm:grid-cols-4">
            <div>
              <dt className="text-muted">Role</dt>
              <dd className="mt-1 text-foreground normal-case tracking-normal">
                {project.role[locale]}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Year</dt>
              <dd className="mt-1 text-foreground">{project.year}</dd>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <dt className="text-muted">Stack</dt>
              <dd className="mt-1 text-foreground normal-case tracking-normal">
                {project.stack.join(", ")}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Links</dt>
              <dd className="mt-1 text-foreground">
                {project.links?.live || project.links?.repo ? (
                  <>
                    {project.links.live && (
                      <a
                        href={project.links.live}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline decoration-hairline underline-offset-4 hover:text-volt"
                      >
                        Live
                      </a>
                    )}
                  </>
                ) : (
                  <span className="normal-case tracking-normal text-muted">
                    &mdash;
                  </span>
                )}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-12 px-6 sm:px-10">
        <div className="mx-auto max-w-[1600px]">
          <ProjectCover project={project} />
        </div>
      </div>

      <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-12 px-6 py-20 sm:px-10 lg:grid-cols-[200px_minmax(0,60ch)]">
        <p className="font-mono text-xs uppercase tracking-widest text-muted">
          (Overview)
        </p>
        <div className="space-y-8">
          <p className="text-lg leading-relaxed text-foreground/90">
            {project.caseStudy.overview[locale]}
          </p>
          <div>
            <h2 className="font-mono text-xs uppercase tracking-widest text-muted">
              Problem
            </h2>
            <p className="mt-3 text-lg leading-relaxed text-foreground/90">
              {project.caseStudy.problem[locale]}
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-hairline px-6 py-20 sm:px-10">
        <div className="mx-auto max-w-[1600px]">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted">
            Features
          </h2>
          <ol className="mt-8 divide-y divide-hairline border-t border-hairline">
            {project.caseStudy.features.map((feature, i) => (
              <li
                key={feature.title.en}
                className="grid grid-cols-1 gap-3 py-8 sm:grid-cols-[80px_1fr_minmax(0,45ch)]"
              >
                <span className="font-mono text-sm text-volt">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="text-xl font-semibold uppercase tracking-tight">
                  {feature.title[locale]}
                </p>
                <p className="text-sm leading-relaxed text-muted">
                  {feature.body[locale]}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="border-t border-hairline px-6 py-20 sm:px-10">
        <div className="mx-auto max-w-[1600px]">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted">
            Outcome
          </h2>
          <p className="mt-4 max-w-3xl text-2xl font-medium leading-snug tracking-tight sm:text-4xl">
            {project.caseStudy.outcome[locale]}
          </p>
        </div>
      </div>
    </article>
  );
}
