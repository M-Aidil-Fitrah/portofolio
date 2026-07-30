"use client";

import { useMemo, useState, type ReactNode } from "react";
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
import { useLocale } from "@/components/providers/LocaleProvider";
import { usePreview } from "@/components/providers/PreviewProvider";
import type { ActivityAttachment } from "@/lib/activity-schema";
import { AdminField } from "./AdminField";
import { ADMIN_INPUT_CLASS } from "./activity-admin-config";
import {
  ACTIVITY_DOCUMENT_ACCEPT,
  activityDocumentTypeLabel,
  formatActivityDocumentSize,
} from "./activity-documents";

export function ActivityDocumentSection({
  attachments,
  onAdd,
  onChange,
  onMove,
  onReorder,
  onRemove,
}: {
  attachments: ActivityAttachment[];
  onAdd: (files: FileList | null) => void;
  onChange: (index: number, patch: Partial<ActivityAttachment>) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onReorder: (from: number, to: number) => void;
  onRemove: (index: number) => void;
}) {
  const { t, locale } = useLocale();
  const { openPreview } = usePreview();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const ids = useMemo(
    () =>
      attachments.map(
        (attachment, index) =>
          attachment.id ?? `legacy-document-${attachment.filename}-${index}`
      ),
    [attachments]
  );
  const selectedIndex = expandedId ? ids.indexOf(expandedId) : -1;
  const selected =
    selectedIndex >= 0 ? attachments[selectedIndex] : undefined;
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const preview = (attachment: ActivityAttachment) => {
    if (!attachment.previewSrc || attachment.status !== "ready") return;
    openPreview({
      src: attachment.previewSrc,
      type: "pdf",
      alt: attachment.label[locale] || attachment.filename,
      caption: attachment.label[locale] || attachment.filename,
      downloadHref: attachment.downloadSrc,
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
      data-document-count={attachments.length}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="font-mono text-xs uppercase tracking-widest text-muted">
            {t.activities.admin.documents.title}
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            {t.activities.admin.documents.hint}
          </p>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
          {t.activities.admin.documents.count.replace(
            "{count}",
            String(attachments.length)
          )}
        </span>
      </div>

      <p
        id="activity-document-reorder-hint"
        className="mt-4 font-mono text-[10px] uppercase tracking-widest text-muted"
      >
        {t.activities.admin.documents.dragHint}
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={ids} strategy={rectSortingStrategy}>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {attachments.map((attachment, index) => {
              const id = ids[index];
              return (
                <SortableDocumentTile
                  key={id}
                  id={id}
                  attachment={attachment}
                  index={index}
                  expanded={expandedId === id}
                  onPreview={() => preview(attachment)}
                  onEdit={() =>
                    setExpandedId((current) => (current === id ? null : id))
                  }
                  onKeyboardMove={(direction) => onMove(index, direction)}
                  onRemove={() => {
                    if (expandedId === id) setExpandedId(null);
                    onRemove(index);
                  }}
                />
              );
            })}
            <AddDocumentTile onAdd={onAdd} />
          </div>
        </SortableContext>
      </DndContext>

      {selected && (
        <DocumentDetails
          attachment={selected}
          index={selectedIndex}
          total={attachments.length}
          onChange={(patch) => onChange(selectedIndex, patch)}
          onMove={(direction) => onMove(selectedIndex, direction)}
          onPreview={() => preview(selected)}
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

function SortableDocumentTile({
  id,
  attachment,
  index,
  expanded,
  onPreview,
  onEdit,
  onKeyboardMove,
  onRemove,
}: {
  id: string;
  attachment: ActivityAttachment;
  index: number;
  expanded: boolean;
  onPreview: () => void;
  onEdit: () => void;
  onKeyboardMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  const { t, locale } = useLocale();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  const previewReady =
    attachment.status === "ready" && Boolean(attachment.previewSrc);

  return (
    <article
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      data-document-tile
      data-document-status={attachment.status}
      className={`relative flex min-h-52 min-w-0 flex-col border bg-surface/30 p-5 transition-colors ${
        expanded ? "border-volt" : "border-hairline hover:border-muted"
      } ${isDragging ? "z-30 opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center border border-hairline font-mono text-[10px] uppercase tracking-widest text-volt">
          {activityDocumentTypeLabel(attachment.filename)}
        </span>
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`${t.activities.admin.documents.reorder} ${index + 1}`}
          aria-describedby="activity-document-reorder-hint"
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
          className="grid h-9 w-9 touch-none place-items-center rounded-full border border-hairline text-muted transition-colors hover:border-volt hover:text-volt focus:border-volt focus:text-volt focus:outline-none"
        >
          <DragIcon />
        </button>
      </div>

      <div className="mt-5 min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">
          {attachment.label[locale] || attachment.filename}
        </p>
        <p className="mt-1 truncate font-mono text-[9px] uppercase tracking-widest text-muted">
          {attachment.filename}
        </p>
        <p className="mt-2 font-mono text-[9px] uppercase tracking-widest text-muted">
          {formatActivityDocumentSize(attachment.size)} /{" "}
          <span
            className={
              attachment.status === "ready" ? "text-volt" : "text-foreground"
            }
          >
            {t.activities.admin.mediaStatuses[attachment.status]}
          </span>
        </p>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted">
        {attachment.status === "ready"
          ? t.activities.admin.documents.readyHint
          : attachment.status === "failed"
            ? t.activities.admin.documents.failedHint
            : t.activities.admin.documents.waitingTitle}
      </p>

      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-hairline pt-4">
        {previewReady && (
          <button
            type="button"
            onClick={onPreview}
            aria-label={`${t.activities.admin.documents.preview} ${index + 1}`}
            className="font-mono text-[9px] uppercase tracking-widest text-volt"
          >
            {t.activities.admin.preview}
          </button>
        )}
        {attachment.downloadSrc && (
          <a
            href={attachment.downloadSrc}
            download={attachment.filename}
            className="font-mono text-[9px] uppercase tracking-widest text-muted transition-colors hover:text-foreground"
          >
            {t.activities.admin.documents.download}
          </a>
        )}
        <button
          type="button"
          onClick={onEdit}
          aria-expanded={expanded}
          className="font-mono text-[9px] uppercase tracking-widest text-muted transition-colors hover:text-foreground"
        >
          {t.activities.admin.documents.edit}
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`${t.activities.admin.documents.remove} ${index + 1}`}
          className="ml-auto font-mono text-[12px] text-muted transition-colors hover:text-foreground"
        >
          ×
        </button>
      </div>
    </article>
  );
}

function AddDocumentTile({
  onAdd,
}: {
  onAdd: (files: FileList | null) => void;
}) {
  const { t } = useLocale();

  return (
    <label
      data-document-add-tile
      className="group flex min-h-52 cursor-pointer flex-col items-center justify-center border border-dashed border-hairline bg-surface/20 p-5 text-center transition-colors hover:border-volt hover:bg-surface focus-within:border-volt"
    >
      <span className="grid h-12 w-12 place-items-center rounded-full border border-hairline text-2xl font-light text-muted transition-colors group-hover:border-volt group-hover:text-volt">
        +
      </span>
      <span className="mt-4 font-mono text-[10px] uppercase tracking-widest text-foreground">
        {t.activities.admin.documents.add}
      </span>
      <span className="mt-2 max-w-52 text-xs leading-relaxed text-muted">
        {t.activities.admin.documents.addHint}
      </span>
      <input
        type="file"
        accept={ACTIVITY_DOCUMENT_ACCEPT}
        multiple
        aria-label={t.activities.admin.documents.add}
        className="sr-only"
        onChange={(event) => {
          onAdd(event.target.files);
          event.target.value = "";
        }}
      />
    </label>
  );
}

function DocumentDetails({
  attachment,
  index,
  total,
  onChange,
  onMove,
  onPreview,
  onRemove,
  onClose,
}: {
  attachment: ActivityAttachment;
  index: number;
  total: number;
  onChange: (patch: Partial<ActivityAttachment>) => void;
  onMove: (direction: -1 | 1) => void;
  onPreview: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const previewReady =
    attachment.status === "ready" && Boolean(attachment.previewSrc);

  return (
    <div
      role="region"
      aria-label={t.activities.admin.documents.details}
      className="mt-5 border border-hairline bg-surface/35 p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-hairline pb-5">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-volt">
            {t.activities.admin.documents.details} /{" "}
            {String(index + 1).padStart(2, "0")}
          </p>
          <p className="mt-2 break-all text-sm text-muted">
            {attachment.filename} · {formatActivityDocumentSize(attachment.size)}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="font-mono text-[10px] uppercase tracking-widest text-muted transition-colors hover:text-foreground"
        >
          {t.activities.admin.documents.closeDetails}
        </button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <AdminField label={t.activities.admin.documents.labelId}>
          <input
            type="text"
            value={attachment.label.id}
            onChange={(event) =>
              onChange({
                label: { ...attachment.label, id: event.target.value },
              })
            }
            className={`${ADMIN_INPUT_CLASS} rounded-pill`}
          />
        </AdminField>
        <AdminField label={t.activities.admin.documents.labelEn}>
          <input
            type="text"
            value={attachment.label.en}
            onChange={(event) =>
              onChange({
                label: { ...attachment.label, en: event.target.value },
              })
            }
            className={`${ADMIN_INPUT_CLASS} rounded-pill`}
          />
        </AdminField>
      </div>

      {!previewReady && (
        <div className="mt-5 border-l border-volt pl-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-foreground">
            {t.activities.admin.documents.waitingTitle}
          </p>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted">
            {t.activities.admin.documents.waitingHint}
          </p>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-hairline pt-5">
        {previewReady && (
          <PanelButton onClick={onPreview}>
            {t.activities.admin.preview}
          </PanelButton>
        )}
        {attachment.downloadSrc && (
          <a
            href={attachment.downloadSrc}
            download={attachment.filename}
            className="rounded-pill border border-hairline px-3 py-2 font-mono text-[9px] uppercase tracking-widest text-muted transition-colors hover:border-volt hover:text-volt"
          >
            {t.activities.admin.documents.download}
          </a>
        )}
        <PanelButton disabled={index === 0} onClick={() => onMove(-1)}>
          {t.activities.admin.movePrevious}
        </PanelButton>
        <PanelButton disabled={index === total - 1} onClick={() => onMove(1)}>
          {t.activities.admin.moveNext}
        </PanelButton>
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
