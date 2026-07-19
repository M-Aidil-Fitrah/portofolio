"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/providers/LocaleProvider";
import { LangToggle } from "@/components/ui/LangToggle";
import { Logomark } from "@/components/ui/Logomark";

export function AdminBar() {
  const { t } = useLocale();
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
    <header className="sticky top-0 z-50 bg-ink/95 px-6 backdrop-blur-sm sm:px-10">
      <div className="mx-auto grid h-20 max-w-[1500px] grid-cols-[1fr_auto_1fr] items-center border-b border-hairline">
        <Link
          href="/admin/activities"
          aria-label="AF Admin"
          className="flex w-fit items-center gap-3 text-foreground transition-colors hover:text-volt"
        >
          <Logomark className="h-7 w-6 shrink-0" />
          <span className="font-mono text-[11px] uppercase tracking-widest">
            AF / Admin
          </span>
        </Link>

        <nav aria-label={t.admin.nav.label} className="h-full">
          <Link
            href="/admin/activities"
            aria-current="page"
            className="relative flex h-full items-center px-2 font-mono text-[10px] uppercase tracking-widest text-foreground after:absolute after:inset-x-2 after:bottom-0 after:h-px after:bg-volt sm:px-5 sm:text-[11px] sm:after:inset-x-5"
          >
            {t.admin.nav.activities}
          </Link>
        </nav>

        <div className="flex items-center gap-3 justify-self-end sm:gap-5">
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
    </header>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4" aria-hidden="true">
      <path d="M8 4H4.5A1.5 1.5 0 0 0 3 5.5v9A1.5 1.5 0 0 0 4.5 16H8M12.5 6.5 16 10l-3.5 3.5M16 10H7" />
    </svg>
  );
}
