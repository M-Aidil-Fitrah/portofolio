"use client";

import { useLocale } from "@/components/providers/LocaleProvider";

export function Footer() {
  const { t } = useLocale();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-hairline/60 px-6 py-6 sm:px-10">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-2 font-mono text-xs uppercase tracking-widest text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          &copy; {year} Muhammad Aidil Fitrah — {t.footer.rights}
        </p>
        <p>{t.contact.location}</p>
      </div>
    </footer>
  );
}
