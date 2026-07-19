"use client";

import { useLocale } from "@/components/providers/LocaleProvider";
import type { ActivityStatus } from "@/lib/activities";
import {
  ACTIVITY_STATUSES,
  type UpdateActivityDraft,
} from "./activity-admin-config";

export function ActivityPublishingSection({
  status,
  pinned,
  onUpdate,
}: {
  status: ActivityStatus;
  pinned: boolean;
  onUpdate: UpdateActivityDraft;
}) {
  const { t } = useLocale();

  return (
    <section className="border-t border-hairline py-8">
      <h3 className="font-mono text-xs uppercase tracking-widest text-muted">
        {t.activities.admin.publishing}
      </h3>
      <div
        className="mt-6 flex flex-wrap gap-3"
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
      <label className="mt-7 flex max-w-xl cursor-pointer items-start gap-4 border-t border-hairline pt-6">
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
    </section>
  );
}
