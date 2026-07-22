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
    <div className="grid flex-1 grid-cols-2 items-center gap-3 sm:flex sm:flex-none">
      <button
        type="button"
        onClick={onPreview}
        className="btn-fill inline-flex h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-pill border border-hairline px-4 font-mono text-[11px] uppercase tracking-widest text-foreground sm:px-5 sm:text-xs"
      >
        {t.activities.admin.preview}
      </button>
      <button
        type="submit"
        className={`btn-fill inline-flex h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-pill border border-volt ${savePadding} font-mono text-[11px] uppercase tracking-widest text-volt sm:text-xs`}
      >
        {t.activities.admin.save}
      </button>
    </div>
  );
}
