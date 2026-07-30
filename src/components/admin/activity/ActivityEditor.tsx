"use client";

import Image from "next/image";
import { useState, type FormEvent, type RefObject } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { ActivityPost, MediaAsset } from "@/lib/activities";
import { ActivityAdminActions } from "./ActivityAdminActions";
import { ActivityCommentsSection } from "./ActivityCommentsSection";
import { ActivityContentSection } from "./ActivityContentSection";
import { ActivityEditorHeader } from "./ActivityEditorHeader";
import {
  ACTIVITY_CROP_ASPECTS,
  ActivityImageCropper,
} from "./ActivityImageCropper";
import { ActivityMediaSection } from "./ActivityMediaSection";
import { ActivityMetadataSection } from "./ActivityMetadataSection";
import { ActivityPublishingSection } from "./ActivityPublishingSection";
import type {
  AdminFeedback,
  ContentLocale,
  UpdateActivityDraft,
  UpdateLocalizedActivity,
} from "./activity-admin-config";
import type { ActivityMediaQueueStats } from "./useActivityMediaQueue";
import type { ActivityCropResult } from "./activity-image-crop";

type CropTarget =
  | { kind: "cover" }
  | { kind: "image"; index: number }
  | { kind: "poster"; index: number };

const LANDSCAPE_CROP_ASPECTS = [ACTIVITY_CROP_ASPECTS[0]];

export function ActivityEditor({
  editorRef,
  draft,
  selectedSlug,
  contentLocale,
  dirty,
  feedback,
  feedbackText,
  onContentLocaleChange,
  onUpdate,
  onUpdateLocalized,
  onAddMedia,
  mediaQueueStats,
  onRetryMedia,
  onRemoveMedia,
  onUpdateMedia,
  onMoveMedia,
  onReorderMedia,
  onSetPoster,
  onPreview,
  onDelete,
  onSave,
}: {
  editorRef: RefObject<HTMLElement | null>;
  draft: ActivityPost;
  selectedSlug: string | null;
  contentLocale: ContentLocale;
  dirty: boolean;
  feedback: AdminFeedback;
  feedbackText: string;
  onContentLocaleChange: (locale: ContentLocale) => void;
  onUpdate: UpdateActivityDraft;
  onUpdateLocalized: UpdateLocalizedActivity;
  onAddMedia: (files: FileList | null) => void;
  mediaQueueStats: ActivityMediaQueueStats;
  onRetryMedia: (id: string | undefined) => void;
  onRemoveMedia: (index: number) => void;
  onUpdateMedia: (index: number, patch: Partial<MediaAsset>) => void;
  onMoveMedia: (index: number, direction: -1 | 1) => void;
  onReorderMedia: (from: number, to: number) => void;
  onSetPoster: (index: number, file: File | null) => void;
  onPreview: () => void;
  onDelete: () => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const { t, locale } = useLocale();
  const [cropTarget, setCropTarget] = useState<CropTarget | null>(null);
  const targetMedia =
    cropTarget && cropTarget.kind !== "cover"
      ? draft.media[cropTarget.index]
      : null;
  const cropSource =
    cropTarget?.kind === "cover"
      ? draft.cover?.originalSrc ?? draft.cover?.src
      : cropTarget?.kind === "image" && targetMedia?.type === "image"
        ? targetMedia.originalSrc ?? targetMedia.src
        : cropTarget?.kind === "poster" && targetMedia?.type === "video"
          ? targetMedia.posterOriginalSrc ?? targetMedia.poster
          : undefined;
  const existingCrop =
    cropTarget?.kind === "cover"
      ? draft.cover?.crop
      : cropTarget?.kind === "image" && targetMedia?.type === "image"
        ? targetMedia.crop
        : cropTarget?.kind === "poster" && targetMedia?.type === "video"
          ? targetMedia.posterCrop
          : undefined;
  const cropAlt =
    cropTarget?.kind === "cover"
      ? draft.cover?.alt ?? t.activities.admin.coverDraft
      : targetMedia?.alt ?? t.activities.admin.untitledMedia;

  const applyCrop = ({ src, crop }: ActivityCropResult) => {
    if (!cropTarget || !cropSource) return;
    if (cropTarget.kind === "cover" && draft.cover) {
      onUpdate({
        cover: {
          ...draft.cover,
          src,
          originalSrc: cropSource,
          crop,
        },
      });
      return;
    }
    if (cropTarget.kind === "image") {
      onUpdateMedia(cropTarget.index, {
        src,
        originalSrc: cropSource,
        crop,
      });
      return;
    }
    if (cropTarget.kind === "poster") {
      onUpdateMedia(cropTarget.index, {
        poster: src,
        posterOriginalSrc: cropSource,
        posterCrop: crop,
      });
    }
  };

  return (
    <main ref={editorRef} className="py-8 lg:pl-10">
      <form onSubmit={onSave}>
        <ActivityEditorHeader
          creating={!selectedSlug}
          title={draft.title[locale]}
          feedback={feedback}
          feedbackText={feedbackText}
        />
        <div className="grid gap-3 border-b border-hairline py-4 font-mono text-[10px] uppercase tracking-widest text-muted sm:grid-cols-2 lg:grid-cols-4">
          <span>
            {t.activities.admin.status}:{" "}
            <strong className="font-normal text-volt">
              {t.activities.admin.statuses[draft.status]}
            </strong>
          </span>
          <span>
            {t.activities.admin.date}:{" "}
            <strong className="font-normal text-foreground">
              {draft.date}
            </strong>
          </span>
          <span>
            {t.activities.admin.content}:{" "}
            <strong className="font-normal text-foreground">
              {contentLocale.toUpperCase()}
            </strong>
          </span>
          <span>
            {t.activities.admin.pin}:{" "}
            <strong className="font-normal text-foreground">
              {draft.pinned
                ? t.activities.admin.pinnedOn
                : t.activities.admin.pinnedOff}
            </strong>
          </span>
        </div>
        {draft.cover?.src && (
          <section className="grid gap-5 border-b border-hairline py-7 sm:grid-cols-[minmax(220px,0.8fr)_minmax(0,1fr)] sm:items-center">
            <div className="relative aspect-video overflow-hidden rounded-card border border-hairline bg-surface">
              <Image
                src={draft.cover.src}
                alt={draft.cover.alt}
                fill
                unoptimized={draft.cover.src.startsWith("data:")}
                sizes="(max-width: 640px) 100vw, 360px"
                className="object-cover"
              />
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-volt">
                {t.activities.admin.coverReady}
              </p>
              <h3 className="mt-2 text-xl font-semibold uppercase">
                {t.activities.admin.coverDraft}
              </h3>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted">
                {t.activities.admin.coverDraftHint}
              </p>
              <button
                type="button"
                onClick={() => setCropTarget({ kind: "cover" })}
                className="mt-4 rounded-pill border border-hairline px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-muted transition-colors hover:border-volt hover:text-volt"
              >
                {t.activities.admin.crop.cover}
              </button>
            </div>
          </section>
        )}
        <ActivityContentSection
          draft={draft}
          slugLocked={Boolean(selectedSlug)}
          contentLocale={contentLocale}
          onContentLocaleChange={onContentLocaleChange}
          onUpdate={onUpdate}
          onUpdateLocalized={onUpdateLocalized}
        />
        <ActivityMetadataSection draft={draft} onUpdate={onUpdate} />
        <ActivityMediaSection
          media={draft.media}
          queueStats={mediaQueueStats}
          onAdd={onAddMedia}
          onChange={onUpdateMedia}
          onMove={onMoveMedia}
          onReorder={onReorderMedia}
          onPoster={onSetPoster}
          onCropImage={(index) => setCropTarget({ kind: "image", index })}
          onCropPoster={(index) => setCropTarget({ kind: "poster", index })}
          onRetry={onRetryMedia}
          onRemove={onRemoveMedia}
        />
        <ActivityPublishingSection
          status={draft.status}
          pinned={Boolean(draft.pinned)}
          canDelete={Boolean(selectedSlug)}
          activityTitle={draft.title[locale]}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
        <ActivityCommentsSection
          slug={draft.slug}
          seedComments={draft.comments}
        />

        <div className="sticky bottom-0 z-20 flex items-center justify-end gap-3 border-t border-hairline bg-ink/95 py-4 backdrop-blur-sm sm:py-5">
          {dirty && (
            <span className="mr-auto font-mono text-[10px] uppercase tracking-widest text-muted">
              {t.activities.admin.statuses.draft}
            </span>
          )}
          <ActivityAdminActions onPreview={onPreview} savePadding="px-6" />
        </div>
      </form>

      {cropTarget && cropSource && (
        <ActivityImageCropper
          key={`${cropTarget.kind}-${"index" in cropTarget ? cropTarget.index : "cover"}`}
          source={cropSource}
          alt={cropAlt}
          existingCrop={existingCrop}
          aspects={
            cropTarget.kind === "image"
              ? ACTIVITY_CROP_ASPECTS
              : LANDSCAPE_CROP_ASPECTS
          }
          defaultAspect={16 / 9}
          onApply={applyCrop}
          onClose={() => setCropTarget(null)}
        />
      )}
    </main>
  );
}
