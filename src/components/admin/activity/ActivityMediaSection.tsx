"use client";

import { useLocale } from "@/components/providers/LocaleProvider";
import { ActivityMedia } from "@/components/activities/ActivityMedia";
import type { MediaAsset } from "@/lib/activities";
import { AdminField } from "./AdminField";
import { ADMIN_INPUT_CLASS } from "./activity-admin-config";

export function ActivityMediaSection({
  media,
  onAdd,
  onChange,
  onMove,
  onPoster,
  onRemove,
}: {
  media: MediaAsset[];
  onAdd: (files: FileList | null) => void;
  onChange: (index: number, patch: Partial<MediaAsset>) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onPoster: (index: number, file: File | null) => void;
  onRemove: (index: number) => void;
}) {
  const { t } = useLocale();

  return (
    <section className="border-t border-hairline py-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-mono text-xs uppercase tracking-widest text-muted">
            {t.activities.admin.media}
          </h3>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            {t.activities.admin.mediaHint}
          </p>
        </div>
        <label className="btn-fill inline-flex h-11 w-fit cursor-pointer items-center rounded-pill border border-hairline px-5 font-mono text-xs uppercase tracking-widest text-foreground">
          + {t.activities.admin.upload}
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            className="sr-only"
            onChange={(event) => {
              onAdd(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
      </div>

      {media.length > 0 && (
        <div className="mt-7 space-y-6">
          {media.map((item, index) => (
            <article
              key={item.id ?? `${item.src ?? item.type}-${index}`}
              className="grid gap-5 border-t border-hairline pt-6 md:grid-cols-[minmax(180px,0.8fr)_minmax(0,1.2fr)]"
            >
              <div>
                <ActivityMedia
                  media={item}
                  index={index + 1}
                  className="aspect-video"
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                    {String(index + 1).padStart(2, "0")} / {item.type}
                  </span>
                  <div className="flex items-center gap-2">
                    <IconButton
                      label={t.activities.admin.movePrevious}
                      disabled={index === 0}
                      onClick={() => onMove(index, -1)}
                      direction="up"
                    />
                    <IconButton
                      label={t.activities.admin.moveNext}
                      disabled={index === media.length - 1}
                      onClick={() => onMove(index, 1)}
                      direction="down"
                    />
                    <button
                      type="button"
                      onClick={() => onRemove(index)}
                      className="ml-1 font-mono text-[10px] uppercase tracking-widest text-muted transition-colors hover:text-foreground"
                    >
                      {t.activities.admin.remove}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid content-start gap-4">
                <AdminField label={t.activities.admin.altText}>
                  <input
                    type="text"
                    required
                    value={item.alt}
                    onChange={(event) =>
                      onChange(index, { alt: event.target.value })
                    }
                    className={`${ADMIN_INPUT_CLASS} rounded-pill`}
                  />
                </AdminField>
                <div className="grid gap-4 sm:grid-cols-2">
                  <AdminField label={t.activities.admin.captionId}>
                    <input
                      type="text"
                      value={item.caption?.id ?? ""}
                      onChange={(event) =>
                        onChange(index, {
                          caption: {
                            en: item.caption?.en ?? "",
                            id: event.target.value,
                          },
                        })
                      }
                      className={`${ADMIN_INPUT_CLASS} rounded-pill`}
                    />
                  </AdminField>
                  <AdminField label={t.activities.admin.captionEn}>
                    <input
                      type="text"
                      value={item.caption?.en ?? ""}
                      onChange={(event) =>
                        onChange(index, {
                          caption: {
                            en: event.target.value,
                            id: item.caption?.id ?? "",
                          },
                        })
                      }
                      className={`${ADMIN_INPUT_CLASS} rounded-pill`}
                    />
                  </AdminField>
                </div>
                {item.type === "video" && (
                  <label className="w-fit cursor-pointer font-mono text-[10px] uppercase tracking-widest text-muted transition-colors hover:text-foreground">
                    {item.poster
                      ? t.activities.admin.replacePoster
                      : t.activities.admin.addPoster}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(event) => {
                        onPoster(index, event.target.files?.[0] ?? null);
                        event.target.value = "";
                      }}
                    />
                  </label>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  direction,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  direction: "up" | "down";
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-hairline text-muted transition-colors hover:border-volt hover:text-volt disabled:cursor-not-allowed disabled:opacity-30"
    >
      <svg
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className={`h-4 w-4 ${direction === "down" ? "rotate-180" : ""}`}
        aria-hidden="true"
      >
        <path d="m5.5 11.5 4.5-4 4.5 4" />
      </svg>
    </button>
  );
}
