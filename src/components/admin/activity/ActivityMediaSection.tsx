"use client";

import { useLocale } from "@/components/providers/LocaleProvider";
import { ActivityMedia } from "@/components/activities/ActivityMedia";
import type { MediaAsset } from "@/lib/activities";

export function ActivityMediaSection({
  media,
  onAdd,
  onRemove,
}: {
  media: MediaAsset[];
  onAdd: (files: FileList | null) => void;
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
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {media.map((item, index) => (
            <div key={`${item.alt}-${index}`}>
              <ActivityMedia
                media={item}
                index={index + 1}
                className="aspect-video"
              />
              <div className="mt-3 flex items-center justify-between gap-4">
                <p className="truncate font-mono text-[10px] uppercase tracking-widest text-muted">
                  {item.type} / {item.alt}
                </p>
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="font-mono text-[10px] uppercase tracking-widest text-muted transition-colors hover:text-volt"
                >
                  {t.activities.admin.remove}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
