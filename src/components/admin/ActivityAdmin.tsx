"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { ActivityEditor } from "./activity/ActivityEditor";
import { ActivityPostList } from "./activity/ActivityPostList";
import { ActivityPostSelector } from "./activity/ActivityPostSelector";
import { ActivityWorkspaceLanding } from "./activity/ActivityWorkspaceLanding";
import type { ActivityPost } from "@/lib/activities";
import { type AdminFeedback } from "./activity/activity-admin-config";
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
  const [mobileListOpen, setMobileListOpen] = useState(false);
  const controller = useActivityAdminController();
  const {
    posts,
    selectedSlug,
    draft,
    editorOpen,
    recoveredDraft,
    contentLocale,
    setContentLocale,
    dirty,
    feedback,
    previewOpen,
    editorRef,
    selectPost,
    createPost,
    createPostWithCover,
    resumeRecoveredDraft,
    closeEditor,
    updateDraft,
    updateLocalized,
    addMedia,
    mediaQueueStats,
    retryMedia,
    removeMedia,
    updateMedia,
    moveMedia,
    reorderMedia,
    setCover,
    setPoster,
    save,
    deleteCurrent,
    openPreview,
    closePreview,
  } = controller;
  const feedbackText = getFeedbackText(feedback, t.activities.admin);

  const handleCreate = () => {
    setMobileListOpen(false);
    void createPost();
  };

  const handleSelect = (post: ActivityPost) => {
    setMobileListOpen(false);
    void selectPost(post);
  };

  const handleCreateCover = (file: File | null) => {
    setMobileListOpen(false);
    void createPostWithCover(file);
  };

  const handleBrowse = () => {
    if (window.matchMedia("(max-width: 767px)").matches) {
      setMobileListOpen(true);
      return;
    }

    const targetId = window.matchMedia("(min-width: 1024px)").matches
      ? "activity-desktop-list"
      : "activity-tablet-selector";
    requestAnimationFrame(() => document.getElementById(targetId)?.focus());
  };

  const handleBackToPosts = async () => {
    if (await closeEditor()) setMobileListOpen(true);
  };

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

      <div className="lg:grid lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="hidden lg:block">
          <ActivityPostList
            posts={posts}
            selectedSlug={selectedSlug}
            onCreate={handleCreate}
            onSelect={handleSelect}
          />
        </div>

        <div className="min-w-0">
          <ActivityPostSelector
            posts={posts}
            selectedSlug={selectedSlug}
            onCreate={handleCreate}
            onSelect={handleSelect}
          />

          <div className={mobileListOpen ? "md:hidden" : "hidden"}>
            <ActivityPostList
              posts={posts}
              selectedSlug={selectedSlug}
              mode="mobile"
              onCreate={handleCreate}
              onSelect={handleSelect}
              onClose={() => setMobileListOpen(false)}
            />
          </div>

          <div className={mobileListOpen ? "hidden md:block" : ""}>
            {editorOpen ? (
              <>
                <button
                  type="button"
                  onClick={() => void handleBackToPosts()}
                  className="mt-7 font-mono text-[10px] uppercase tracking-widest text-muted transition-colors hover:text-volt md:hidden"
                >
                  ← {t.activities.admin.backToPosts}
                </button>
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
                  mediaQueueStats={mediaQueueStats}
                  onRetryMedia={retryMedia}
                  onRemoveMedia={removeMedia}
                  onUpdateMedia={updateMedia}
                  onMoveMedia={moveMedia}
                  onReorderMedia={reorderMedia}
                  onSetCover={(file) => void setCover(file)}
                  onSetPoster={(index, file) => void setPoster(index, file)}
                  onPreview={openPreview}
                  onDelete={deleteCurrent}
                  onSave={save}
                />
              </>
            ) : (
              <ActivityWorkspaceLanding
                postsCount={posts.length}
                recoveredDraft={recoveredDraft}
                feedbackText={feedbackText}
                onCreate={handleCreate}
                onCreateCover={handleCreateCover}
                onBrowse={handleBrowse}
                onRecover={() => {
                  setMobileListOpen(false);
                  resumeRecoveredDraft();
                }}
              />
            )}
          </div>
        </div>
      </div>

      {previewOpen && editorOpen && (
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
    mediaError: string;
    posterError: string;
    validationError: string;
  }
) {
  if (feedback === "saved") return messages.saved;
  if (feedback === "deleted") return messages.deleted;
  if (feedback === "recovered") return messages.draftRecovered;
  if (feedback === "storage") return messages.storageError;
  if (feedback === "slug") return messages.slugTaken;
  if (feedback === "media") return messages.mediaError;
  if (feedback === "poster") return messages.posterError;
  if (feedback === "validation") return messages.validationError;
  return "";
}
