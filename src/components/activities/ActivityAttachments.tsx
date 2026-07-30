"use client";

import { useLocale } from "@/components/providers/LocaleProvider";
import { usePreview } from "@/components/providers/PreviewProvider";
import type { ActivityAttachment } from "@/lib/activity-schema";

export function ActivityAttachments({
  attachments,
  showProcessing = false,
  className = "",
}: {
  attachments: ActivityAttachment[];
  showProcessing?: boolean;
  className?: string;
}) {
  const { t, locale } = useLocale();
  const { openPreview } = usePreview();
  const visible = showProcessing
    ? attachments
    : attachments.filter((attachment) => attachment.status === "ready");

  if (visible.length === 0) {
    return (
      <div
        data-public-attachments
        className={`border border-dashed border-hairline px-6 py-14 text-center font-mono text-xs uppercase tracking-widest text-muted ${className}`}
      >
        {t.activities.admin.previewStudio.emptyAttachments}
      </div>
    );
  }

  return (
    <div
      data-public-attachments
      className={`grid grid-cols-1 gap-3 md:grid-cols-2 ${className}`}
    >
      {visible.map((attachment, index) => {
        const previewReady =
          attachment.status === "ready" && Boolean(attachment.previewSrc);
        const label = attachment.label[locale] || attachment.filename;

        return (
          <article
            key={attachment.id ?? `${attachment.filename}-${index}`}
            className="flex min-w-0 items-center gap-4 border border-hairline bg-surface/40 p-4"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center border border-hairline font-mono text-[9px] uppercase tracking-widest text-volt">
              {documentExtension(attachment.filename)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {label}
              </p>
              <p className="mt-1 truncate font-mono text-[9px] uppercase tracking-widest text-muted">
                {attachment.filename} / {formatSize(attachment.size)}
              </p>
              {showProcessing && (
                <p
                  className={`mt-2 font-mono text-[9px] uppercase tracking-widest ${
                    previewReady ? "text-volt" : "text-muted"
                  }`}
                >
                  {t.activities.admin.mediaStatuses[attachment.status]}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {previewReady && (
                <button
                  type="button"
                  onClick={() =>
                    openPreview({
                      src: attachment.previewSrc,
                      type: "pdf",
                      alt: label,
                      caption: label,
                      downloadHref: attachment.downloadSrc,
                    })
                  }
                  aria-label={`${t.activities.admin.documents.preview} ${index + 1}`}
                  className="rounded-pill border border-hairline px-3 py-2 font-mono text-[9px] uppercase tracking-widest text-volt"
                >
                  {t.activities.admin.preview}
                </button>
              )}
              {attachment.downloadSrc && (
                <a
                  href={attachment.downloadSrc}
                  download={attachment.filename}
                  aria-label={`${t.activities.admin.documents.download} ${label}`}
                  className="rounded-pill border border-hairline px-3 py-2 font-mono text-[9px] uppercase tracking-widest text-muted"
                >
                  ↓
                </a>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function documentExtension(filename: string) {
  return filename.split(".").pop()?.toUpperCase() || "FILE";
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) return `${kilobytes.toFixed(1)} KB`;
  return `${(kilobytes / 1024).toFixed(1)} MB`;
}
