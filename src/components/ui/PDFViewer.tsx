"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  RenderTask,
} from "pdfjs-dist";
import { useLocale } from "@/components/providers/LocaleProvider";

const PDF_WORKER_URL = "/pdfjs/pdf.worker.min.mjs";
const PDF_STANDARD_FONTS_URL = "/pdfjs/standard_fonts/";
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.25;

interface PDFViewerProps {
  src: string;
  className?: string;
}

export function PDFViewer({ src, className = "" }: PDFViewerProps) {
  const { t } = useLocale();
  const rootRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [availableWidth, setAvailableWidth] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  const changeZoom = useCallback((next: number) => {
    setZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next)));
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement === rootRef.current) {
      void document.exitFullscreen();
      return;
    }
    void rootRef.current?.requestFullscreen();
  }, []);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    let frame = 0;
    const update = (width: number) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setAvailableWidth(Math.max(240, Math.floor(width - 32)));
      });
    };
    const observer = new ResizeObserver(([entry]) => {
      update(entry.contentRect.width);
    });
    observer.observe(node);
    update(node.getBoundingClientRect().width);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleFullscreen = () => {
      setFullscreen(document.fullscreenElement === rootRef.current);
    };
    document.addEventListener("fullscreenchange", handleFullscreen);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreen);
  }, []);

  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
      if (!rootRef.current?.contains(document.activeElement)) return;
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        changeZoom(zoom + ZOOM_STEP);
      } else if (event.key === "-") {
        event.preventDefault();
        changeZoom(zoom - ZOOM_STEP);
      } else if (event.key === "0") {
        event.preventDefault();
        changeZoom(1);
      }
    };
    document.addEventListener("keydown", handleKeyboard);
    return () => document.removeEventListener("keydown", handleKeyboard);
  }, [changeZoom, zoom]);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: PDFDocumentLoadingTask | null = null;
    let loadedDocument: PDFDocumentProxy | null = null;

    const load = async () => {
      setLoading(true);
      setError(false);
      setProgress(0);
      setNumPages(0);
      pdfRef.current = null;

      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
        loadingTask = pdfjs.getDocument({
          url: src,
          standardFontDataUrl: PDF_STANDARD_FONTS_URL,
          useWorkerFetch: true,
        });
        loadingTask.onProgress = ({
          loaded,
          total,
        }: {
          loaded: number;
          total: number;
        }) => {
          if (!cancelled && total > 0) {
            setProgress(Math.min(100, Math.round((loaded / total) * 100)));
          }
        };
        loadedDocument = await loadingTask.promise;
        if (cancelled) return;
        pdfRef.current = loadedDocument;
        setNumPages(loadedDocument.numPages);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
      pdfRef.current = null;
      void loadingTask?.destroy();
    };
  }, [retryKey, src]);

  useEffect(() => {
    const pdf = pdfRef.current;
    const container = pagesRef.current;
    if (!pdf || !container || !numPages || !availableWidth) return;

    let cancelled = false;
    const tasks: RenderTask[] = [];

    const renderPages = async () => {
      setRendering(true);
      container.replaceChildren();
      try {
        for (let number = 1; number <= pdf.numPages; number += 1) {
          if (cancelled) return;
          const page = await pdf.getPage(number);
          const base = page.getViewport({ scale: 1 });
          const cssWidth = Math.max(240, Math.round(availableWidth * zoom));
          const scale = cssWidth / base.width;
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const viewport = page.getViewport({ scale: scale * dpr });
          const frame = document.createElement("figure");
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d", { alpha: false });
          if (!context) continue;

          const label = t.preview.pdf.page
            .replace("{page}", String(number))
            .replace("{total}", String(pdf.numPages));
          frame.dataset.pdfPage = String(number);
          frame.setAttribute("aria-label", label);
          frame.style.width = `${cssWidth}px`;
          frame.style.maxWidth = zoom <= 1 ? "100%" : "none";
          frame.style.flex = "0 0 auto";
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          canvas.style.width = "100%";
          canvas.style.height = "auto";
          canvas.style.display = "block";
          canvas.style.background = "#ffffff";
          canvas.setAttribute("role", "img");
          canvas.setAttribute("aria-label", label);
          frame.appendChild(canvas);
          container.appendChild(frame);

          const task = page.render({
            canvas,
            canvasContext: context,
            viewport,
          });
          tasks.push(task);
          await task.promise;
        }
      } catch (renderError) {
        if (
          !cancelled &&
          !(renderError instanceof Error &&
            renderError.name === "RenderingCancelledException")
        ) {
          setError(true);
        }
      } finally {
        if (!cancelled) setRendering(false);
      }
    };

    void renderPages();
    return () => {
      cancelled = true;
      tasks.forEach((task) => task.cancel());
      container.replaceChildren();
    };
  }, [availableWidth, numPages, t.preview.pdf.page, zoom]);

  return (
    <div
      ref={rootRef}
      data-pdf-viewer
      data-pdf-local-assets
      data-pdf-zoom={zoom.toFixed(2)}
      className={`relative flex min-h-96 flex-col overflow-hidden bg-ink fullscreen:h-screen fullscreen:w-screen ${className}`}
    >
      <div className="z-10 flex shrink-0 flex-wrap items-center gap-2 border-b border-hairline bg-ink/95 p-3 backdrop-blur-sm">
        <span className="mr-auto font-mono text-[10px] uppercase tracking-widest text-muted">
          {loading
            ? t.preview.pdf.loading.replace("{progress}", String(progress))
            : t.preview.pdf.pages.replace("{count}", String(numPages))}
        </span>
        <PdfControl
          label={t.preview.pdf.zoomOut}
          disabled={zoom <= ZOOM_MIN || loading || error}
          onClick={() => changeZoom(zoom - ZOOM_STEP)}
        >
          −
        </PdfControl>
        <button
          type="button"
          disabled={loading || error}
          onClick={() => changeZoom(1)}
          aria-label={t.preview.pdf.resetZoom}
          className="min-w-16 rounded-pill border border-hairline px-3 py-2 font-mono text-[9px] uppercase tracking-widest text-muted transition-colors hover:border-volt hover:text-volt disabled:opacity-35"
        >
          {Math.round(zoom * 100)}%
        </button>
        <PdfControl
          label={t.preview.pdf.zoomIn}
          disabled={zoom >= ZOOM_MAX || loading || error}
          onClick={() => changeZoom(zoom + ZOOM_STEP)}
        >
          +
        </PdfControl>
        <PdfControl
          label={
            fullscreen
              ? t.preview.pdf.exitFullscreen
              : t.preview.pdf.fullscreen
          }
          disabled={loading || error}
          onClick={toggleFullscreen}
        >
          {fullscreen ? "↙" : "↗"}
        </PdfControl>
      </div>

      <div
        ref={viewportRef}
        data-lenis-prevent
        className="relative min-h-0 flex-1 overflow-auto bg-surface/45"
      >
        {(loading || rendering) && !error && (
          <div
            role="status"
            className="pointer-events-none sticky left-0 top-0 z-10 flex h-1 w-full overflow-hidden bg-hairline"
          >
            <span
              className="h-full animate-pulse bg-volt transition-[width]"
              style={{
                width: loading ? `${Math.max(8, progress)}%` : "100%",
              }}
            />
          </div>
        )}

        {loading && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8">
            <span className="h-7 w-7 animate-spin rounded-full border border-muted border-t-volt" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
              {t.preview.pdf.loading.replace("{progress}", String(progress))}
            </span>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <p className="max-w-sm text-sm leading-relaxed text-muted">
              {t.preview.pdf.error}
            </p>
            <button
              type="button"
              onClick={() => setRetryKey((current) => current + 1)}
              className="rounded-pill border border-volt px-5 py-2.5 font-mono text-[10px] uppercase tracking-widest text-volt transition-colors hover:bg-volt hover:text-ink"
            >
              {t.preview.pdf.retry}
            </button>
          </div>
        )}

        <div
          ref={pagesRef}
          className="flex min-w-full flex-col items-center gap-4 p-4"
        />
      </div>
    </div>
  );
}

function PdfControl({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-full border border-hairline font-mono text-sm text-muted transition-colors hover:border-volt hover:text-volt disabled:opacity-35"
    >
      {children}
    </button>
  );
}
