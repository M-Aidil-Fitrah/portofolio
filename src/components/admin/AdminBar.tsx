"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "@/components/providers/LocaleProvider";
import { LangToggle } from "@/components/ui/LangToggle";
import { Logomark } from "@/components/ui/Logomark";

export function AdminBar() {
  const { t } = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const logout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      router.replace("/admin/login");
      router.refresh();
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-ink/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-6 sm:px-10">
        <Link href="/admin/activities" className="flex min-w-0 items-center gap-3">
          <Logomark className="h-7 w-6 shrink-0 text-volt" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold uppercase leading-none">
              AF Studio
            </span>
            <span className="mt-1 hidden font-mono text-[9px] uppercase tracking-widest text-muted sm:block">
              {t.admin.nav.workspace}
            </span>
          </span>
        </Link>

        <nav aria-label={t.admin.nav.label} className="hidden self-stretch md:flex">
          <Link
            href="/admin/activities"
            aria-current={pathname.startsWith("/admin/activities") ? "page" : undefined}
            className={`relative flex items-center px-5 font-mono text-[11px] uppercase tracking-widest transition-colors ${
              pathname.startsWith("/admin/activities")
                ? "text-foreground after:absolute after:inset-x-5 after:bottom-0 after:h-px after:bg-volt"
                : "text-muted hover:text-foreground"
            }`}
          >
            {t.admin.nav.activities}
          </Link>
        </nav>

        <div className="flex items-center gap-4 sm:gap-5">
          <span className="hidden items-center gap-2 font-mono text-[9px] uppercase tracking-widest text-muted lg:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-volt" aria-hidden="true" />
            {t.admin.nav.mockMode}
          </span>
          <a
            href="/activities"
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted transition-colors hover:text-volt sm:flex"
          >
            {t.admin.nav.viewSite}
            <ExternalIcon />
          </a>
          <LangToggle />
          <button
            type="button"
            onClick={logout}
            disabled={loggingOut}
            aria-label={t.admin.nav.logout}
            title={t.admin.nav.logout}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-hairline text-muted transition-colors hover:border-volt hover:text-volt disabled:cursor-wait disabled:opacity-50"
          >
            <LogoutIcon />
          </button>
        </div>
      </div>

      <div className="flex h-11 items-center justify-between border-t border-hairline/70 px-6 md:hidden">
        <Link
          href="/admin/activities"
          aria-current="page"
          className="flex h-full items-center border-b border-volt font-mono text-[10px] uppercase tracking-widest text-foreground"
        >
          {t.admin.nav.activities}
        </Link>
        <a
          href="/activities"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest text-muted"
        >
          {t.admin.nav.viewSite}
          <ExternalIcon />
        </a>
      </div>
    </header>
  );
}

function ExternalIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M7 4h9v9M16 4 8.5 11.5M14 11v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4" aria-hidden="true">
      <path d="M8 4H4.5A1.5 1.5 0 0 0 3 5.5v9A1.5 1.5 0 0 0 4.5 16H8M12.5 6.5 16 10l-3.5 3.5M16 10H7" />
    </svg>
  );
}
