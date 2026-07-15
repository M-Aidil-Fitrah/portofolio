"use client";

import { useLocale } from "@/components/providers/LocaleProvider";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function Awards() {
  const { t } = useLocale();

  return (
    <section
      id="awards"
      aria-labelledby="awards-heading"
      className="border-t border-hairline px-6 py-24 sm:px-10"
    >
      <div className="mx-auto max-w-[1600px]">
        <SectionHeading index="04" label={t.awards.label} />
        <h2
          id="awards-heading"
          className="mt-6 max-w-2xl text-3xl font-semibold uppercase leading-tight tracking-tight sm:text-5xl"
        >
          {t.awards.heading.pre}
          <span className="font-accent italic normal-case text-volt">
            {t.awards.heading.italic}
          </span>
          {t.awards.heading.post}
        </h2>

        <table className="mt-12 w-full border-t border-hairline text-left">
          <caption className="sr-only">{t.awards.heading.italic}</caption>
          <tbody>
            {t.awards.items.map((award) => (
              <tr
                key={award.title}
                className="group border-b border-hairline transition-colors hover:bg-volt"
              >
                <th
                  scope="row"
                  className="w-24 py-5 pr-4 font-mono text-sm font-normal text-muted group-hover:text-ink"
                >
                  {award.year}
                </th>
                <td className="py-5 pr-4 text-lg font-medium uppercase tracking-tight group-hover:text-ink">
                  {award.title}
                </td>
                <td className="py-5 text-right font-mono text-xs uppercase tracking-widest text-muted group-hover:text-ink sm:text-left">
                  {award.issuer}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
