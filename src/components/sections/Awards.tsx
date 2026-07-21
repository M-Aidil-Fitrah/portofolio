"use client";

import Image from "next/image";
import { useRef } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { AnimatedText } from "@/components/ui/AnimatedText";
import { SectionSeam } from "@/components/ui/SectionSeam";
import { gsap, useGSAP } from "@/lib/gsap";
import { DUR, EASE, STAGGER } from "@/lib/animation";
import { useSectionReveal } from "@/lib/useSectionReveal";
import { usePreview } from "@/components/providers/PreviewProvider";

/** Certificate photos per award row (same order as `t.awards.items`) — this
 * is the certificate gallery for the Awards section. Each entry opens in the
 * shared preview lightbox with the same zoom/pan/fullscreen controls as the
 * project and activity detail galleries.
 * TODO: drop real certificate scans into public/assets/awards/ and list
 * their paths here — `null` renders the designed placeholder frame. */
const AWARD_PHOTOS: (string | null)[] = [null, null, null, null, null, null];

export function Awards() {
  const { t } = useLocale();
  const { openPreview } = usePreview();
  const sectionRef = useRef<HTMLElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  useSectionReveal(sectionRef);

  useGSAP(
    () => {
      const table = tableRef.current;
      if (!table) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const rows = table.querySelectorAll("tbody tr");
        const tween = gsap.from(rows, {
          y: 40,
          opacity: 0,
          duration: DUR.fast,
          ease: EASE.out,
          stagger: STAGGER.items,
          scrollTrigger: { trigger: table, start: "top 85%", toggleActions: "play none none reverse" },
        });
        return () => {
          tween.scrollTrigger?.kill();
          tween.kill();
        };
      });

      return () => mm.revert();
    },
    { scope: tableRef as React.RefObject<HTMLElement>, dependencies: [] }
  );

  return (
    <section
      ref={sectionRef}
      id="awards"
      aria-labelledby="awards-heading"
      className="px-6 py-24 sm:px-10"
    >
      <div className="mx-auto max-w-[1600px]">
        <SectionSeam className="mb-14" />
        <SectionHeading index="04" label={t.awards.label} />
        <AnimatedText
          as="h2"
          id="awards-heading"
          className="mt-6 max-w-2xl text-3xl font-semibold uppercase leading-tight tracking-tight sm:text-5xl"
        >
          {t.awards.heading.pre}
          <span className="font-accent italic normal-case text-volt">
            {t.awards.heading.italic}
          </span>
          {t.awards.heading.post}
        </AnimatedText>

        {/* The table's min-content width can exceed very narrow viewports
            (touch zoom, long titles) — contain any overflow here so it
            scrolls within the section instead of widening the whole page. */}
        <div className="mt-12 overflow-x-auto">
        <table
          ref={tableRef}
          className="w-full border-t border-hairline text-left"
        >
          <caption className="sr-only">{t.awards.heading.italic}</caption>
          <tbody>
            {t.awards.items.map((award, i) => (
              <tr
                key={award.title}
                className="group border-b border-hairline transition-colors hover:bg-volt"
              >
                <td className="w-36 py-5 pr-4">
                  {/* Certificate gallery entry: dim/grayscale at rest, colors
                      on hover, and opens the shared preview lightbox (same
                      zoom/pan/fullscreen lightbox as the project and
                      activity detail galleries) once a real scan is set in
                      AWARD_PHOTOS. The corner glyph is a constant "this
                      opens a viewer" affordance — without it the thumbnail
                      alone doesn't read as clickable. */}
                  <button
                    type="button"
                    onClick={() =>
                      openPreview({
                        src: AWARD_PHOTOS[i] ?? undefined,
                        alt: award.title,
                        caption: `${award.title} — ${award.issuer}`,
                        index: String(i + 1).padStart(2, "0"),
                      })
                    }
                    data-cursor={t.preview.open}
                    aria-label={`${award.title} — ${t.preview.open}`}
                    className="group/cert relative flex h-20 w-32 items-center justify-center overflow-hidden rounded-card border border-hairline bg-surface brightness-75 grayscale transition-[filter] duration-500 hover:brightness-100 hover:grayscale-0 focus-visible:brightness-100 focus-visible:grayscale-0"
                  >
                    {AWARD_PHOTOS[i] ? (
                      <Image
                        src={AWARD_PHOTOS[i]}
                        alt=""
                        fill
                        sizes="128px"
                        className="object-cover"
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none font-mono text-2xl text-volt"
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    )}
                    <span
                      aria-hidden="true"
                      className="absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink/70 text-foreground opacity-0 transition-opacity duration-300 group-hover/cert:opacity-100"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-3.5 w-3.5" aria-hidden="true">
                        <path d="M8 5H5v3M16 5h3v3M8 19H5v-3M16 19h3v-3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </button>
                </td>
                <th
                  scope="row"
                  className="w-24 py-5 pr-4 font-mono text-sm font-normal text-muted group-hover:text-ink"
                >
                  {award.year}
                </th>
                <td className="py-5 pr-4 text-lg font-medium uppercase tracking-tight group-hover:text-ink">
                  <a
                    href={award.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${award.title} — ${t.awards.credential}`}
                    className="focus-visible:underline"
                  >
                    {award.title}
                    <span
                      aria-hidden="true"
                      className="ml-3 inline-block font-mono text-xs normal-case tracking-widest text-muted opacity-0 transition-opacity group-hover:text-ink group-hover:opacity-100"
                    >
                      {t.awards.credential} &nearr;
                    </span>
                  </a>
                </td>
                <td className="py-5 text-right font-mono text-xs uppercase tracking-widest text-muted group-hover:text-ink sm:text-left">
                  {award.issuer}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </section>
  );
}
