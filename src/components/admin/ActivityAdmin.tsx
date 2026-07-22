"use client";

import dynamic from "next/dynamic";
import { useLocale } from "@/components/providers/LocaleProvider";
import { ActivityEditor } from "./activity/ActivityEditor";
import { ActivityPostList } from "./activity/ActivityPostList";
import {
  type AdminFeedback,
} from "./activity/activity-admin-config";
import { useActivityAdminController } from "./activity/useActivityAdminController";

const ActivityAdminPreview = dynamic(
  () =>
    import("./activity/ActivityAdminPreview").then(
      (module) => module.ActivityAdminPreview
    ),
  { ssr: false }
);

export function ActivityAdmin() {
  const { t } = useLocale();
  const controller = useActivityAdminController();
  const {
    posts,
    selectedSlug,
    draft,
    contentLocale,
    setContentLocale,
    dirty,
    feedback,
    previewOpen,
    editorRef,
    selectPost,
    createPost,
    updateDraft,
    updateLocalized,
    addMedia,
    updateMedia,
    moveMedia,
    setPoster,
    save,
    deleteCurrent,
    openPreview,
    closePreview,
  } = controller;
  const feedbackText = getFeedbackText(feedback, t.activities.admin);

  return (
    <div className="mx-auto max-w-[1500px] px-6 pb-24 pt-8 sm:px-10 sm:pt-12">
      <header className="border-b border-hairline pb-7 sm:pb-10">
        <p className="font-mono text-xs uppercase tracking-widest text-volt">
          {t.activities.admin.eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-semibold uppercase leading-none sm:text-5xl lg:text-6xl">
          {t.activities.admin.heading}
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
          {t.activities.admin.intro}
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
        <ActivityPostList
          posts={posts}
          selectedSlug={selectedSlug}
          onCreate={createPost}
          onSelect={selectPost}
        />
        <ActivityEditor
          editorRef={editorRef}
          draft={draft}
          selectedSlug={selectedSlug}
          contentLocale={contentLocale}
          dirty={dirty}
          feedback={feedback}
          feedbackText={feedbackText}
          onContentLocaleChange={setContentLocale}
          onUpdate={updateDraft}
          onUpdateLocalized={updateLocalized}
          onAddMedia={(files) => void addMedia(files)}
          onUpdateMedia={updateMedia}
          onMoveMedia={moveMedia}
          onSetPoster={(index, file) => void setPoster(index, file)}
          onPreview={openPreview}
          onDelete={deleteCurrent}
          onSave={save}
        />
      </div>

      {previewOpen && (
        <ActivityAdminPreview post={draft} onClose={closePreview} />
      )}
    </div>
  );
}

function getFeedbackText(
  feedback: AdminFeedback,
  messages: {
    saved: string;
    deleted: string;
    draftRecovered: string;
    storageError: string;
    slugTaken: string;
    mediaHint: string;
    posterError: string;
    validationError: string;
  }
) {
  if (feedback === "saved") return messages.saved;
  if (feedback === "deleted") return messages.deleted;
  if (feedback === "recovered") return messages.draftRecovered;
  if (feedback === "storage") return messages.storageError;
  if (feedback === "slug") return messages.slugTaken;
  if (feedback === "media") return messages.mediaHint;
  if (feedback === "poster") return messages.posterError;
  if (feedback === "validation") return messages.validationError;
  return "";
}
