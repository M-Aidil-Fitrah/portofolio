"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { usePreview } from "@/components/providers/PreviewProvider";
import { gsap, useGSAP } from "@/lib/gsap";
import { DUR, EASE, STAGGER } from "@/lib/animation";
import type { Project } from "@/lib/projects";

const PLACEHOLDER_COUNT = 4;

/** Native snap-scroller, not a GSAP hijack; GSAP adds only entrance and drag. */
export function ProjectGallery({ project }: { project: Project }) {
  const { t } = useLocale();
  const { openPreview } = usePreview();
  const rootRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  // Tells a click apart from the tail end of a drag.
  const dragDistRef = useRef(0);
  const [active, setActive] = useState(0);

  const frames =
    project.gallery && project.gallery.length > 0
      ? project.gallery
      : Array.from({ length: PLACEHOLDER_COUNT }, () => null);

  useGSAP(
    () => {
      const strip = stripRef.current;
      if (!strip) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tween = gsap.from(strip.children, {
          x: 80,
          opacity: 0,
          duration: DUR.base,
          ease: EASE.expo,
          stagger: STAGGER.items,
          scrollTrigger: { trigger: strip, start: "top 85%", toggleActions: "play none none reverse" },
        });
        return () => {
          tween.scrollTrigger?.kill();
          tween.kill();
        };
      });

      // Drag-to-scroll, mouse only so touch keeps its native momentum.
      mm.add("(pointer: fine)", () => {
        let dragging = false;
        let startX = 0;
        let startScroll = 0;

        const down = (e: PointerEvent) => {
          if (e.pointerType !== "mouse") return;
          dragging = true;
          dragDistRef.current = 0;
          startX = e.clientX;
          startScroll = strip.scrollLeft;
          strip.style.scrollSnapType = "none";
          // window listeners, not pointer capture: capture retargets clicks.
          window.addEventListener("pointermove", moveDrag);
          window.addEventListener("pointerup", up);
          window.addEventListener("pointercancel", up);
        };
        const moveDrag = (e: PointerEvent) => {
          if (!dragging) return;
          dragDistRef.current = Math.max(
            dragDistRef.current,
            Math.abs(e.clientX - startX)
          );
          strip.scrollLeft = startScroll - (e.clientX - startX);
        };
        const up = () => {
          dragging = false;
          strip.style.scrollSnapType = "";
          window.removeEventListener("pointermove", moveDrag);
          window.removeEventListener("pointerup", up);
          window.removeEventListener("pointercancel", up);
        };

        strip.addEventListener("pointerdown", down);
        return () => {
          strip.removeEventListener("pointerdown", down);
          window.removeEventListener("pointermove", moveDrag);
          window.removeEventListener("pointerup", up);
          window.removeEventListener("pointercancel", up);
        };
      });

      return () => mm.revert();
    },
    { scope: rootRef as React.RefObject<HTMLElement>, dependencies: [project.slug], revertOnUpdate: true }
  );

  const handleScroll = () => {
    const strip = stripRef.current;
    if (!strip || !strip.children.length) return;
    const frameWidth = strip.scrollWidth / strip.children.length;
    setActive(
      Math.min(frames.length - 1, Math.round(strip.scrollLeft / frameWidth))
    );
  };

  return (
    <div ref={rootRef} className="border-t border-hairline py-20">
      <div className="flex items-baseline justify-between px-6 sm:px-10">
        <div className="mx-auto flex w-full max-w-[1600px] items-baseline justify-between">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted">
            {t.project.gallery}
          </h2>
          <span className="font-mono text-xs tabular-nums tracking-widest text-muted">
            <span className="text-volt">
              {String(active + 1).padStart(2, "0")}
            </span>{" "}
            / {String(frames.length).padStart(2, "0")}
          </span>
        </div>
      </div>

      <div
        ref={stripRef}
        data-cursor={t.project.galleryDrag}
        onScroll={handleScroll}
        className="mt-8 flex snap-x snap-mandatory gap-6 overflow-x-auto px-6 pb-4 [scrollbar-width:none] sm:px-10 [&::-webkit-scrollbar]:hidden"
      >
        {frames.map((src, i) => (
          <figure
            key={src ?? i}
            role="button"
            tabIndex={0}
            data-cursor={t.preview.open}
            aria-label={`${project.title} — ${t.project.gallery} ${i + 1} (${t.preview.open})`}
            onClick={() => {
              if (dragDistRef.current > 6) return;
              openPreview({
                src: src ?? undefined,
                alt: `${project.title} — ${t.project.gallery} ${i + 1}`,
                caption: `${project.title} — ${String(i + 1).padStart(2, "0")}`,
                index: String(i + 1).padStart(2, "0"),
              });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                (e.currentTarget as HTMLElement).click();
              }
            }}
            className="relative flex aspect-[16/10] w-[85%] shrink-0 cursor-pointer snap-center items-center justify-center overflow-hidden rounded-card border border-hairline bg-surface select-none sm:w-[60%] lg:w-[45%]"
          >
            {src ? (
              <Image
                src={src}
                alt={`${project.title} — ${t.project.gallery} ${i + 1}`}
                fill
                sizes="(max-width: 640px) 85vw, (max-width: 1024px) 60vw, 45vw"
                className="pointer-events-none object-cover"
                draggable={false}
              />
            ) : (
              <>
                <span
                  aria-hidden="true"
                  className="pointer-events-none font-mono text-[10vw] leading-none text-hairline sm:text-[6vw]"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <figcaption className="absolute bottom-5 left-5 font-mono text-xs uppercase tracking-widest text-muted">
                  {project.title} — {String(i + 1).padStart(2, "0")}
                </figcaption>
              </>
            )}
          </figure>
        ))}
      </div>
    </div>
  );
}
