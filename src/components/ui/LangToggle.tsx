"use client";

import { useLocale } from "@/components/providers/LocaleProvider";

export function LangToggle() {
  const { locale, toggleLocale, t } = useLocale();

  return (
    <button
      type="button"
      onClick={toggleLocale}
      aria-pressed={locale === "id"}
      aria-label={t.nav.langToggleLabel}
      className="group relative flex items-center gap-1 font-mono text-xs uppercase tracking-widest text-muted transition-colors hover:text-foreground"
    >
      <span
        className={locale === "en" ? "text-volt" : undefined}
        aria-hidden="true"
      >
        EN
      </span>
      <span aria-hidden="true">/</span>
      <span
        className={locale === "id" ? "text-volt" : undefined}
        aria-hidden="true"
      >
        ID
      </span>
    </button>
  );
}
