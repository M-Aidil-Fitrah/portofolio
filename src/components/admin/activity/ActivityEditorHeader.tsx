"use client";

import { useLocale } from "@/components/providers/LocaleProvider";
import type { AdminFeedback } from "./activity-admin-config";

export function ActivityEditorHeader({
  creating,
  title,
  feedback,
  feedbackText,
}: {
  creating: boolean;
  title: string;
  feedback: AdminFeedback;
  feedbackText: string;
}) {
  const { t } = useLocale();

  return (
    <div className="border-b border-hairline pb-6 sm:pb-8">
      <div className="min-w-0">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
          {creating
            ? t.activities.admin.createTitle
            : t.activities.admin.editTitle}
        </p>
        <h2 className="mt-2 break-words text-2xl font-semibold uppercase leading-tight sm:text-3xl">
          {title || t.activities.admin.untitled}
        </h2>
        {feedbackText && (
          <p
            role="status"
            className={`mt-3 font-mono text-[11px] uppercase tracking-widest ${
              feedback === "saved" ? "text-volt" : "text-foreground"
            }`}
          >
            {feedbackText}
          </p>
        )}
      </div>
    </div>
  );
}
