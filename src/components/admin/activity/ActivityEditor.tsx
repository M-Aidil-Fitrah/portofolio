"use client";

import type { FormEvent, RefObject } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { ActivityPost, MediaAsset } from "@/lib/activities";
import { ActivityAdminActions } from "./ActivityAdminActions";
import { ActivityCommentsSection } from "./ActivityCommentsSection";
import { ActivityContentSection } from "./ActivityContentSection";
import { ActivityEditorHeader } from "./ActivityEditorHeader";
import { ActivityMediaSection } from "./ActivityMediaSection";
import { ActivityMetadataSection } from "./ActivityMetadataSection";
import { ActivityPublishingSection } from "./ActivityPublishingSection";
import type {
  AdminFeedback,
  ContentLocale,
  UpdateActivityDraft,
  UpdateLocalizedActivity,
} from "./activity-admin-config";

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
  onUpdateMedia,
  onMoveMedia,
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
  onUpdateMedia: (index: number, patch: Partial<MediaAsset>) => void;
  onMoveMedia: (index: number, direction: -1 | 1) => void;
  onSetPoster: (index: number, file: File | null) => void;
  onPreview: () => void;
  onDelete: () => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const { t, locale } = useLocale();

  return (
    <main ref={editorRef} className="py-8 lg:pl-10">
      <form onSubmit={onSave}>
        <ActivityEditorHeader
          creating={!selectedSlug}
          title={draft.title[locale]}
          feedback={feedback}
          feedbackText={feedbackText}
          onPreview={onPreview}
        />
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
          onAdd={onAddMedia}
          onChange={onUpdateMedia}
          onMove={onMoveMedia}
          onPoster={onSetPoster}
          onRemove={(index) =>
            onUpdate({
              media: draft.media.filter(
                (_, mediaIndex) => mediaIndex !== index
              ),
            })
          }
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

        <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-hairline bg-ink/95 py-5 backdrop-blur-sm">
          {dirty && (
            <span className="mr-auto hidden font-mono text-[10px] uppercase tracking-widest text-muted sm:inline">
              {t.activities.admin.statuses.draft}
            </span>
          )}
          <ActivityAdminActions onPreview={onPreview} savePadding="px-6" />
        </div>
      </form>
    </main>
  );
}
