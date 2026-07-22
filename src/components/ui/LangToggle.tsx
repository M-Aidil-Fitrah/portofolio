"use client";

import { useLocale } from "@/components/providers/LocaleProvider";

export function LangToggle() {
  const { locale, toggleLocale, t } = useLocale();

  return (
    <button
      type="button"
      onClick={toggleLocale}
      aria-label={t.nav.langToggleLabel}
      data-cursor={t.nav.langToggleLabel}
      className="group relative inline-flex h-10 items-center gap-2 rounded-pill border border-hairline bg-ink/80 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-foreground transition-all duration-200 hover:border-volt/50"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0 text-muted transition-colors group-hover:text-volt"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
        <path d="M2 12h20" />
      </svg>
      <div className="flex items-center gap-0.5 rounded-pill bg-white/5 p-0.5">
        <span
          className={`rounded-pill px-2 py-0.5 font-semibold leading-none transition-all duration-300 ${
            locale === "en"
              ? "bg-volt text-ink shadow-sm"
              : "text-muted group-hover:text-foreground"
          }`}
        >
          EN
        </span>
        <span
          className={`rounded-pill px-2 py-0.5 font-semibold leading-none transition-all duration-300 ${
            locale === "id"
              ? "bg-volt text-ink shadow-sm"
              : "text-muted group-hover:text-foreground"
          }`}
        >
          ID
        </span>
      </div>
    </button>
  );
}
