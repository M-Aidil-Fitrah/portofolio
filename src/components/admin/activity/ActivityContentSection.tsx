"use client";

import { useLocale } from "@/components/providers/LocaleProvider";
import type { ActivityPost } from "@/lib/activities";
import { AdminField } from "./AdminField";
import {
  ADMIN_INPUT_CLASS,
  slugifyActivity,
  type ContentLocale,
  type UpdateActivityDraft,
  type UpdateLocalizedActivity,
} from "./activity-admin-config";

export function ActivityContentSection({
  draft,
  slugLocked,
  contentLocale,
  onContentLocaleChange,
  onUpdate,
  onUpdateLocalized,
}: {
  draft: ActivityPost;
  slugLocked: boolean;
  contentLocale: ContentLocale;
  onContentLocaleChange: (locale: ContentLocale) => void;
  onUpdate: UpdateActivityDraft;
  onUpdateLocalized: UpdateLocalizedActivity;
}) {
  const { t } = useLocale();

  return (
    <section className="py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-mono text-xs uppercase tracking-widest text-muted">
          {t.activities.admin.content}
        </h3>
        <div
          className="inline-flex w-fit rounded-pill border border-hairline p-1"
          role="group"
        >
          {(["id", "en"] as ContentLocale[]).map((language) => (
            <button
              key={language}
              type="button"
              onClick={() => onContentLocaleChange(language)}
              aria-pressed={contentLocale === language}
              className={`rounded-pill px-4 py-2 font-mono text-[10px] uppercase tracking-widest ${
                contentLocale === language ? "bg-volt text-ink" : "text-muted"
              }`}
            >
              {language === "id"
                ? t.activities.admin.indonesian
                : t.activities.admin.english}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.8fr)]">
          <AdminField label={t.activities.admin.title}>
            <input
              type="text"
              value={draft.title[contentLocale]}
              onChange={(event) =>
                onUpdateLocalized("title", contentLocale, event.target.value)
              }
              className={`${ADMIN_INPUT_CLASS} rounded-pill`}
            />
          </AdminField>
          <AdminField label={t.activities.admin.slug}>
            <input
              type="text"
              value={draft.slug}
              disabled={slugLocked}
              onChange={(event) =>
                onUpdate({ slug: slugifyActivity(event.target.value) })
              }
              className={`${ADMIN_INPUT_CLASS} rounded-pill disabled:cursor-not-allowed disabled:opacity-50`}
            />
          </AdminField>
        </div>
        <AdminField label={t.activities.admin.caption}>
          <textarea
            rows={3}
            value={draft.caption[contentLocale]}
            onChange={(event) =>
              onUpdateLocalized("caption", contentLocale, event.target.value)
            }
            className={`${ADMIN_INPUT_CLASS} rounded-card`}
          />
        </AdminField>
        <AdminField label={t.activities.admin.body}>
          <textarea
            rows={7}
            value={draft.body[contentLocale]}
            onChange={(event) =>
              onUpdateLocalized("body", contentLocale, event.target.value)
            }
            className={`${ADMIN_INPUT_CLASS} rounded-card`}
          />
        </AdminField>
      </div>
    </section>
  );
}
