"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ActivityMedia } from "@/components/activities/ActivityMedia";
import { useLocale } from "@/components/providers/LocaleProvider";
import { usePreview } from "@/components/providers/PreviewProvider";
import type { MediaAsset } from "@/lib/activities";
import { AdminField } from "./AdminField";
import { ADMIN_INPUT_CLASS } from "./activity-admin-config";
import { UploadProgressBar } from "./UploadProgressBar";
import type {
  ActivityMediaQueueProgress,
  ActivityMediaQueueStats,
} from "./useActivityMediaQueue";

const VIRTUALIZE_AFTER = 24;

export function ActivityMediaSection({
  media,
  queueStats,
  uploadProgress,
  onAdd,
  onChange,
  onMove,
  onReorder,
  onPoster,
  onCropImage,
  onCropPoster,
  onRetry,
  onRemove,
}: {
  media: MediaAsset[];
  queueStats: ActivityMediaQueueStats;
  uploadProgress: ActivityMediaQueueProgress;
  onAdd: (files: FileList | null) => void;
  onChange: (index: number, patch: Partial<MediaAsset>) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onReorder: (from: number, to: number) => void;
  onPoster: (index: number, file: File | null) => void;
  onCropImage: (index: number) => void;
  onCropPoster: (index: number) => void;
  onRetry: (id: string | undefined) => void;
  onRemove: (index: number) => void;
}) {
  const { t, locale } = useLocale();
  const { openPreview } = usePreview();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const ids = useMemo(
    () => media.map((item, index) => mediaSortableId(item, index)),
    [media]
  );
  const selectedIndex = expandedId ? ids.indexOf(expandedId) : -1;
  const selected = selectedIndex >= 0 ? media[selectedIndex] : null;
  const virtualized = media.length > VIRTUALIZE_AFTER;
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const preview = (item: MediaAsset, index: number) => {
    openPreview({
      src: item.src,
      type: item.type,
      poster: item.type === "video" ? item.poster : undefined,
      alt: item.alt || t.activities.admin.untitledMedia,
      caption:
        item.caption?.[locale] ||
        `${t.activities.admin.media} ${String(index + 1).padStart(2, "0")}`,
      index: String(index + 1).padStart(2, "0"),
    });
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from >= 0 && to >= 0) onReorder(from, to);
  };

  return (
    <section
      className="border-t border-hairline py-8"
      data-upload-active={queueStats.active}
      data-upload-queued={queueStats.queued}
      data-media-count={media.length}
      data-virtualized={virtualized ? "true" : "false"}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="font-mono text-xs uppercase tracking-widest text-muted">
            {t.activities.admin.media}
          </h3>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            {t.activities.admin.mediaHint}
          </p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-widest text-muted">
          <span>
            {t.activities.admin.mediaCount.replace(
              "{count}",
              String(media.length)
            )}
          </span>
          {(queueStats.active > 0 || queueStats.queued > 0) && (
            <span className="text-volt">
              {t.activities.admin.queueSummary
                .replace("{active}", String(queueStats.active))
                .replace("{queued}", String(queueStats.queued))}
            </span>
          )}
        </div>
      </div>

      <p
        id="activity-media-reorder-hint"
        className="mt-4 font-mono text-[10px] uppercase tracking-widest text-muted"
      >
        {t.activities.admin.dragHint}
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={ids} strategy={rectSortingStrategy}>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {media.map((item, index) => {
              const id = ids[index];
              return (
                <SortableMediaTile
                  key={id}
                  id={id}
                  item={item}
                  index={index}
                  percent={item.id ? uploadProgress[item.id] : undefined}
                  virtualized={virtualized}
                  expanded={expandedId === id}
                  onEdit={() =>
                    setExpandedId((current) => (current === id ? null : id))
                  }
                  onPreview={() => preview(item, index)}
                  onRetry={() => onRetry(item.id)}
                  onKeyboardMove={(direction) => onMove(index, direction)}
                  onRemove={() => {
                    if (expandedId === id) setExpandedId(null);
                    onRemove(index);
                  }}
                />
              );
            })}
            <AddMediaTile onAdd={onAdd} />
          </div>
        </SortableContext>
      </DndContext>

      {selected && (
        <MediaMetadataPanel
          item={selected}
          index={selectedIndex}
          total={media.length}
          onChange={(patch) => onChange(selectedIndex, patch)}
          onMove={(direction) => onMove(selectedIndex, direction)}
          onPoster={(file) => onPoster(selectedIndex, file)}
          onCropImage={() => onCropImage(selectedIndex)}
          onCropPoster={() => onCropPoster(selectedIndex)}
          onPreview={() => preview(selected, selectedIndex)}
          onRetry={() => onRetry(selected.id)}
          onRemove={() => {
            onRemove(selectedIndex);
            setExpandedId(null);
          }}
          onClose={() => setExpandedId(null)}
        />
      )}
    </section>
  );
}

function SortableMediaTile({
  id,
  item,
  index,
  percent,
  virtualized,
  expanded,
  onEdit,
  onPreview,
  onRetry,
  onKeyboardMove,
  onRemove,
}: {
  id: string;
  item: MediaAsset;
  index: number;
  percent: number | undefined;
  virtualized: boolean;
  expanded: boolean;
  onEdit: () => void;
  onPreview: () => void;
  onRetry: () => void;
  onKeyboardMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  const { t } = useLocale();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  const status = item.status ?? "ready";
  const busy =
    status === "queued" || status === "uploading" || status === "processing";
  const transferring = status === "uploading" && percent !== undefined;

  return (
    <article
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        contentVisibility: virtualized ? "auto" : "visible",
        containIntrinsicSize: virtualized ? "280px" : undefined,
      }}
      data-media-tile
      data-media-status={status}
      data-media-index={index}
      data-upload-percent={transferring ? percent : undefined}
      className={`group relative min-w-0 border bg-ink transition-colors ${
        expanded ? "border-volt" : "border-hairline hover:border-muted"
      } ${isDragging ? "z-30 opacity-60" : ""}`}
    >
      <DeferredMedia enabled={virtualized}>
        <button
          type="button"
          onClick={onPreview}
          aria-label={`${t.activities.admin.previewMedia} ${index + 1}`}
          className="relative block aspect-[4/3] w-full overflow-hidden text-left"
        >
          <ActivityMedia
            media={item}
            index={index + 1}
            videoControls={false}
            sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw"
            className="h-full rounded-none border-0"
          />
          {busy && (
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-ink/65 px-5 backdrop-blur-[2px]">
              {status === "uploading" && percent !== undefined ? (
                <UploadProgressBar percent={percent} className="w-full" />
              ) : (
                <span className="h-7 w-7 animate-spin rounded-full border border-muted border-t-volt" />
              )}
            </span>
          )}
          {status === "failed" && (
            <span className="absolute inset-0 flex items-center justify-center bg-ink/75 px-4 text-center font-mono text-[10px] uppercase tracking-widest text-foreground">
              {t.activities.admin.uploadItemFailed}
            </span>
          )}
        </button>
      </DeferredMedia>

      <span
        className={`absolute left-2 top-2 border bg-ink/85 px-2 py-1 font-mono text-[9px] uppercase tracking-widest backdrop-blur-sm ${
          status === "ready"
            ? "border-hairline text-muted"
            : status === "failed"
              ? "border-foreground text-foreground"
              : "border-volt/60 text-volt"
        }`}
      >
        {t.activities.admin.mediaStatuses[status]}
      </span>

      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`${t.activities.admin.reorderMedia} ${index + 1}`}
        aria-describedby="activity-media-reorder-hint"
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
            event.preventDefault();
            onKeyboardMove(-1);
          } else if (
            event.key === "ArrowRight" ||
            event.key === "ArrowDown"
          ) {
            event.preventDefault();
            onKeyboardMove(1);
          }
        }}
        className="absolute right-2 top-2 grid h-8 w-8 touch-none place-items-center rounded-full border border-hairline bg-ink/85 text-muted backdrop-blur-sm transition-colors hover:border-volt hover:text-volt focus:border-volt focus:text-volt focus:outline-none"
      >
        <DragIcon />
      </button>

      <div className="flex items-center justify-between gap-2 border-t border-hairline px-3 py-2.5">
        <span className="min-w-0 truncate font-mono text-[9px] uppercase tracking-widest text-muted">
          {String(index + 1).padStart(2, "0")} / {item.type}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {status === "failed" && (
            <button
              type="button"
              onClick={onRetry}
              className="font-mono text-[9px] uppercase tracking-widest text-volt"
            >
              {t.activities.admin.retry}
            </button>
          )}
          <button
            type="button"
            onClick={onEdit}
            aria-expanded={expanded}
            className="font-mono text-[9px] uppercase tracking-widest text-muted transition-colors hover:text-foreground"
          >
            {t.activities.admin.editMedia}
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`${t.activities.admin.removeMedia} ${index + 1}`}
            className="font-mono text-[9px] uppercase tracking-widest text-muted transition-colors hover:text-foreground"
          >
            ×
          </button>
        </span>
      </div>
    </article>
  );
}

function AddMediaTile({
  onAdd,
}: {
  onAdd: (files: FileList | null) => void;
}) {
  const { t } = useLocale();

  return (
    <label
      data-media-add-tile
      className="group flex min-h-44 cursor-pointer flex-col items-center justify-center border border-dashed border-hairline bg-surface/30 p-5 text-center transition-colors hover:border-volt hover:bg-surface focus-within:border-volt sm:min-h-52"
    >
      <span className="grid h-12 w-12 place-items-center rounded-full border border-hairline text-2xl font-light text-muted transition-colors group-hover:border-volt group-hover:text-volt">
        +
      </span>
      <span className="mt-4 font-mono text-[10px] uppercase tracking-widest text-foreground">
        {t.activities.admin.addNextMedia}
      </span>
      <span className="mt-2 max-w-40 text-xs leading-relaxed text-muted">
        {t.activities.admin.addNextMediaHint}
      </span>
      <input
        type="file"
        accept="image/*,video/*"
        multiple
        aria-label={t.activities.admin.addNextMedia}
        className="sr-only"
        onChange={(event) => {
          onAdd(event.target.files);
          event.target.value = "";
        }}
      />
    </label>
  );
}

function MediaMetadataPanel({
  item,
  index,
  total,
  onChange,
  onMove,
  onPoster,
  onCropImage,
  onCropPoster,
  onPreview,
  onRetry,
  onRemove,
  onClose,
}: {
  item: MediaAsset;
  index: number;
  total: number;
  onChange: (patch: Partial<MediaAsset>) => void;
  onMove: (direction: -1 | 1) => void;
  onPoster: (file: File | null) => void;
  onCropImage: () => void;
  onCropPoster: () => void;
  onPreview: () => void;
  onRetry: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const status = item.status ?? "ready";

  return (
    <div
      role="region"
      aria-label={t.activities.admin.mediaMetadata}
      className="mt-5 border border-hairline bg-surface/35 p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-hairline pb-5">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-volt">
            {t.activities.admin.mediaMetadata} /{" "}
            {String(index + 1).padStart(2, "0")}
          </p>
          <p className="mt-2 text-sm text-muted">
            {item.alt || t.activities.admin.untitledMedia}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="font-mono text-[10px] uppercase tracking-widest text-muted transition-colors hover:text-foreground"
        >
          {t.activities.admin.closeMetadata}
        </button>
      </div>

      <div className="mt-5 grid gap-5">
        <AdminField label={t.activities.admin.altText}>
          <input
            type="text"
            required
            value={item.alt}
            onChange={(event) => onChange({ alt: event.target.value })}
            className={`${ADMIN_INPUT_CLASS} rounded-pill`}
          />
        </AdminField>
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminField label={t.activities.admin.captionId}>
            <input
              type="text"
              value={item.caption?.id ?? ""}
              onChange={(event) =>
                onChange({
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
                onChange({
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
          <label className="w-fit cursor-pointer font-mono text-[10px] uppercase tracking-widest text-muted transition-colors hover:text-volt">
            {item.poster
              ? t.activities.admin.replacePoster
              : t.activities.admin.addPoster}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                onPoster(event.target.files?.[0] ?? null);
                event.target.value = "";
              }}
            />
          </label>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-hairline pt-5">
        <PanelButton onClick={onPreview}>
          {t.activities.admin.preview}
        </PanelButton>
        {item.type === "image" && item.src && (
          <PanelButton onClick={onCropImage}>
            {t.activities.admin.crop.image}
          </PanelButton>
        )}
        {item.type === "video" && item.poster && (
          <PanelButton onClick={onCropPoster}>
            {t.activities.admin.crop.poster}
          </PanelButton>
        )}
        <PanelButton disabled={index === 0} onClick={() => onMove(-1)}>
          {t.activities.admin.movePrevious}
        </PanelButton>
        <PanelButton disabled={index === total - 1} onClick={() => onMove(1)}>
          {t.activities.admin.moveNext}
        </PanelButton>
        {status === "failed" && (
          <PanelButton onClick={onRetry}>{t.activities.admin.retry}</PanelButton>
        )}
        <button
          type="button"
          onClick={onRemove}
          className="ml-auto font-mono text-[10px] uppercase tracking-widest text-muted transition-colors hover:text-foreground"
        >
          {t.activities.admin.remove}
        </button>
      </div>
    </div>
  );
}

function PanelButton({
  children,
  disabled,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-pill border border-hairline px-3 py-2 font-mono text-[9px] uppercase tracking-widest text-muted transition-colors hover:border-volt hover:text-volt disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function DeferredMedia({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(!enabled);

  useEffect(() => {
    if (!enabled || visible) return;
    const node = ref.current;
    if (!node || !("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { rootMargin: "600px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, visible]);

  return (
    <div ref={ref} className="aspect-[4/3]">
      {visible ? (
        children
      ) : (
        <div
          className="h-full w-full animate-pulse bg-surface"
          aria-hidden="true"
        />
      )}
    </div>
  );
}

function DragIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <circle cx="7" cy="6" r="1" />
      <circle cx="13" cy="6" r="1" />
      <circle cx="7" cy="10" r="1" />
      <circle cx="13" cy="10" r="1" />
      <circle cx="7" cy="14" r="1" />
      <circle cx="13" cy="14" r="1" />
    </svg>
  );
}

function mediaSortableId(item: MediaAsset, index: number) {
  if (item.id) return item.id;
  const source = `${item.type}-${item.src ?? ""}-${item.alt}`;
  let hash = 0;
  for (let character = 0; character < source.length; character += 1) {
    hash = (hash * 31 + source.charCodeAt(character)) | 0;
  }
  return `legacy-media-${Math.abs(hash)}-${index}`;
}
