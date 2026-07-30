"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { ActivityAttachments } from "@/components/activities/ActivityAttachments";
import { ActivityCard } from "@/components/activities/ActivityCard";
import { ActivityDetail } from "@/components/activities/ActivityDetail";
import { ActivityMedia } from "@/components/activities/ActivityMedia";
import {
  LocalePreviewProvider,
  useLocale,
} from "@/components/providers/LocaleProvider";
import type { ActivityPost } from "@/lib/activities";
import type { ActivityContentLocale } from "@/lib/activity-schema";

type PreviewTab = "feed" | "detail" | "gallery" | "attachments";
type PreviewViewport = "desktop" | "tablet" | "mobile";

const PREVIEW_TABS: PreviewTab[] = [
  "feed",
  "detail",
  "gallery",
  "attachments",
];

const PREVIEW_VIEWPORTS: Record<
  PreviewViewport,
  { width: number; height: number }
> = {
  desktop: { width: 1440, height: 1000 },
  tablet: { width: 820, height: 1180 },
  mobile: { width: 390, height: 844 },
};

export function ActivityAdminPreview({
  post,
  initialLocale,
  onClose,
}: {
  post: ActivityPost;
  initialLocale: ActivityContentLocale;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const [tab, setTab] = useState<PreviewTab>("feed");
  const [viewport, setViewport] = useState<PreviewViewport>("desktop");
  const [previewLocale, setPreviewLocale] =
    useState<ActivityContentLocale>(initialLocale);
  const dimensions = PREVIEW_VIEWPORTS[viewport];

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
      className="fixed inset-0 z-[130] flex min-h-0 flex-col bg-ink/97 backdrop-blur-sm"
      data-activity-preview-studio
      data-preview-tab={tab}
      data-preview-viewport={viewport}
      data-preview-locale={previewLocale}
    >
      <header className="z-10 shrink-0 border-b border-hairline bg-ink/95 px-4 py-4 backdrop-blur-sm sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
          <div className="flex min-w-0 items-center justify-between gap-5 xl:w-64 xl:shrink-0">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-volt">
                {t.activities.admin.previewStudio.eyebrow}
              </p>
              <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-widest text-muted">
                {t.activities.admin.statuses[post.status]} /{" "}
                {dimensions.width} × {dimensions.height}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="btn-fill inline-flex h-10 shrink-0 items-center rounded-pill border border-hairline px-4 font-mono text-[10px] uppercase tracking-widest text-foreground xl:hidden"
            >
              {t.activities.admin.closePreview}
            </button>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div
              role="tablist"
              aria-label={t.activities.admin.previewStudio.tabsLabel}
              className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {PREVIEW_TABS.map((item) => (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={tab === item}
                  onClick={() => setTab(item)}
                  className={`h-9 shrink-0 rounded-pill border px-4 font-mono text-[10px] uppercase tracking-widest transition-colors ${
                    tab === item
                      ? "border-volt bg-volt text-ink"
                      : "border-hairline text-muted hover:text-foreground"
                  }`}
                >
                  {t.activities.admin.previewStudio.tabs[item]}
                  {item === "gallery" && ` (${post.media.length})`}
                  {item === "attachments" &&
                    ` (${post.attachments.length})`}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div
                role="group"
                aria-label={
                  t.activities.admin.previewStudio.languageLabel
                }
                className="flex gap-1"
              >
                {(["id", "en"] as ActivityContentLocale[]).map(
                  (item) => (
                    <button
                      key={item}
                      type="button"
                      aria-pressed={previewLocale === item}
                      aria-label={
                        item === "id"
                          ? t.activities.admin.indonesian
                          : t.activities.admin.english
                      }
                      onClick={() => setPreviewLocale(item)}
                      className={`h-9 rounded-pill border px-3 font-mono text-[9px] uppercase tracking-widest transition-colors ${
                        previewLocale === item
                          ? "border-volt text-volt"
                          : "border-hairline text-muted hover:text-foreground"
                      }`}
                    >
                      {item.toUpperCase()}
                    </button>
                  )
                )}
              </div>
              <div
                role="group"
                aria-label={t.activities.admin.previewStudio.viewportLabel}
                className="flex gap-1"
              >
                {(
                  Object.keys(PREVIEW_VIEWPORTS) as PreviewViewport[]
                ).map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={viewport === item}
                    aria-label={
                      t.activities.admin.previewStudio.viewports[item]
                    }
                    onClick={() => setViewport(item)}
                    className={`grid h-9 min-w-9 place-items-center rounded-pill border px-3 font-mono text-[9px] uppercase tracking-widest transition-colors ${
                      viewport === item
                        ? "border-volt text-volt"
                        : "border-hairline text-muted hover:text-foreground"
                    }`}
                  >
                    <ViewportIcon viewport={item} />
                    <span className="sr-only">
                      {t.activities.admin.previewStudio.viewports[item]}
                    </span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="btn-fill hidden h-10 shrink-0 items-center rounded-pill border border-hairline px-5 font-mono text-[10px] uppercase tracking-widest text-foreground xl:inline-flex"
              >
                {t.activities.admin.closePreview}
              </button>
            </div>
          </div>
        </div>

        <p className="mt-3 font-mono text-[9px] uppercase tracking-widest text-muted">
          {t.activities.admin.previewStudio.inertHint}
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-auto bg-surface/45 p-4 sm:p-6 lg:p-8">
        <div
          className="mx-auto w-max border border-hairline bg-ink shadow-2xl shadow-black/50"
          style={{ width: dimensions.width }}
        >
          <ActivityPreviewFrame
            width={dimensions.width}
            height={dimensions.height}
            title={t.activities.admin.previewStudio.frameTitle}
          >
            <div
              inert
              data-preview-inert
              lang={previewLocale}
              className="public-experience min-h-screen bg-ink text-foreground"
            >
              <LocalePreviewProvider locale={previewLocale}>
                <PreviewSurface tab={tab} post={post} />
              </LocalePreviewProvider>
            </div>
          </ActivityPreviewFrame>
        </div>
      </div>
    </div>
  );
}

function PreviewSurface({
  tab,
  post,
}: {
  tab: PreviewTab;
  post: ActivityPost;
}) {
  const { t, locale } = useLocale();

  if (tab === "detail") {
    return <ActivityDetail post={post} previewMode />;
  }

  if (tab === "gallery") {
    return (
      <main className="min-h-screen px-6 pb-24 pt-16 sm:px-10 sm:pt-24">
        <div className="mx-auto max-w-[1100px]">
          <p className="font-mono text-[10px] uppercase tracking-widest text-volt">
            {t.activities.filters[post.category]}
          </p>
          <h2 className="mt-3 text-3xl font-semibold uppercase leading-none sm:text-5xl">
            {t.activities.admin.previewStudio.galleryTitle}
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
            {post.title[locale] || t.activities.admin.untitled}
          </p>
          {post.media.length > 0 ? (
            <div
              data-preview-gallery
              className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2"
            >
              {post.media.map((media, index) => (
                <figure
                  key={media.id ?? `${media.type}-${index}`}
                  className={index === 0 ? "sm:col-span-2" : ""}
                >
                  <ActivityMedia
                    media={media}
                    index={index + 1}
                    videoControls={false}
                    className={
                      index === 0 ? "aspect-video" : "aspect-[4/3]"
                    }
                  />
                  {media.caption?.[locale] && (
                    <figcaption className="mt-3 text-sm leading-relaxed text-muted">
                      {media.caption[locale]}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          ) : (
            <EmptyPreviewState>
              {t.activities.admin.previewStudio.emptyGallery}
            </EmptyPreviewState>
          )}
        </div>
      </main>
    );
  }

  if (tab === "attachments") {
    return (
      <main className="min-h-screen px-6 pb-24 pt-16 sm:px-10 sm:pt-24">
        <div className="mx-auto max-w-[1100px]">
          <p className="font-mono text-[10px] uppercase tracking-widest text-volt">
            {t.activities.filters[post.category]}
          </p>
          <h2 className="mt-3 text-3xl font-semibold uppercase leading-none sm:text-5xl">
            {t.activities.admin.previewStudio.attachmentsTitle}
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
            {post.title[locale] || t.activities.admin.untitled}
          </p>
          <ActivityAttachments
            attachments={post.attachments}
            showProcessing
            className="mt-10"
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 pb-24 pt-16 sm:px-10 sm:pt-24">
      <div className="mx-auto max-w-[1100px]">
        <p className="font-mono text-xs uppercase tracking-widest text-muted">
          {t.activities.browseLabel}
        </p>
        <div data-preview-feed className="mt-8">
          <ActivityCard post={post} />
        </div>
      </div>
    </main>
  );
}

function ActivityPreviewFrame({
  width,
  height,
  title,
  children,
}: {
  width: number;
  height: number;
  title: string;
  children: ReactNode;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);

  const prepareFrame = useCallback(() => {
    const frameDocument = frameRef.current?.contentDocument;
    if (!frameDocument) return;

    frameDocument.documentElement.className =
      document.documentElement.className;
    frameDocument.body.className =
      "min-h-full bg-ink text-foreground antialiased";
    frameDocument.body.style.margin = "0";
    frameDocument.body.setAttribute("data-preview-frame-body", "");

    frameDocument.head
      .querySelectorAll("[data-preview-parent-style]")
      .forEach((node) => node.remove());
    document
      .querySelectorAll<HTMLStyleElement | HTMLLinkElement>(
        'style, link[rel="stylesheet"]'
      )
      .forEach((node) => {
        const clone = node.cloneNode(true) as HTMLElement;
        clone.setAttribute("data-preview-parent-style", "");
        frameDocument.head.appendChild(clone);
      });

    setMountNode(frameDocument.body);
  }, []);

  return (
    <>
      <iframe
        ref={frameRef}
        srcDoc="<!doctype html><html><head><base href='/' /></head><body></body></html>"
        title={title}
        width={width}
        height={height}
        onLoad={prepareFrame}
        data-preview-frame
        data-preview-width={width}
        data-preview-height={height}
        className="block border-0 bg-ink"
      />
      {mountNode && createPortal(children, mountNode)}
    </>
  );
}

function EmptyPreviewState({ children }: { children: ReactNode }) {
  return (
    <div className="mt-10 border border-dashed border-hairline px-6 py-20 text-center font-mono text-xs uppercase tracking-widest text-muted">
      {children}
    </div>
  );
}

function ViewportIcon({ viewport }: { viewport: PreviewViewport }) {
  if (viewport === "mobile") {
    return (
      <svg
        viewBox="0 0 16 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        className="h-4 w-3"
        aria-hidden="true"
      >
        <rect x="1" y="1" width="14" height="18" rx="2" />
        <path d="M6 16.5h4" />
      </svg>
    );
  }
  if (viewport === "tablet") {
    return (
      <svg
        viewBox="0 0 18 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <rect x="1" y="1" width="16" height="18" rx="2" />
        <circle cx="9" cy="16.5" r=".6" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 22 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      className="h-4 w-5"
      aria-hidden="true"
    >
      <rect x="1" y="1" width="20" height="13" rx="1" />
      <path d="M7 17h8M11 14v3" />
    </svg>
  );
}
