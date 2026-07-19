"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useSmoothScroll } from "@/components/providers/SmoothScrollProvider";
import { ActivityMedia } from "@/components/activities/ActivityMedia";
import { formatActivityDate } from "@/components/activities/ActivityCard";
import {
  ACTIVITY_CATEGORIES,
  activities as seedActivities,
  type ActivityPost,
  type ActivityProgress,
  type ActivityStatus,
  type MediaAsset,
} from "@/lib/activities";
import {
  isActivitySlugAvailable,
  saveActivity,
  useActivities,
} from "@/lib/activity-store";
import {
  setActivityCommentHidden,
  useActivityCommentStore,
} from "@/lib/activity-comments-store";

const MAX_MEDIA = 4;
const MAX_FILE_SIZE = 3 * 1024 * 1024;
const STATUSES: ActivityStatus[] = ["draft", "published", "hidden"];
const PROGRESS: ActivityProgress[] = ["learning", "shipped", "exploring"];

type StatusFilter = "all" | ActivityStatus;
type ContentLocale = "en" | "id";

function blankPost(): ActivityPost {
  return {
    slug: "",
    title: { en: "", id: "" },
    caption: { en: "", id: "" },
    body: { en: "", id: "" },
    category: "project",
    date: new Date().toISOString().slice(0, 10),
    tags: [],
    media: [],
    status: "draft",
    pinned: false,
    likes: 0,
    comments: [],
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const inputClass =
  "w-full border border-hairline bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-volt focus:outline-none";

export function ActivityAdmin() {
  const { t, locale } = useLocale();
  const { lenis } = useSmoothScroll();
  const posts = useActivities();
  const commentStore = useActivityCommentStore();
  const initial = posts[0] ?? seedActivities[0] ?? blankPost();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(initial.slug || null);
  const [draftOverride, setDraftOverride] = useState<ActivityPost | null>(null);
  const [contentLocale, setContentLocale] = useState<ContentLocale>("id");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dirty, setDirty] = useState(false);
  const [feedback, setFeedback] = useState<"saved" | "storage" | "validation" | "slug" | "media" | null>(null);
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

  const filteredPosts = useMemo(
    () =>
      posts
        .filter((post) => statusFilter === "all" || post.status === statusFilter)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [posts, statusFilter]
  );

  const comments = useMemo(
    () => [...draft.comments, ...(commentStore.extra[draft.slug] ?? [])],
    [commentStore.extra, draft.comments, draft.slug]
  );
  const hiddenCommentIds = useMemo(
    () => new Set(commentStore.hiddenIds),
    [commentStore.hiddenIds]
  );

  const notify = (next: typeof feedback) => {
    setFeedback(next);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(null), 4000);
  };

  const updateDraft = (patch: Partial<ActivityPost>) => {
    setDraftOverride((current) => ({ ...(current ?? draft), ...patch }));
    setDirty(true);
    setFeedback(null);
  };

  const updateLocalized = (
    field: "title" | "caption" | "body",
    language: ContentLocale,
    value: string
  ) => {
    setDraftOverride((current) => {
      const source = current ?? draft;
      const next = { ...source, [field]: { ...source[field], [language]: value } };
      if (!selectedSlug && field === "title") next.slug = slugify(value);
      return next;
    });
    setDirty(true);
    setFeedback(null);
  };

  const selectPost = (post: ActivityPost) => {
    setSelectedSlug(post.slug);
    setDraftOverride(null);
    setDirty(false);
    setFeedback(null);
    scrollToEditor();
  };

  const createPost = () => {
    setSelectedSlug(null);
    setDraftOverride(blankPost());
    setContentLocale("id");
    setDirty(true);
    setFeedback(null);
    scrollToEditor();
  };

  const scrollToEditor = () => {
    if (!window.matchMedia("(max-width: 1023px)").matches) return;
    requestAnimationFrame(() => {
      if (!editorRef.current) return;
      if (lenis) lenis.scrollTo(editorRef.current, { offset: -80 });
      else editorRef.current.scrollIntoView({ behavior: "smooth" });
    });
  };

  const addMedia = async (files: FileList | null) => {
    if (!files?.length) return;
    const selected = Array.from(files);
    if (
      draft.media.length + selected.length > MAX_MEDIA ||
      selected.some(
        (file) =>
          file.size > MAX_FILE_SIZE ||
          (!file.type.startsWith("image/") && !file.type.startsWith("video/"))
      )
    ) {
      notify("media");
      return;
    }

    const media: MediaAsset[] = await Promise.all(
      selected.map(async (file) => ({
        type: file.type.startsWith("video/") ? "video" : "image",
        src: await fileToDataUrl(file),
        alt: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "),
      }))
    );
    updateDraft({ media: [...draft.media, ...media] });
  };

  const save = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const slug = slugify(draft.slug || draft.title.en || draft.title.id);
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
      tags: draft.tags.map((tag) => tag.trim()).filter(Boolean).slice(0, 6),
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
  };

  const feedbackText =
    feedback === "saved"
      ? t.activities.admin.saved
      : feedback === "storage"
        ? t.activities.admin.storageError
        : feedback === "slug"
          ? t.activities.admin.slugTaken
          : feedback === "media"
            ? t.activities.admin.mediaHint
            : feedback === "validation"
              ? t.activities.admin.validationError
              : "";

  return (
    <div className="mx-auto max-w-[1500px] px-6 pb-24 pt-10 sm:px-10 sm:pt-14">
      <div className="border-b border-hairline pb-10">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-volt">
            {t.activities.admin.eyebrow}
          </p>
          <h1 className="mt-3 text-4xl font-semibold uppercase leading-none sm:text-6xl">
            {t.activities.admin.heading}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
            {t.activities.admin.intro}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="border-b border-hairline py-8 lg:border-b-0 lg:border-r lg:pr-8">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-mono text-xs uppercase tracking-widest text-muted">
              {t.activities.admin.posts} ({posts.length})
            </h2>
            <button
              type="button"
              onClick={createPost}
              className="btn-fill inline-flex h-10 items-center rounded-pill border border-volt px-4 font-mono text-xs uppercase tracking-widest text-volt"
            >
              + {t.activities.admin.newPost}
            </button>
          </div>

          <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label={t.activities.admin.status}>
            {(["all", ...STATUSES] as StatusFilter[]).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                aria-pressed={statusFilter === status}
                className={`rounded-pill border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors ${
                  statusFilter === status
                    ? "border-volt bg-volt text-ink"
                    : "border-hairline text-muted hover:text-foreground"
                }`}
              >
                {status === "all" ? t.activities.admin.all : t.activities.admin.statuses[status]}
              </button>
            ))}
          </div>

          <div className="mt-6 max-h-[680px] overflow-y-auto border-t border-hairline">
            {filteredPosts.length === 0 && (
              <p className="py-10 text-sm text-muted">{t.activities.admin.empty}</p>
            )}
            {filteredPosts.map((post) => (
              <button
                key={post.slug}
                type="button"
                onClick={() => selectPost(post)}
                className={`block w-full border-b border-hairline py-5 text-left transition-colors ${
                  selectedSlug === post.slug ? "text-foreground" : "text-muted hover:text-foreground"
                }`}
              >
                <span className="flex items-center justify-between gap-4 font-mono text-[10px] uppercase tracking-widest">
                  <span className={post.status === "published" ? "text-volt" : ""}>
                    {t.activities.admin.statuses[post.status]}
                  </span>
                  <span>{post.date}</span>
                </span>
                <span className="mt-2 block text-sm font-medium uppercase leading-snug">
                  {post.title[locale] || t.activities.admin.untitled}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <main ref={editorRef} className="py-8 lg:pl-10">
          <form onSubmit={save}>
            <div className="flex flex-col gap-5 border-b border-hairline pb-8 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
                  {selectedSlug ? t.activities.admin.editTitle : t.activities.admin.createTitle}
                </p>
                <h2 className="mt-2 text-2xl font-semibold uppercase leading-tight sm:text-3xl">
                  {draft.title[locale] || t.activities.admin.untitled}
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {feedbackText && (
                  <p
                    role="status"
                    className={`font-mono text-[11px] uppercase tracking-widest ${
                      feedback === "saved" ? "text-volt" : "text-foreground"
                    }`}
                  >
                    {feedbackText}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="btn-fill inline-flex h-11 items-center rounded-pill border border-hairline px-5 font-mono text-xs uppercase tracking-widest text-foreground"
                >
                  {t.activities.admin.preview}
                </button>
                <button
                  type="submit"
                  className="btn-fill inline-flex h-11 items-center rounded-pill border border-volt px-5 font-mono text-xs uppercase tracking-widest text-volt"
                >
                  {t.activities.admin.save}
                </button>
              </div>
            </div>

            <section className="py-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="font-mono text-xs uppercase tracking-widest text-muted">
                  {t.activities.admin.content}
                </h3>
                <div className="inline-flex w-fit rounded-pill border border-hairline p-1" role="group">
                  {(["id", "en"] as ContentLocale[]).map((language) => (
                    <button
                      key={language}
                      type="button"
                      onClick={() => setContentLocale(language)}
                      aria-pressed={contentLocale === language}
                      className={`rounded-pill px-4 py-2 font-mono text-[10px] uppercase tracking-widest ${
                        contentLocale === language ? "bg-volt text-ink" : "text-muted"
                      }`}
                    >
                      {language === "id" ? t.activities.admin.indonesian : t.activities.admin.english}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-5">
                <AdminField label={t.activities.admin.title}>
                  <input
                    type="text"
                    value={draft.title[contentLocale]}
                    onChange={(event) => updateLocalized("title", contentLocale, event.target.value)}
                    className={`${inputClass} rounded-pill`}
                  />
                </AdminField>
                <AdminField label={t.activities.admin.slug}>
                  <input
                    type="text"
                    value={draft.slug}
                    disabled={Boolean(selectedSlug)}
                    onChange={(event) => updateDraft({ slug: slugify(event.target.value) })}
                    className={`${inputClass} rounded-pill disabled:cursor-not-allowed disabled:opacity-50`}
                  />
                </AdminField>
                <AdminField label={t.activities.admin.caption}>
                  <textarea
                    rows={3}
                    value={draft.caption[contentLocale]}
                    onChange={(event) => updateLocalized("caption", contentLocale, event.target.value)}
                    className={`${inputClass} rounded-card`}
                  />
                </AdminField>
                <AdminField label={t.activities.admin.body}>
                  <textarea
                    rows={7}
                    value={draft.body[contentLocale]}
                    onChange={(event) => updateLocalized("body", contentLocale, event.target.value)}
                    className={`${inputClass} rounded-card`}
                  />
                </AdminField>
              </div>
            </section>

            <section className="border-t border-hairline py-8">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                <AdminField label={t.activities.admin.category}>
                  <select
                    value={draft.category}
                    onChange={(event) => updateDraft({ category: event.target.value as ActivityPost["category"] })}
                    className={`${inputClass} rounded-pill`}
                  >
                    {ACTIVITY_CATEGORIES.map((category) => (
                      <option key={category} value={category} className="bg-surface">
                        {t.activities.filters[category]}
                      </option>
                    ))}
                  </select>
                </AdminField>
                <AdminField label={t.activities.admin.date}>
                  <input
                    type="date"
                    value={draft.date}
                    onChange={(event) => updateDraft({ date: event.target.value })}
                    className={`${inputClass} rounded-pill`}
                  />
                </AdminField>
                <AdminField label={t.activities.admin.progress}>
                  <select
                    value={draft.progress ?? ""}
                    onChange={(event) => updateDraft({ progress: (event.target.value || undefined) as ActivityProgress | undefined })}
                    className={`${inputClass} rounded-pill`}
                  >
                    <option value="" className="bg-surface">{t.activities.admin.noProgress}</option>
                    {PROGRESS.map((progress) => (
                      <option key={progress} value={progress} className="bg-surface">
                        {t.activities.progress[progress]}
                      </option>
                    ))}
                  </select>
                </AdminField>
                <AdminField label={t.activities.admin.tags} hint={t.activities.admin.tagsHint}>
                  <input
                    type="text"
                    value={draft.tags.join(", ")}
                    onChange={(event) => updateDraft({ tags: event.target.value.split(",") })}
                    className={`${inputClass} rounded-pill`}
                  />
                </AdminField>
                <AdminField
                  label={t.activities.admin.relatedProject}
                  hint={t.activities.admin.relatedProjectHint}
                >
                  <input
                    type="text"
                    value={draft.relatedProject ?? ""}
                    onChange={(event) => updateDraft({ relatedProject: event.target.value })}
                    className={`${inputClass} rounded-pill`}
                  />
                </AdminField>
              </div>
            </section>

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
                      void addMedia(event.target.files);
                      event.target.value = "";
                    }}
                  />
                </label>
              </div>

              {draft.media.length > 0 && (
                <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {draft.media.map((media, index) => (
                    <div key={`${media.alt}-${index}`}>
                      <ActivityMedia media={media} index={index + 1} className="aspect-video" />
                      <div className="mt-3 flex items-center justify-between gap-4">
                        <p className="truncate font-mono text-[10px] uppercase tracking-widest text-muted">
                          {media.type} / {media.alt}
                        </p>
                        <button
                          type="button"
                          onClick={() => updateDraft({ media: draft.media.filter((_, mediaIndex) => mediaIndex !== index) })}
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

            <section className="border-t border-hairline py-8">
              <h3 className="font-mono text-xs uppercase tracking-widest text-muted">
                {t.activities.admin.publishing}
              </h3>
              <div className="mt-6 flex flex-wrap gap-3" role="group" aria-label={t.activities.admin.status}>
                {STATUSES.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => updateDraft({ status })}
                    aria-pressed={draft.status === status}
                    className={`rounded-pill border px-5 py-2.5 font-mono text-xs uppercase tracking-widest ${
                      draft.status === status
                        ? "border-volt bg-volt text-ink"
                        : "border-hairline text-muted"
                    }`}
                  >
                    {t.activities.admin.statuses[status]}
                  </button>
                ))}
              </div>
              <label className="mt-7 flex max-w-xl cursor-pointer items-start gap-4 border-t border-hairline pt-6">
                <input
                  type="checkbox"
                  checked={Boolean(draft.pinned)}
                  onChange={(event) => updateDraft({ pinned: event.target.checked })}
                  className="mt-1 h-4 w-4 accent-volt"
                />
                <span>
                  <span className="block text-sm font-medium">{t.activities.admin.pin}</span>
                  <span className="mt-1 block text-sm text-muted">{t.activities.admin.pinHint}</span>
                </span>
              </label>
            </section>

            <section className="border-t border-hairline py-8">
              <h3 className="font-mono text-xs uppercase tracking-widest text-muted">
                {t.activities.admin.comments} ({comments.length})
              </h3>
              {comments.length === 0 ? (
                <p className="mt-6 text-sm text-muted">{t.activities.admin.commentsEmpty}</p>
              ) : (
                <ul className="mt-6">
                  {comments.map((comment) => {
                    const hidden = hiddenCommentIds.has(comment.id);
                    return (
                      <li key={comment.id} className="flex flex-col gap-4 border-t border-hairline py-5 sm:flex-row sm:items-start sm:justify-between">
                        <div className={hidden ? "opacity-50" : ""}>
                          <p className="font-mono text-[10px] uppercase tracking-widest text-volt">
                            {comment.author} / {formatActivityDate(comment.date, locale)}
                          </p>
                          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-foreground/90">
                            {comment.body}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-4">
                          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                            {hidden ? t.activities.admin.hidden : t.activities.admin.visible}
                          </span>
                          <button
                            type="button"
                            onClick={() => setActivityCommentHidden(comment.id, !hidden)}
                            className="rounded-pill border border-hairline px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-foreground transition-colors hover:border-volt hover:text-volt"
                          >
                            {hidden ? t.activities.admin.show : t.activities.admin.hide}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <div className="sticky bottom-0 flex items-center justify-end gap-4 border-t border-hairline bg-ink/95 py-5 backdrop-blur-sm">
              {dirty && (
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                  {t.activities.admin.statuses.draft}
                </span>
              )}
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="btn-fill inline-flex h-11 items-center rounded-pill border border-hairline px-5 font-mono text-xs uppercase tracking-widest text-foreground"
              >
                {t.activities.admin.preview}
              </button>
              <button
                type="submit"
                className="btn-fill inline-flex h-11 items-center rounded-pill border border-volt px-6 font-mono text-xs uppercase tracking-widest text-volt"
              >
                {t.activities.admin.save}
              </button>
            </div>
          </form>
        </main>
      </div>

      {previewOpen && (
        <AdminPreview post={draft} onClose={() => setPreviewOpen(false)} />
      )}
    </div>
  );
}

function AdminField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-2">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
        {label}
      </span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

function AdminPreview({ post, onClose }: { post: ActivityPost; onClose: () => void }) {
  const { t, locale } = useLocale();

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.activities.admin.preview}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[130] overflow-y-auto bg-ink/95 px-6 py-12 backdrop-blur-sm sm:px-10"
    >
      <div className="mx-auto max-w-[1000px] rounded-card border border-hairline bg-surface p-6 sm:p-10">
        <div className="flex items-center justify-between gap-6 border-b border-hairline pb-5">
          <p className="font-mono text-xs uppercase tracking-widest text-volt">
            {t.activities.admin.preview} / {t.activities.admin.statuses[post.status]}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="btn-fill inline-flex h-10 items-center rounded-pill border border-hairline px-5 font-mono text-xs uppercase tracking-widest text-foreground"
          >
            {t.activities.admin.closePreview}
          </button>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-muted">
          <span className="text-volt">{t.activities.filters[post.category]}</span>
          <span>{formatActivityDate(post.date, locale)}</span>
          {post.progress && (
            <span className="rounded-pill border border-hairline px-3 py-1">
              {t.activities.progress[post.progress]}
            </span>
          )}
        </div>
        <h2 className="mt-4 text-3xl font-semibold uppercase leading-tight sm:text-5xl">
          {post.title[locale] || t.activities.admin.untitled}
        </h2>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-foreground/90">
          {post.caption[locale]}
        </p>

        {post.media.length > 0 && (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {post.media.map((media, index) => (
              <ActivityMedia
                key={`${media.alt}-${index}`}
                media={media}
                index={index + 1}
                className={index === 0 ? "aspect-video sm:col-span-2" : "aspect-[4/3]"}
              />
            ))}
          </div>
        )}

        <p className="mt-10 max-w-2xl whitespace-pre-line text-base leading-relaxed text-foreground/90">
          {post.body[locale]}
        </p>
        <div className="mt-8 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span key={tag} className="rounded-pill border border-hairline px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-muted">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
