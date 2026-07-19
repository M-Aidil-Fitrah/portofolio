"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useSmoothScroll } from "@/components/providers/SmoothScrollProvider";
import { activities as seedActivities, type ActivityPost } from "@/lib/activities";
import {
  isActivitySlugAvailable,
  saveActivity,
  useActivities,
} from "@/lib/activity-store";
import { ActivityEditor } from "./activity/ActivityEditor";
import { ActivityPostList } from "./activity/ActivityPostList";
import {
  activityMediaFilesAreValid,
  activityMediaFromFiles,
  createBlankActivity,
  slugifyActivity,
  type AdminFeedback,
  type ContentLocale,
} from "./activity/activity-admin-config";

const ActivityAdminPreview = dynamic(
  () =>
    import("./activity/ActivityAdminPreview").then(
      (module) => module.ActivityAdminPreview
    ),
  { ssr: false }
);

export function ActivityAdmin() {
  const { t } = useLocale();
  const { lenis } = useSmoothScroll();
  const posts = useActivities();
  const initial = useMemo(
    () => posts[0] ?? seedActivities[0] ?? createBlankActivity(),
    [posts]
  );
  const [selectedSlug, setSelectedSlug] = useState<string | null>(
    initial.slug || null
  );
  const [draftOverride, setDraftOverride] = useState<ActivityPost | null>(null);
  const [contentLocale, setContentLocale] = useState<ContentLocale>("id");
  const [dirty, setDirty] = useState(false);
  const [feedback, setFeedback] = useState<AdminFeedback>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<HTMLElement>(null);
  const selectedPost = selectedSlug
    ? posts.find((post) => post.slug === selectedSlug)
    : undefined;
  const draft = draftOverride ?? selectedPost ?? initial;

  useEffect(
    () => () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    },
    []
  );

  const notify = useCallback((next: AdminFeedback) => {
    setFeedback(next);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(null), 4000);
  }, []);

  const scrollToEditor = useCallback(() => {
    if (!window.matchMedia("(max-width: 1023px)").matches) return;
    requestAnimationFrame(() => {
      if (!editorRef.current) return;
      if (lenis) lenis.scrollTo(editorRef.current, { offset: -80 });
      else editorRef.current.scrollIntoView({ behavior: "smooth" });
    });
  }, [lenis]);

  const selectPost = useCallback(
    (post: ActivityPost) => {
      setSelectedSlug(post.slug);
      setDraftOverride(null);
      setDirty(false);
      setFeedback(null);
      scrollToEditor();
    },
    [scrollToEditor]
  );

  const createPost = useCallback(() => {
    setSelectedSlug(null);
    setDraftOverride(createBlankActivity());
    setContentLocale("id");
    setDirty(true);
    setFeedback(null);
    scrollToEditor();
  }, [scrollToEditor]);

  const updateDraft = useCallback(
    (patch: Partial<ActivityPost>) => {
      setDraftOverride((current) => ({ ...(current ?? draft), ...patch }));
      setDirty(true);
      setFeedback(null);
    },
    [draft]
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
        if (!selectedSlug && field === "title") {
          next.slug = slugifyActivity(value);
        }
        return next;
      });
      setDirty(true);
      setFeedback(null);
    },
    [draft, selectedSlug]
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

  const save = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
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

      const result = saveActivity(normalized);
      if (!result.ok) {
        notify("storage");
        return;
      }
      setSelectedSlug(normalized.slug);
      setDraftOverride(normalized);
      setDirty(false);
      notify("saved");
    },
    [draft, notify, selectedSlug]
  );

  const openPreview = useCallback(() => setPreviewOpen(true), []);
  const closePreview = useCallback(() => setPreviewOpen(false), []);
  const feedbackText = getFeedbackText(feedback, t.activities.admin);

  return (
    <div className="mx-auto max-w-[1500px] px-6 pb-24 pt-10 sm:px-10 sm:pt-14">
      <header className="border-b border-hairline pb-10">
        <p className="font-mono text-xs uppercase tracking-widest text-volt">
          {t.activities.admin.eyebrow}
        </p>
        <h1 className="mt-3 text-4xl font-semibold uppercase leading-none sm:text-6xl">
          {t.activities.admin.heading}
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
          {t.activities.admin.intro}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)]">
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
          onPreview={openPreview}
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
    storageError: string;
    slugTaken: string;
    mediaHint: string;
    validationError: string;
  }
) {
  if (feedback === "saved") return messages.saved;
  if (feedback === "storage") return messages.storageError;
  if (feedback === "slug") return messages.slugTaken;
  if (feedback === "media") return messages.mediaHint;
  if (feedback === "validation") return messages.validationError;
  return "";
}
