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

        {/* Certificate gallery — a "hung wall" of frames (alternating
            columns sit lower, each lifts on hover with a volt glow) rather
            than a plain grid or another horizontal scroller like
            ProjectGallery's. Every frame opens the same shared preview
            lightbox (zoom/pan/fullscreen) as the project and activity detail
            galleries once a real scan lands in AWARD_PHOTOS. */}
        <p className="mt-12 font-mono text-xs uppercase tracking-widest text-muted">
          {t.awards.certificatesLabel}
        </p>
        <div className="mt-5 grid grid-cols-3 gap-4 sm:grid-cols-6 sm:gap-5">
          {t.awards.items.map((award, i) => (
            <div key={award.title} className={i % 2 === 1 ? "sm:translate-y-10" : undefined}>
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
                className="group/cert relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-card border border-hairline bg-surface brightness-75 grayscale transition-all duration-500 hover:-translate-y-2 hover:brightness-100 hover:grayscale-0 hover:shadow-[0_24px_48px_-20px_rgba(217,255,61,0.3)] focus-visible:-translate-y-2 focus-visible:brightness-100 focus-visible:grayscale-0"
              >
                {AWARD_PHOTOS[i] ? (
                  <Image
                    src={AWARD_PHOTOS[i]}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 33vw, 16vw"
                    className="object-cover"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none font-mono text-3xl text-volt sm:text-4xl"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                )}
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-ink/90 via-ink/40 to-transparent px-3 pb-2.5 pt-8 opacity-0 transition-all duration-300 group-hover/cert:translate-y-0 group-hover/cert:opacity-100"
                >
                  <span className="line-clamp-2 block font-mono text-[10px] uppercase leading-snug tracking-widest text-foreground">
                    {award.title}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink/70 text-foreground opacity-0 transition-opacity duration-300 group-hover/cert:opacity-100"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-3.5 w-3.5" aria-hidden="true">
                    <path d="M8 5H5v3M16 5h3v3M8 19H5v-3M16 19h3v-3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </button>
            </div>
          ))}
        </div>

        {/* The table's min-content width can exceed very narrow viewports
            (touch zoom, long titles) — contain any overflow here so it
            scrolls within the section instead of widening the whole page. */}
        <div className="mt-12 grid gap-4 sm:hidden">
          {t.awards.items.map((award, i) => (
            <a
              key={award.title}
              href={award.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${award.title} — ${t.awards.credential}`}
              className="group border-t border-hairline py-5"
            >
              <span className="font-mono text-sm text-volt">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="ml-5 font-mono text-xs uppercase tracking-widest text-muted">
                {award.year}
              </span>
              <span className="mt-3 block text-xl font-medium uppercase leading-tight tracking-tight transition-colors group-hover:text-volt">
                {award.title}
              </span>
              <span className="mt-3 block font-mono text-[11px] uppercase leading-relaxed tracking-widest text-muted">
                {award.issuer}
              </span>
              <span className="mt-4 inline-flex font-mono text-xs uppercase tracking-widest text-volt">
                {t.awards.credential} &#8599;
              </span>
            </a>
          ))}
        </div>

        <div className="mt-16 hidden overflow-x-auto sm:mt-20 sm:block">
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
                  <td className="w-14 py-5 pr-4 font-mono text-sm text-volt">
                    {String(i + 1).padStart(2, "0")}
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
                        {t.awards.credential} &#8599;
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
