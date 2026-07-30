"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { toast } from "sonner";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { ActivityCrop } from "@/lib/activities";
import {
  createActivityCropMetadata,
  renderActivityCrop,
  type ActivityCropResult,
} from "./activity-image-crop";

export interface CropAspectPreset {
  label: "landscape" | "classic" | "square" | "portrait";
  value: number;
}

export const ACTIVITY_CROP_ASPECTS: CropAspectPreset[] = [
  { label: "landscape", value: 16 / 9 },
  { label: "classic", value: 4 / 3 },
  { label: "square", value: 1 },
  { label: "portrait", value: 3 / 4 },
];

const DEFAULT_POSITION: Point = { x: 0, y: 0 };

export function ActivityImageCropper({
  source,
  alt,
  existingCrop,
  aspects = ACTIVITY_CROP_ASPECTS,
  defaultAspect = aspects[0]?.value ?? 1,
  onApply,
  onClose,
}: {
  source: string;
  alt: string;
  existingCrop?: ActivityCrop;
  aspects?: CropAspectPreset[];
  defaultAspect?: number;
  onApply: (result: ActivityCropResult) => void;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const cropPixelsRef = useRef<Area | null>(null);
  const cropAreaRef = useRef<Area | null>(existingCrop?.area ?? null);
  const initialAspect = useMemo(
    () =>
      aspects.find(
        (preset) =>
          Math.abs(preset.value - (existingCrop?.aspectRatio ?? defaultAspect)) <
          0.001
      )?.value ?? defaultAspect,
    [aspects, defaultAspect, existingCrop?.aspectRatio]
  );
  const [position, setPosition] = useState<Point>(
    existingCrop?.position ?? DEFAULT_POSITION
  );
  const [zoom, setZoom] = useState(existingCrop?.zoom ?? 1);
  const [rotation, setRotation] = useState(existingCrop?.rotation ?? 0);
  const [aspect, setAspect] = useState(initialAspect);
  const [ready, setReady] = useState(false);
  const [applying, setApplying] = useState(false);

  const reset = useCallback(() => {
    setPosition(DEFAULT_POSITION);
    setZoom(1);
    setRotation(0);
    setAspect(defaultAspect);
    cropAreaRef.current = null;
    cropPixelsRef.current = null;
    setReady(false);
  }, [defaultAspect]);

  const rotate = (amount: number) => {
    setRotation((current) => normalizeRotation(current + amount));
  };

  const apply = async () => {
    const area = cropAreaRef.current;
    const pixels = cropPixelsRef.current;
    if (!area || !pixels || applying) return;

    setApplying(true);
    const toastId = toast.loading(t.activities.admin.crop.applying);
    try {
      const src = await renderActivityCrop(source, pixels, rotation);
      onApply({
        src,
        crop: createActivityCropMetadata({
          position,
          area,
          zoom,
          rotation,
          aspectRatio: aspect,
        }),
      });
      toast.success(t.activities.admin.crop.applied, { id: toastId });
      onClose();
    } catch {
      toast.error(t.activities.admin.crop.failed, { id: toastId });
      setApplying(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || applying) return;
      event.preventDefault();
      onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [applying, onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="activity-crop-title"
      className="fixed inset-0 z-[140] flex items-center justify-center bg-ink/95 p-3 backdrop-blur-md sm:p-6"
    >
      <div className="flex max-h-[94svh] w-full max-w-5xl flex-col overflow-hidden border border-hairline bg-ink">
        <header className="flex items-start justify-between gap-5 border-b border-hairline p-4 sm:p-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-volt">
              {t.activities.admin.crop.eyebrow}
            </p>
            <h2
              id="activity-crop-title"
              className="mt-2 text-xl font-semibold uppercase sm:text-2xl"
            >
              {t.activities.admin.crop.title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              {t.activities.admin.crop.hint}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            disabled={applying}
            onClick={onClose}
            aria-label={t.activities.admin.crop.cancel}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-hairline text-xl text-muted transition-colors hover:border-volt hover:text-volt disabled:opacity-40"
          >
            ×
          </button>
        </header>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="relative min-h-[42svh] overflow-hidden bg-black sm:min-h-[52svh]">
            <Cropper
              image={source}
              crop={position}
              zoom={zoom}
              rotation={rotation}
              aspect={aspect}
              minZoom={1}
              maxZoom={4}
              cropShape="rect"
              objectFit="contain"
              showGrid
              zoomSpeed={0.12}
              keyboardStep={2}
              onCropChange={setPosition}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={(area, pixels) => {
                cropAreaRef.current = area;
                cropPixelsRef.current = pixels;
                setReady(true);
              }}
              initialCroppedAreaPercentages={existingCrop?.area}
              mediaProps={{ "aria-label": alt }}
              classes={{
                cropAreaClassName: "!border-volt !shadow-[0_0_0_9999em_rgba(5,5,5,0.66)]",
              }}
            />
          </div>

          <aside className="overflow-y-auto border-t border-hairline p-4 lg:border-l lg:border-t-0 lg:p-5">
            <fieldset>
              <legend className="font-mono text-[10px] uppercase tracking-widest text-muted">
                {t.activities.admin.crop.aspect}
              </legend>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {aspects.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    aria-pressed={Math.abs(aspect - preset.value) < 0.001}
                    onClick={() => {
                      setAspect(preset.value);
                      setPosition(DEFAULT_POSITION);
                      cropAreaRef.current = null;
                      cropPixelsRef.current = null;
                      setReady(false);
                    }}
                    className={`border px-3 py-2 font-mono text-[9px] uppercase tracking-widest transition-colors ${
                      Math.abs(aspect - preset.value) < 0.001
                        ? "border-volt text-volt"
                        : "border-hairline text-muted hover:text-foreground"
                    }`}
                  >
                    {t.activities.admin.crop.aspects[preset.label]}
                  </button>
                ))}
              </div>
            </fieldset>

            <CropRange
              label={t.activities.admin.crop.zoom}
              value={zoom}
              min={1}
              max={4}
              step={0.01}
              output={`${zoom.toFixed(2)}×`}
              onChange={setZoom}
            />
            <CropRange
              label={t.activities.admin.crop.rotation}
              value={rotation}
              min={-180}
              max={180}
              step={1}
              output={`${Math.round(rotation)}°`}
              onChange={setRotation}
            />

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => rotate(-90)}
                className="border border-hairline px-3 py-2 font-mono text-[9px] uppercase tracking-widest text-muted transition-colors hover:border-volt hover:text-volt"
              >
                ↶ {t.activities.admin.crop.rotateLeft}
              </button>
              <button
                type="button"
                onClick={() => rotate(90)}
                className="border border-hairline px-3 py-2 font-mono text-[9px] uppercase tracking-widest text-muted transition-colors hover:border-volt hover:text-volt"
              >
                {t.activities.admin.crop.rotateRight} ↷
              </button>
            </div>

            <p className="mt-5 text-xs leading-relaxed text-muted">
              {t.activities.admin.crop.keyboardHint}
            </p>
          </aside>
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-hairline p-4 sm:p-5">
          <button
            type="button"
            disabled={applying}
            onClick={reset}
            className="mr-auto rounded-pill border border-hairline px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-muted transition-colors hover:border-foreground hover:text-foreground disabled:opacity-40"
          >
            {t.activities.admin.crop.reset}
          </button>
          <button
            type="button"
            disabled={applying}
            onClick={onClose}
            className="rounded-pill border border-hairline px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-muted transition-colors hover:text-foreground disabled:opacity-40"
          >
            {t.activities.admin.crop.cancel}
          </button>
          <button
            type="button"
            disabled={applying || !ready}
            onClick={() => void apply()}
            className="rounded-pill border border-volt bg-volt px-5 py-2.5 font-mono text-[10px] uppercase tracking-widest text-ink transition-opacity hover:opacity-80 disabled:cursor-wait disabled:opacity-50"
          >
            {applying
              ? t.activities.admin.crop.applying
              : t.activities.admin.crop.apply}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}

function CropRange({
  label,
  value,
  min,
  max,
  step,
  output,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  output: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="mt-5 block">
      <span className="flex items-center justify-between gap-4 font-mono text-[10px] uppercase tracking-widest text-muted">
        {label}
        <output className="text-foreground">{output}</output>
      </span>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-3 h-1 w-full cursor-pointer accent-volt"
      />
    </label>
  );
}

function normalizeRotation(value: number) {
  if (value > 180) return value - 360;
  if (value < -180) return value + 360;
  return value;
}
