"use client";

import { useLocale } from "@/components/providers/LocaleProvider";

export function ActivityAdminActions({
  onPreview,
  savePadding = "px-5",
}: {
  onPreview: () => void;
  savePadding?: "px-5" | "px-6";
}) {
  const { t } = useLocale();

  return (
    <div className="flex shrink-0 items-center gap-3">
      <button
        type="button"
        onClick={onPreview}
        className="btn-fill inline-flex h-11 shrink-0 items-center whitespace-nowrap rounded-pill border border-hairline px-5 font-mono text-xs uppercase tracking-widest text-foreground"
      >
        {t.activities.admin.preview}
      </button>
      <button
        type="submit"
        className={`btn-fill inline-flex h-11 shrink-0 items-center whitespace-nowrap rounded-pill border border-volt ${savePadding} font-mono text-xs uppercase tracking-widest text-volt`}
      >
        {t.activities.admin.save}
      </button>
    </div>
  );
}
