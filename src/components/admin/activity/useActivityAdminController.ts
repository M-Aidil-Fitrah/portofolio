"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { toast } from "sonner";
import { useAdminWorkspace } from "@/components/admin/AdminWorkspaceProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useSmoothScroll } from "@/components/providers/SmoothScrollProvider";
import type { ActivityPost, MediaAsset } from "@/lib/activities";
import type {
  ActivityAttachment,
  ActivityDraftRecovery,
} from "@/lib/activity-schema";
import { ADMIN_SESSION_EXPIRED_EVENT } from "@/lib/admin-session-client";
import { uploadActivityAsset } from "@/lib/api/asset-upload";
import {
  deleteActivity,
  isActivitySlugAvailable,
  saveActivity,
  useActivities,
} from "@/lib/activity-store";
import {
  clearActivityDraftRecovery,
  readActivityDraftRecovery,
  writeActivityDraftRecovery,
} from "./activity-draft-recovery";
import {
  activityPosterFileIsValid,
  activityPosterFromFile,
  createBlankActivity,
  slugifyActivity,
  type AdminFeedback,
  type ContentLocale,
} from "./activity-admin-config";
import {
  activityDocumentFileIsValid,
  activityDocumentFromFile,
  releaseActivityDocument,
} from "./activity-documents";
import { useActivityMediaQueue } from "./useActivityMediaQueue";

export function useActivityAdminController() {
  const { t } = useLocale();
  const { lenis } = useSmoothScroll();
  const { dirty, setDirty, confirmDiscard } = useAdminWorkspace();
  const posts = useActivities();
  const blankDraft = useMemo(() => createBlankActivity(), []);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [draftOverride, setDraftOverride] = useState<ActivityPost | null>(null);
  const [recoveredDraft, setRecoveredDraft] =
    useState<ActivityDraftRecovery | null>(null);
  const [contentLocale, setContentLocale] = useState<ContentLocale>("id");
  const [feedback, setFeedback] = useState<AdminFeedback>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recoveryInitialized = useRef(false);
  const editorRef = useRef<HTMLElement>(null);
  const selectedPost = selectedSlug
    ? posts.find((post) => post.slug === selectedSlug)
    : undefined;
  const draft = draftOverride ?? selectedPost ?? blankDraft;
  const editorOpen = Boolean(draftOverride || selectedPost);
  const draftRef = useRef(draft);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const notify = useCallback(
    (next: AdminFeedback) => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);

      if (next === "saved") {
        setFeedback(null);
        toast.success(t.activities.admin.saved);
        return;
      }
      if (next === "deleted") {
        setFeedback(null);
        toast.success(t.activities.admin.deleted);
        return;
      }
      if (next === "recovered") {
        setFeedback(null);
        toast.info(t.activities.admin.draftRecovered);
        return;
      }

      setFeedback(next);
      if (next === "storage") {
        toast.error(t.activities.admin.storageError);
      } else if (next === "media") {
        toast.error(t.activities.admin.mediaError);
      } else if (next === "poster") {
        toast.error(t.activities.admin.posterError);
      }
      feedbackTimer.current = setTimeout(() => setFeedback(null), 4000);
    },
    [t]
  );

  useEffect(
    () => () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    },
    []
  );

  useEffect(() => {
    const recovery = readActivityDraftRecovery();
    recoveryInitialized.current = true;
    if (!recovery) return;

    const timer = window.setTimeout(() => {
      setRecoveredDraft(recovery);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!recoveryInitialized.current || !dirty || !draftOverride) return;
    const timer = window.setTimeout(() => {
      writeActivityDraftRecovery({
        selectedSlug,
        draft: draftOverride,
        contentLocale,
      });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [contentLocale, dirty, draftOverride, selectedSlug]);

  useEffect(() => {
    const persistBeforeSessionExit = () => {
      if (!dirty || !draftOverride) return;
      writeActivityDraftRecovery({
        selectedSlug,
        draft: draftOverride,
        contentLocale,
      });
    };

    window.addEventListener(
      ADMIN_SESSION_EXPIRED_EVENT,
      persistBeforeSessionExit
    );
    return () =>
      window.removeEventListener(
        ADMIN_SESSION_EXPIRED_EVENT,
        persistBeforeSessionExit
      );
  }, [contentLocale, dirty, draftOverride, selectedSlug]);

  const scrollToEditor = useCallback(() => {
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    requestAnimationFrame(() => {
      if (!editorRef.current) return;
      if (lenis) lenis.scrollTo(editorRef.current, { offset: -80 });
      else editorRef.current.scrollIntoView({ behavior: "smooth" });
    });
  }, [lenis]);

  const selectPost = useCallback(
    async (post: ActivityPost) => {
      if (!(await confirmDiscard())) return;
      clearActivityDraftRecovery();
      setRecoveredDraft(null);
      setSelectedSlug(post.slug);
      setDraftOverride(null);
      setDirty(false);
      setFeedback(null);
      scrollToEditor();
    },
    [confirmDiscard, scrollToEditor, setDirty]
  );

  const createPost = useCallback(async () => {
    if (!(await confirmDiscard())) return;
    clearActivityDraftRecovery();
    setRecoveredDraft(null);
    setSelectedSlug(null);
    setDraftOverride(createBlankActivity());
    setContentLocale("id");
    setDirty(true);
    setFeedback(null);
    scrollToEditor();
  }, [confirmDiscard, scrollToEditor, setDirty]);

  const createPostWithCover = useCallback(
    async (file: File | null) => {
      if (!file) return;
      if (!activityPosterFileIsValid(file)) {
        notify("poster");
        return;
      }
      if (!(await confirmDiscard())) return;

      const toastId = toast.loading(t.activities.admin.coverUploading);
      try {
        const uploaded = await uploadActivityAsset(file, "image", (status) => {
          if (status === "processing") {
            toast.loading(t.activities.admin.coverProcessing, { id: toastId });
          }
        });
        const next = createBlankActivity();
        next.cover = {
          id: uploaded.asset.id,
          src: uploaded.src,
          originalSrc: uploaded.src,
          alt: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "),
          template: "none",
          status: "ready",
        };
        clearActivityDraftRecovery();
        setRecoveredDraft(null);
        setSelectedSlug(null);
        setDraftOverride(next);
        setContentLocale("id");
        setDirty(true);
        setFeedback(null);
        toast.success(t.activities.admin.coverUploadComplete, { id: toastId });
        scrollToEditor();
      } catch {
        toast.dismiss(toastId);
        notify("poster");
      }
    },
    [confirmDiscard, notify, scrollToEditor, setDirty, t]
  );

  const resumeRecoveredDraft = useCallback(() => {
    if (!recoveredDraft) return;
    setSelectedSlug(recoveredDraft.selectedSlug);
    setDraftOverride(recoveredDraft.draft);
    setContentLocale(recoveredDraft.contentLocale);
    setRecoveredDraft(null);
    setDirty(true);
    notify("recovered");
    scrollToEditor();
  }, [notify, recoveredDraft, scrollToEditor, setDirty]);

  const closeEditor = useCallback(async () => {
    if (!(await confirmDiscard())) return false;
    clearActivityDraftRecovery();
    setRecoveredDraft(null);
    setSelectedSlug(null);
    setDraftOverride(null);
    setDirty(false);
    setFeedback(null);
    return true;
  }, [confirmDiscard, setDirty]);

  const updateDraft = useCallback(
    (patch: Partial<ActivityPost>) => {
      setDraftOverride((current) => {
        const next = { ...(current ?? draftRef.current), ...patch };
        draftRef.current = next;
        return next;
      });
      setDirty(true);
      setFeedback(null);
    },
    [setDirty]
  );

  const updateLocalized = useCallback(
    (
      field: "title" | "caption" | "body",
      language: ContentLocale,
      value: string
    ) => {
      setDraftOverride((current) => {
        const source = current ?? draft;
        const next = {
          ...source,
          [field]: { ...source[field], [language]: value },
        };
        if (!selectedSlug && field === "title" && language === "id") {
          next.slug = slugifyActivity(value);
        }
        draftRef.current = next;
        return next;
      });
      setDirty(true);
      setFeedback(null);
    },
    [draft, selectedSlug, setDirty]
  );

  const mutateMedia = useCallback(
    (mutate: (media: MediaAsset[]) => MediaAsset[]) => {
      setDraftOverride((current) => {
        const source = current ?? draftRef.current;
        const next = { ...source, media: mutate(source.media) };
        draftRef.current = next;
        return next;
      });
      setDirty(true);
      setFeedback(null);
    },
    [setDirty]
  );

  const appendMedia = useCallback(
    (media: MediaAsset[]) => {
      mutateMedia((current) => [...current, ...media]);
    },
    [mutateMedia]
  );

  const patchMediaById = useCallback(
    (id: string, patch: Partial<MediaAsset>) => {
      mutateMedia((current) =>
        current.map((item) =>
          item.id === id ? { ...item, ...patch } : item
        )
      );
    },
    [mutateMedia]
  );

  const removeMediaById = useCallback(
    (id: string) => {
      mutateMedia((current) => current.filter((item) => item.id !== id));
    },
    [mutateMedia]
  );

  const {
    enqueue: addMedia,
    retry: retryMedia,
    remove: removeQueuedMedia,
    stats: mediaQueueStats,
  } = useActivityMediaQueue({
    onAppend: appendMedia,
    onPatch: patchMediaById,
    onRemove: removeMediaById,
  });

  const removeMedia = useCallback(
    (index: number) => {
      const item = draftRef.current.media[index];
      if (!item) return;
      if (item.id) {
        removeQueuedMedia(item.id);
        return;
      }
      mutateMedia((current) =>
        current.filter((_, itemIndex) => itemIndex !== index)
      );
    },
    [mutateMedia, removeQueuedMedia]
  );

  const updateMedia = useCallback(
    (index: number, patch: Partial<MediaAsset>) => {
      mutateMedia((current) =>
        current.map((item, itemIndex) =>
          itemIndex === index ? { ...item, ...patch } : item
        )
      );
    },
    [mutateMedia]
  );

  const moveMedia = useCallback(
    (index: number, direction: -1 | 1) => {
      mutateMedia((current) => {
        const target = index + direction;
        if (target < 0 || target >= current.length) return current;
        const media = [...current];
        [media[index], media[target]] = [media[target], media[index]];
        return media;
      });
    },
    [mutateMedia]
  );

  const reorderMedia = useCallback(
    (from: number, to: number) => {
      if (from === to) return;
      mutateMedia((current) => {
        if (
          from < 0 ||
          to < 0 ||
          from >= current.length ||
          to >= current.length
        ) {
          return current;
        }
        const media = [...current];
        const [moved] = media.splice(from, 1);
        media.splice(to, 0, moved);
        return media;
      });
    },
    [mutateMedia]
  );

  const mutateAttachments = useCallback(
    (
      mutate: (attachments: ActivityAttachment[]) => ActivityAttachment[]
    ) => {
      setDraftOverride((current) => {
        const source = current ?? draftRef.current;
        const next = {
          ...source,
          attachments: mutate(source.attachments),
        };
        draftRef.current = next;
        return next;
      });
      setDirty(true);
      setFeedback(null);
    },
    [setDirty]
  );

  const addDocuments = useCallback(
    (files: FileList | null) => {
      if (!files?.length) return;
      const selected = Array.from(files);
      const valid = selected.filter(activityDocumentFileIsValid);
      const invalidCount = selected.length - valid.length;

      if (valid.length > 0) {
        const attachments = valid.map(activityDocumentFromFile);
        mutateAttachments((current) => [...current, ...attachments]);
        const toastId = toast.loading(
          t.activities.admin.uploadingFiles.replace(
            "{count}",
            String(attachments.length),
          ),
        );
        let cursor = 0;
        let failed = 0;
        const uploadNext = async () => {
          while (cursor < valid.length) {
            const index = cursor++;
            const file = valid[index];
            const local = attachments[index];
            try {
              const uploaded = await uploadActivityAsset(
                file,
                "document",
                (status) => {
                  mutateAttachments((current) =>
                    current.map((attachment) =>
                      attachment.id === local.id
                        ? { ...attachment, status }
                        : attachment,
                    ),
                  );
                },
              );
              releaseActivityDocument(local);
              mutateAttachments((current) =>
                current.map((attachment) =>
                  attachment.id === local.id
                    ? {
                        ...attachment,
                        id: uploaded.asset.id,
                        originalSrc: uploaded.downloadSrc,
                        downloadSrc: uploaded.downloadSrc,
                        previewSrc: uploaded.previewSrc,
                        thumbnailSrc: uploaded.thumbnailSrc,
                        pageCount: uploaded.asset.page_count ?? undefined,
                        status: "ready",
                        error: undefined,
                      }
                    : attachment,
                ),
              );
            } catch {
              failed += 1;
              mutateAttachments((current) =>
                current.map((attachment) =>
                  attachment.id === local.id
                    ? {
                        ...attachment,
                        status: "failed",
                        error: t.activities.admin.uploadItemFailed,
                      }
                    : attachment,
                ),
              );
            }
          }
        };
        void Promise.all(
          Array.from(
            { length: Math.min(3, valid.length) },
            () => uploadNext(),
          ),
        ).then(() => {
          if (failed > 0) {
            toast.error(
              t.activities.admin.uploadFailed.replace(
                "{count}",
                String(failed),
              ),
              { id: toastId },
            );
          } else {
            toast.success(
              t.activities.admin.documents.added.replace(
                "{count}",
                String(attachments.length),
              ),
              { id: toastId },
            );
          }
        });
      }
      if (invalidCount > 0) {
        toast.error(
          t.activities.admin.documents.invalid.replace(
            "{count}",
            String(invalidCount)
          )
        );
      }
    },
    [mutateAttachments, t]
  );

  const updateDocument = useCallback(
    (index: number, patch: Partial<ActivityAttachment>) => {
      mutateAttachments((current) =>
        current.map((attachment, attachmentIndex) =>
          attachmentIndex === index
            ? { ...attachment, ...patch }
            : attachment
        )
      );
    },
    [mutateAttachments]
  );

  const removeDocument = useCallback(
    (index: number) => {
      mutateAttachments((current) => {
        const attachment = current[index];
        if (!attachment) return current;
        releaseActivityDocument(attachment);
        return current.filter(
          (_, attachmentIndex) => attachmentIndex !== index
        );
      });
    },
    [mutateAttachments]
  );

  const moveDocument = useCallback(
    (index: number, direction: -1 | 1) => {
      mutateAttachments((current) => {
        const target = index + direction;
        if (target < 0 || target >= current.length) return current;
        const attachments = [...current];
        [attachments[index], attachments[target]] = [
          attachments[target],
          attachments[index],
        ];
        return attachments;
      });
    },
    [mutateAttachments]
  );

  const reorderDocuments = useCallback(
    (from: number, to: number) => {
      if (from === to) return;
      mutateAttachments((current) => {
        if (
          from < 0 ||
          to < 0 ||
          from >= current.length ||
          to >= current.length
        ) {
          return current;
        }
        const attachments = [...current];
        const [moved] = attachments.splice(from, 1);
        attachments.splice(to, 0, moved);
        return attachments;
      });
    },
    [mutateAttachments]
  );

  const setCover = useCallback(
    async (file: File | null) => {
      if (!file) return;
      if (!activityPosterFileIsValid(file)) {
        notify("poster");
        return;
      }

      const toastId = toast.loading(t.activities.admin.coverUploading);
      try {
        const uploaded = await uploadActivityAsset(file, "image", (status) => {
          if (status === "processing") {
            toast.loading(t.activities.admin.coverProcessing, { id: toastId });
          }
        });
        const current = draftRef.current.cover;
        updateDraft({
          cover: {
            id: uploaded.asset.id,
            src: uploaded.src,
            renderedSrc: undefined,
            originalSrc: uploaded.src,
            alt: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "),
            template: current?.template ?? "none",
            customOverlaySrc: current?.customOverlaySrc,
            crop: undefined,
            status: "ready",
          },
        });
        toast.success(t.activities.admin.coverUploadComplete, { id: toastId });
      } catch {
        toast.dismiss(toastId);
        notify("poster");
      }
    },
    [notify, t, updateDraft]
  );

  const setPoster = useCallback(
    async (index: number, file: File | null) => {
      if (!file) return;
      if (!activityPosterFileIsValid(file)) {
        notify("poster");
        return;
      }
      const toastId = toast.loading(t.activities.admin.posterUploading);
      try {
        const poster = await activityPosterFromFile(file);
        updateMedia(index, {
          poster,
          posterOriginalSrc: poster,
          posterCrop: undefined,
        });
        toast.success(t.activities.admin.posterUploadComplete, { id: toastId });
      } catch {
        toast.dismiss(toastId);
        notify("poster");
      }
    },
    [notify, t, updateMedia]
  );

  const save = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const slug = slugifyActivity(draft.slug || draft.title.id);
      const complete =
        slug &&
        draft.date &&
        draft.title.en.trim() &&
        draft.title.id.trim() &&
        draft.caption.en.trim() &&
        draft.caption.id.trim() &&
        draft.body.en.trim() &&
        draft.body.id.trim();

      if (!complete) {
        notify("validation");
        return;
      }
      if (
        draft.status === "published" &&
        [
          ...(draft.cover ? [draft.cover] : []),
          ...draft.media,
          ...draft.attachments,
        ].some((asset) => (asset.status ?? "ready") !== "ready")
      ) {
        notify("media");
        return;
      }
      if (!isActivitySlugAvailable(slug, selectedSlug ?? undefined)) {
        notify("slug");
        return;
      }

      const normalized: ActivityPost = {
        ...draft,
        slug,
        title: { en: draft.title.en.trim(), id: draft.title.id.trim() },
        caption: { en: draft.caption.en.trim(), id: draft.caption.id.trim() },
        body: { en: draft.body.en.trim(), id: draft.body.id.trim() },
        tags: draft.tags
          .map((tag) => tag.trim())
          .filter(Boolean)
          .slice(0, 6),
        relatedProject: draft.relatedProject?.trim() || undefined,
        pinned: Boolean(draft.pinned),
      };

      const result = await saveActivity(normalized, selectedSlug ?? undefined);
      if (!result.ok) {
        if (result.reason === "storage") notify("storage");
        return;
      }
      setSelectedSlug(result.post.slug);
      setDraftOverride(result.post);
      setDirty(false);
      clearActivityDraftRecovery();
      setRecoveredDraft(null);
      notify("saved");
    },
    [draft, notify, selectedSlug, setDirty]
  );

  const deleteCurrent = useCallback(async () => {
    if (!selectedSlug) return;
    const result = await deleteActivity(selectedSlug);
    if (!result.ok) {
      if (result.reason === "storage") notify("storage");
      return;
    }

    const nextPost = posts.find((post) => post.slug !== selectedSlug);
    clearActivityDraftRecovery();
    setRecoveredDraft(null);
    setSelectedSlug(nextPost?.slug ?? null);
    setDraftOverride(nextPost ? null : createBlankActivity());
    setDirty(false);
    notify("deleted");
  }, [notify, posts, selectedSlug, setDirty]);

  return {
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
    addDocuments,
    updateDocument,
    removeDocument,
    moveDocument,
    reorderDocuments,
    setCover,
    setPoster,
    save,
    deleteCurrent,
    openPreview: () => setPreviewOpen(true),
    closePreview: () => setPreviewOpen(false),
  };
}
