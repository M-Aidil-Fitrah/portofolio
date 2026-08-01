"use client";

import { useLocale } from "@/components/providers/LocaleProvider";

/**
 * Rendered with spans only: the media tile places it inside a button, where a
 * div would be invalid markup.
 */
export function UploadProgressBar({
  percent,
  className = "",
}: {
  percent: number;
  className?: string;
}) {
  const { t } = useLocale();
  const value = Math.min(100, Math.max(0, Math.round(percent)));
  const readout = t.activities.admin.uploadPercent.replace(
    "{percent}",
    String(value)
  );

  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <span
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t.activities.admin.uploadProgressLabel.replace(
          "{percent}",
          String(value)
        )}
        className="block h-0.5 flex-1 bg-hairline"
      >
        <span
          className="block h-full bg-volt transition-[width] duration-150 ease-out"
          style={{ width: `${value}%` }}
        />
      </span>
      <span className="shrink-0 font-mono text-[9px] uppercase tabular-nums tracking-widest text-volt">
        {readout}
      </span>
    </span>
  );
}
