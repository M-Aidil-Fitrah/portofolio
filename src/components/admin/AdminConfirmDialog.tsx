"use client";

import { useEffect } from "react";

export function AdminConfirmDialog({
  open,
  title,
  body,
  cancelLabel,
  confirmLabel,
  danger = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  body: string;
  cancelLabel: string;
  confirmLabel: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onCancel, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[180] grid place-items-center bg-ink/90 px-6 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="admin-confirm-title"
      aria-describedby="admin-confirm-body"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-md border border-hairline bg-surface p-6 sm:p-8">
        <h2
          id="admin-confirm-title"
          className="text-2xl font-semibold uppercase leading-tight"
        >
          {title}
        </h2>
        <p id="admin-confirm-body" className="mt-4 text-sm leading-relaxed text-muted">
          {body}
        </p>
        <div className="mt-8 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            autoFocus
            className="rounded-pill border border-hairline px-5 py-3 font-mono text-[11px] uppercase tracking-widest text-foreground transition-colors hover:border-foreground"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-pill border px-5 py-3 font-mono text-[11px] uppercase tracking-widest transition-colors ${
              danger
                ? "border-foreground text-foreground hover:bg-foreground hover:text-ink"
                : "border-volt text-volt hover:bg-volt hover:text-ink"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
