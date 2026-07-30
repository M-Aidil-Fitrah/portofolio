"use client";

import { useLocale } from "@/components/providers/LocaleProvider";
import type { ActivityDraftRecovery } from "@/lib/activity-schema";

export function ActivityWorkspaceLanding({
  postsCount,
  recoveredDraft,
  feedbackText,
  onCreate,
  onCreateCover,
  onBrowse,
  onRecover,
}: {
  postsCount: number;
  recoveredDraft: ActivityDraftRecovery | null;
  feedbackText: string;
  onCreate: () => void;
  onCreateCover: (file: File | null) => void;
  onBrowse: () => void;
  onRecover: () => void;
}) {
  const { t, locale } = useLocale();
  const recoveredTitle =
    recoveredDraft?.draft.title[locale] || t.activities.admin.untitled;

  return (
    <main className="py-8 lg:pl-10 lg:py-10">
      <div className="border-b border-hairline pb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-volt">
          {t.activities.admin.landingEyebrow}
        </p>
        <h2 className="mt-3 max-w-3xl text-3xl font-semibold uppercase leading-tight sm:text-4xl xl:text-5xl">
          {t.activities.admin.landingTitle}
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
          {t.activities.admin.landingBody}
        </p>
        {feedbackText && (
          <p
            role="status"
            className="mt-4 font-mono text-[10px] uppercase tracking-widest text-volt"
          >
            {feedbackText}
          </p>
        )}
      </div>

      {recoveredDraft && (
        <button
          type="button"
          onClick={onRecover}
          className="group mt-8 grid w-full gap-5 border border-volt/60 bg-volt/[0.035] p-5 text-left transition-colors hover:bg-volt/[0.07] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:p-7"
        >
          <span>
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-volt">
              {t.activities.admin.recoveryAvailable}
            </span>
            <span className="mt-3 block text-xl font-semibold uppercase leading-snug sm:text-2xl">
              {recoveredTitle}
            </span>
            <span className="mt-2 block text-sm leading-relaxed text-muted">
              {t.activities.admin.resumeDraftHint}
            </span>
          </span>
          <span className="font-mono text-xs uppercase tracking-widest text-volt">
            {t.activities.admin.resumeDraft} →
          </span>
        </button>
      )}

      <div className="mt-8 grid gap-px border border-hairline bg-hairline sm:grid-cols-2">
        <LandingAction
          index="01"
          title={t.activities.admin.startActivity}
          description={t.activities.admin.startActivityHint}
          onClick={onCreate}
          icon="create"
        />
        <LandingAction
          index="02"
          title={t.activities.admin.startCover}
          description={t.activities.admin.startCoverHint}
          onFile={onCreateCover}
          icon="cover"
        />
        <LandingAction
          index="03"
          title={t.activities.admin.editActivity}
          description={t.activities.admin.editActivityHint.replace(
            "{count}",
            String(postsCount)
          )}
          onClick={onBrowse}
          icon="edit"
        />
        <div className="flex min-h-52 flex-col justify-between bg-ink p-5 sm:p-7">
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
            04 / {t.activities.admin.workspaceStatus}
          </span>
          <div>
            <span className="block text-4xl font-semibold text-foreground">
              {String(postsCount).padStart(2, "0")}
            </span>
            <span className="mt-2 block max-w-xs text-sm leading-relaxed text-muted">
              {t.activities.admin.workspaceStatusHint}
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}

function LandingAction({
  index,
  title,
  description,
  onClick,
  onFile,
  icon,
}: {
  index: string;
  title: string;
  description: string;
  onClick?: () => void;
  onFile?: (file: File | null) => void;
  icon: "create" | "cover" | "edit";
}) {
  const content = (
    <>
      <span className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
        {index}
        <LandingIcon kind={icon} />
      </span>
      <span>
        <span className="block text-xl font-semibold uppercase leading-snug transition-colors group-hover:text-volt sm:text-2xl">
          {title}
        </span>
        <span className="mt-3 block max-w-sm text-sm leading-relaxed text-muted">
          {description}
        </span>
      </span>
    </>
  );
  const className =
    "group relative flex min-h-52 flex-col justify-between bg-ink p-5 text-left transition-colors hover:bg-surface focus-within:bg-surface focus-visible:bg-surface focus-visible:outline-none sm:p-7";

  if (onFile) {
    return (
      <label className={`${className} cursor-pointer`}>
        {content}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => {
            onFile(event.target.files?.[0] ?? null);
            event.target.value = "";
          }}
        />
      </label>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

function LandingIcon({ kind }: { kind: "create" | "cover" | "edit" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      className="h-6 w-6 text-muted transition-colors group-hover:text-volt"
      aria-hidden="true"
    >
      {kind === "create" && (
        <>
          <path d="M12 5v14M5 12h14" />
          <circle cx="12" cy="12" r="9" />
        </>
      )}
      {kind === "cover" && (
        <>
          <rect x="3" y="5" width="18" height="14" />
          <path d="m3 16 5-5 4 4 3-3 6 6M16.5 9h.01" />
        </>
      )}
      {kind === "edit" && (
        <>
          <path d="m4 20 4.2-1 10.9-10.9a2.1 2.1 0 0 0-3-3L5.2 16Z" />
          <path d="m14.7 6.5 3 3M4 20h16" />
        </>
      )}
    </svg>
  );
}
