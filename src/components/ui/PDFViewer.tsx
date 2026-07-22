"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";

interface PDFViewerProps {
  src: string;
  className?: string;
}

/**
 * Renders a PDF document as stacked <canvas> elements using pdf.js.
 * Because the PDF is drawn to canvas (not iframe/embed), X-Frame-Options
 * headers have zero effect — there are no frames involved at all.
 *
 * Split into two effects to handle the React rendering cycle correctly:
 *   1. First effect: loads the PDF, stores in a ref, sets numPages state.
 *   2. Second effect: triggered after numPages is set (div is now in DOM),
 *      reads containerRef and appends rendered canvas elements.
 */
export function PDFViewer({ src, className }: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── Effect 1: load the PDF document ────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setNumPages(0);
      pdfRef.current = null;

      try {
        const pdfjsLib = await import("pdfjs-dist");

        // Use a URL object so the bundler can resolve the worker from the
        // installed package instead of depending on an external CDN.
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

        const pdf = await pdfjsLib.getDocument({ url: src }).promise;
        if (cancelled) return;

        pdfRef.current = pdf;
        // Setting numPages triggers Effect 2 after the div mounts.
        setNumPages(pdf.numPages);
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          console.error("[PDFViewer] load error:", err);
          setError("Failed to load PDF.");
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [src]);

  // ─── Effect 2: render pages to canvas once the div is in the DOM ────────────
  useEffect(() => {
    if (numPages === 0) return;
    const pdf = pdfRef.current;
    const container = containerRef.current;
    if (!pdf || !container) return;

    let cancelled = false;

    async function renderPages() {
      if (!pdf || !container) return;
      container.innerHTML = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        if (cancelled) break;

        const page = await pdf.getPage(i);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const baseScale = 1.5;
        const viewport = page.getViewport({ scale: baseScale * dpr });

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width / dpr}px`;
        canvas.style.height = `${viewport.height / dpr}px`;
        canvas.style.display = "block";
        canvas.style.maxWidth = "100%";
        canvas.style.backgroundColor = "#ffffff";
        if (i < pdf.numPages) canvas.style.marginBottom = "16px";

        const ctx = canvas.getContext("2d");
        if (!ctx) continue;

        await page.render({ canvas, canvasContext: ctx, viewport }).promise;

        if (!cancelled && container) {
          container.appendChild(canvas);
        }
      }
    }

    renderPages();
    return () => {
      cancelled = true;
    };
  }, [numPages, src]);

  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 ${className ?? ""}`}>
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-hairline border-t-volt" />
        <span className="font-mono text-[11px] uppercase tracking-widest text-muted">
          Loading CV…
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center ${className ?? ""}`}>
        <span className="font-mono text-xs uppercase tracking-widest text-muted">
          {error}
        </span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`flex flex-col items-center p-4 ${className ?? ""}`}
    />
  );
}
