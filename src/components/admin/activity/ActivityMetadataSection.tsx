"use client";

import { useLocale } from "@/components/providers/LocaleProvider";
import {
  ACTIVITY_CATEGORIES,
  type ActivityPost,
  type ActivityProgress,
} from "@/lib/activities";
import { AdminField } from "./AdminField";
import {
  ACTIVITY_PROGRESS,
  ADMIN_INPUT_CLASS,
  type UpdateActivityDraft,
} from "./activity-admin-config";

export function ActivityMetadataSection({
  draft,
  onUpdate,
}: {
  draft: ActivityPost;
  onUpdate: UpdateActivityDraft;
}) {
  const { t } = useLocale();

  return (
    <section className="border-t border-hairline py-8">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <AdminField label={t.activities.admin.category}>
          <select
            value={draft.category}
            onChange={(event) =>
              onUpdate({
                category: event.target.value as ActivityPost["category"],
              })
            }
            className={`${ADMIN_INPUT_CLASS} rounded-pill`}
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
            onChange={(event) => onUpdate({ date: event.target.value })}
            className={`${ADMIN_INPUT_CLASS} rounded-pill`}
          />
        </AdminField>
        <AdminField label={t.activities.admin.progress}>
          <select
            value={draft.progress ?? ""}
            onChange={(event) =>
              onUpdate({
                progress: (event.target.value || undefined) as
                  | ActivityProgress
                  | undefined,
              })
            }
            className={`${ADMIN_INPUT_CLASS} rounded-pill`}
          >
            <option value="" className="bg-surface">
              {t.activities.admin.noProgress}
            </option>
            {ACTIVITY_PROGRESS.map((progress) => (
              <option key={progress} value={progress} className="bg-surface">
                {t.activities.progress[progress]}
              </option>
            ))}
          </select>
        </AdminField>
        <AdminField
          label={t.activities.admin.tags}
          hint={t.activities.admin.tagsHint}
        >
          <input
            type="text"
            value={draft.tags.join(", ")}
            onChange={(event) =>
              onUpdate({ tags: event.target.value.split(",") })
            }
            className={`${ADMIN_INPUT_CLASS} rounded-pill`}
          />
        </AdminField>
        <AdminField
          label={t.activities.admin.relatedProject}
          hint={t.activities.admin.relatedProjectHint}
        >
          <input
            type="text"
            value={draft.relatedProject ?? ""}
            onChange={(event) =>
              onUpdate({ relatedProject: event.target.value })
            }
            className={`${ADMIN_INPUT_CLASS} rounded-pill`}
          />
        </AdminField>
      </div>
    </section>
  );
}
