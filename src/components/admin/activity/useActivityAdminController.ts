"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useAdminWorkspace } from "@/components/admin/AdminWorkspaceProvider";
import { useSmoothScroll } from "@/components/providers/SmoothScrollProvider";
import type { ActivityPost, MediaAsset } from "@/lib/activities";
import {
  deleteActivity,
  isActivitySlugAvailable,
  saveActivity,
  useActivities,
} from "@/lib/activity-store";
import { deleteActivityComments } from "@/lib/activity-comments-store";
import { deleteActivityLike } from "@/lib/activity-likes-store";
import {
  clearActivityDraftRecovery,
  readActivityDraftRecovery,
  writeActivityDraftRecovery,
} from "./activity-draft-recovery";
import {
  activityMediaFilesAreValid,
  activityMediaFromFiles,
  activityPosterFileIsValid,
  activityPosterFromFile,
  createBlankActivity,
  slugifyActivity,
  type AdminFeedback,
  type ContentLocale,
} from "./activity-admin-config";

export function useActivityAdminController() {
  const { lenis } = useSmoothScroll();
  const { dirty, setDirty, confirmDiscard } = useAdminWorkspace();
  const posts = useActivities();
  const initial = useMemo(() => posts[0] ?? createBlankActivity(), [posts]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(
    initial.slug || null
  );
  const [draftOverride, setDraftOverride] = useState<ActivityPost | null>(null);
  const [contentLocale, setContentLocale] = useState<ContentLocale>("id");
  const [feedback, setFeedback] = useState<AdminFeedback>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recoveryInitialized = useRef(false);
  const editorRef = useRef<HTMLElement>(null);
  const selectedPost = selectedSlug
    ? posts.find((post) => post.slug === selectedSlug)
    : undefined;
  const draft = draftOverride ?? selectedPost ?? initial;

  const notify = useCallback((next: AdminFeedback) => {
    setFeedback(next);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(null), 4000);
  }, []);

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
      setSelectedSlug(recovery.selectedSlug);
      setDraftOverride(recovery.draft);
      setContentLocale(recovery.contentLocale);
      setDirty(true);
      notify("recovered");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [notify, setDirty]);

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
    setSelectedSlug(null);
    setDraftOverride(createBlankActivity());
    setContentLocale("id");
    setDirty(true);
    setFeedback(null);
    scrollToEditor();
  }, [confirmDiscard, scrollToEditor, setDirty]);

  const updateDraft = useCallback(
    (patch: Partial<ActivityPost>) => {
      setDraftOverride((current) => ({ ...(current ?? draft), ...patch }));
      setDirty(true);
      setFeedback(null);
    },
    [draft, setDirty]
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
        return next;
      });
      setDirty(true);
      setFeedback(null);
    },
    [draft, selectedSlug, setDirty]
  );

  const addMedia = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      const selected = Array.from(files);
      if (!activityMediaFilesAreValid(selected, draft.media.length)) {
        notify("media");
        return;
      }

      try {
        const media = await activityMediaFromFiles(selected);
        updateDraft({ media: [...draft.media, ...media] });
      } catch {
        notify("media");
      }
    },
    [draft.media, notify, updateDraft]
  );

  const updateMedia = useCallback(
    (index: number, patch: Partial<MediaAsset>) => {
      updateDraft({
        media: draft.media.map((item, itemIndex) =>
          itemIndex === index ? { ...item, ...patch } : item
        ),
      });
    },
    [draft.media, updateDraft]
  );

  const moveMedia = useCallback(
    (index: number, direction: -1 | 1) => {
      const target = index + direction;
      if (target < 0 || target >= draft.media.length) return;
      const media = [...draft.media];
      [media[index], media[target]] = [media[target], media[index]];
      updateDraft({ media });
    },
    [draft.media, updateDraft]
  );

  const setPoster = useCallback(
    async (index: number, file: File | null) => {
      if (!file) return;
      if (!activityPosterFileIsValid(file)) {
        notify("poster");
        return;
      }
      try {
        updateMedia(index, { poster: await activityPosterFromFile(file) });
      } catch {
        notify("poster");
      }
    },
    [notify, updateMedia]
  );

  const save = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const slug = slugifyActivity(
        draft.slug || draft.title.en || draft.title.id
      );
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
        notify("storage");
        return;
      }
      setSelectedSlug(normalized.slug);
      setDraftOverride(normalized);
      setDirty(false);
      clearActivityDraftRecovery();
      notify("saved");
    },
    [draft, notify, selectedSlug, setDirty]
  );

  const deleteCurrent = useCallback(async () => {
    if (!selectedSlug) return;
    const result = await deleteActivity(selectedSlug);
    if (!result.ok) {
      notify("storage");
      return;
    }

    deleteActivityComments(
      selectedSlug,
      draft.comments.map((comment) => comment.id)
    );
    deleteActivityLike(selectedSlug);
    const nextPost = posts.find((post) => post.slug !== selectedSlug);
    clearActivityDraftRecovery();
    setSelectedSlug(nextPost?.slug ?? null);
    setDraftOverride(nextPost ? null : createBlankActivity());
    setDirty(false);
    notify("deleted");
  }, [draft.comments, notify, posts, selectedSlug, setDirty]);

  return {
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
    openPreview: () => setPreviewOpen(true),
    closePreview: () => setPreviewOpen(false),
  };
}
