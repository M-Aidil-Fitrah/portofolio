"use client";

import { useState } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import type { ActivityStatus } from "@/lib/activities";
import {
  ACTIVITY_STATUSES,
  type UpdateActivityDraft,
} from "./activity-admin-config";

export function ActivityPublishingSection({
  status,
  pinned,
  canDelete,
  activityTitle,
  onUpdate,
  onDelete,
}: {
  status: ActivityStatus;
  pinned: boolean;
  canDelete: boolean;
  activityTitle: string;
  onUpdate: UpdateActivityDraft;
  onDelete: () => void;
}) {
  const { t } = useLocale();
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <section className="border-t border-hairline py-8">
        <h3 className="font-mono text-xs uppercase tracking-widest text-muted">
          {t.activities.admin.publishing}
        </h3>
        <div className="mt-6 grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.7fr)]">
          <div
            className="flex flex-wrap gap-3"
            role="group"
            aria-label={t.activities.admin.status}
          >
            {ACTIVITY_STATUSES.map((nextStatus) => (
              <button
                key={nextStatus}
                type="button"
                onClick={() => onUpdate({ status: nextStatus })}
                aria-pressed={status === nextStatus}
                className={`rounded-pill border px-5 py-2.5 font-mono text-xs uppercase tracking-widest ${
                  status === nextStatus
                    ? "border-volt bg-volt text-ink"
                    : "border-hairline text-muted"
                }`}
              >
                {t.activities.admin.statuses[nextStatus]}
              </button>
            ))}
          </div>
          <div>
            <label className="flex cursor-pointer items-start gap-4">
              <input
                type="checkbox"
                checked={pinned}
                onChange={(event) => onUpdate({ pinned: event.target.checked })}
                className="mt-1 h-4 w-4 accent-volt"
              />
              <span>
                <span className="block text-sm font-medium">
                  {t.activities.admin.pin}
                </span>
                <span className="mt-1 block text-sm text-muted">
                  {t.activities.admin.pinHint}
                </span>
              </span>
            </label>
            {canDelete && (
              <div className="mt-6 border-t border-hairline pt-5">
                <button
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                  className="font-mono text-[10px] uppercase tracking-widest text-muted transition-colors hover:text-foreground"
                >
                  {t.activities.admin.deletePost}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
      <AdminConfirmDialog
        open={deleteOpen}
        title={t.activities.admin.deleteTitle}
        body={t.activities.admin.deleteBody.replace("{title}", activityTitle)}
        cancelLabel={t.activities.admin.cancel}
        confirmLabel={t.activities.admin.confirmDelete}
        danger
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => {
          setDeleteOpen(false);
          onDelete();
        }}
      />
    </>
  );
}
