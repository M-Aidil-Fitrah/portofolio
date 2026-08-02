"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ActivityCover } from "@/components/activities/ActivityCover";
import { useLocale } from "@/components/providers/LocaleProvider";
import type {
  ActivityCover as ActivityCoverData,
  ActivityCoverTemplate,
} from "@/lib/activities";
import {
  MAX_IMAGE_FILE_SIZE,
  activityFileToDataUrl,
} from "./activity-admin-config";

const COVER_TEMPLATES: ActivityCoverTemplate[] = [
  "none",
  "editorial",
  "project",
  "achievement",
  "custom",
];

export function ActivityCoverComposer({
  cover,
  title,
  category,
  date,
  previewLocale,
  onApply,
  onCrop,
  onReplace,
}: {
  cover: ActivityCoverData;
  title: { en: string; id: string };
  category: { en: string; id: string };
  date: string;
  previewLocale: "en" | "id";
  onApply: (cover: ActivityCoverData) => void;
  onCrop: () => void;
  onReplace: (file: File | null) => void;
}) {
  const { t } = useLocale();
  const [template, setTemplate] = useState(cover.template);
  const [customOverlaySrc, setCustomOverlaySrc] = useState(
    cover.customOverlaySrc
  );
  const [rendering, setRendering] = useState(false);
  const previewCover: ActivityCoverData = {
    ...cover,
    template,
    customOverlaySrc,
    renderedSrc: undefined,
  };
  const canRender = template !== "custom" || Boolean(customOverlaySrc);

  const readOverlay = async (file: File | null) => {
    if (!file) return;
    if (file.type !== "image/png" || file.size > MAX_IMAGE_FILE_SIZE) {
      toast.error(t.activities.admin.coverComposer.overlayError);
      return;
    }

    const toastId = toast.loading(
      t.activities.admin.coverComposer.overlayChecking
    );
    try {
      const source = await activityFileToDataUrl(file);
      if (!(await imageHasTransparency(source))) {
        toast.error(t.activities.admin.coverComposer.overlayOpaque, {
          id: toastId,
        });
        return;
      }
      setCustomOverlaySrc(source);
      setTemplate("custom");
      toast.success(t.activities.admin.coverComposer.overlayReady, {
        id: toastId,
      });
    } catch {
      toast.error(t.activities.admin.coverComposer.overlayError, {
        id: toastId,
      });
    }
  };

  const render = async () => {
    if (!cover.src || !canRender || rendering) return;
    setRendering(true);
    const toastId = toast.loading(t.activities.admin.coverComposer.rendering);

    try {
      onApply({
        ...cover,
        template,
        customOverlaySrc:
          template === "custom" ? customOverlaySrc : undefined,
        renderedSrc: undefined,
        status: "ready",
        error: undefined,
      });
      toast.success(t.activities.admin.coverComposer.rendered, {
        id: toastId,
      });
    } finally {
      setRendering(false);
    }
  };

  return (
    <section className="border-b border-hairline py-7" data-cover-composer>
      <div className="flex flex-col gap-6 xl:grid xl:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <ActivityCover
            cover={previewCover}
            title={title[previewLocale]}
            category={category[previewLocale]}
            date={date}
            locale={previewLocale}
            sizes="(max-width: 1280px) 100vw, 800px"
            className="rounded-card"
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onCrop}
              className="rounded-pill border border-hairline px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-muted transition-colors hover:border-volt hover:text-volt"
            >
              {t.activities.admin.crop.cover}
            </button>
            <label className="cursor-pointer rounded-pill border border-hairline px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-muted transition-colors hover:border-volt hover:text-volt">
              {t.activities.admin.coverComposer.replaceCover}
              <input
                type="file"
                accept="image/*"
                aria-label={t.activities.admin.coverComposer.replaceCover}
                className="sr-only"
                onChange={(event) => {
                  onReplace(event.target.files?.[0] ?? null);
                  event.target.value = "";
                }}
              />
            </label>
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted">
              1600 × 900 / WebP lossless
            </span>
          </div>
        </div>

        <div className="border border-hairline bg-surface/30 p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-volt">
            {t.activities.admin.coverComposer.eyebrow}
          </p>
          <h3 className="mt-2 text-xl font-semibold uppercase">
            {t.activities.admin.coverComposer.title}
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {t.activities.admin.coverComposer.hint}
          </p>

          <fieldset className="mt-5">
            <legend className="font-mono text-[10px] uppercase tracking-widest text-muted">
              {t.activities.admin.coverComposer.template}
            </legend>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {COVER_TEMPLATES.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={template === option}
                  onClick={() => setTemplate(option)}
                  className={`border px-3 py-2.5 text-left font-mono text-[9px] uppercase tracking-widest transition-colors ${
                    template === option
                      ? "border-volt text-volt"
                      : "border-hairline text-muted hover:text-foreground"
                  }`}
                >
                  {t.activities.admin.coverComposer.templates[option]}
                </button>
              ))}
            </div>
          </fieldset>

          {template === "custom" && (
            <div className="mt-5 border-t border-hairline pt-5">
              <label className="block cursor-pointer border border-dashed border-hairline p-4 text-center transition-colors hover:border-volt">
                <span className="font-mono text-[10px] uppercase tracking-widest text-foreground">
                  {customOverlaySrc
                    ? t.activities.admin.coverComposer.replaceOverlay
                    : t.activities.admin.coverComposer.addOverlay}
                </span>
                <span className="mt-2 block text-xs leading-relaxed text-muted">
                  {t.activities.admin.coverComposer.overlayHint}
                </span>
                <input
                  type="file"
                  accept="image/png"
                  aria-label={t.activities.admin.coverComposer.addOverlay}
                  className="sr-only"
                  onChange={(event) => {
                    void readOverlay(event.target.files?.[0] ?? null);
                    event.target.value = "";
                  }}
                />
              </label>
              {customOverlaySrc && (
                <button
                  type="button"
                  onClick={() => setCustomOverlaySrc(undefined)}
                  className="mt-3 font-mono text-[9px] uppercase tracking-widest text-muted transition-colors hover:text-foreground"
                >
                  {t.activities.admin.coverComposer.removeOverlay}
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            disabled={!canRender || rendering}
            onClick={() => void render()}
            className="mt-6 w-full rounded-pill border border-volt bg-volt px-5 py-3 font-mono text-[10px] uppercase tracking-widest text-ink transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {rendering
              ? t.activities.admin.coverComposer.rendering
              : t.activities.admin.coverComposer.apply}
          </button>
        </div>
      </div>
    </section>
  );
}

async function imageHasTransparency(source: string) {
  const image = await loadImage(source);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return false;

  const scale = Math.min(1, 256 / Math.max(image.naturalWidth, image.naturalHeight));
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let alpha = 3; alpha < pixels.length; alpha += 4) {
    if (pixels[alpha] < 255) return true;
  }
  return false;
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}
