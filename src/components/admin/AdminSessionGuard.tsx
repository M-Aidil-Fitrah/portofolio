"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useLocale } from "@/components/providers/LocaleProvider";
import {
  getAdminSession,
  refreshAdminSession,
} from "@/lib/api/generated/endpoints/admin-auth/admin-auth";
import { ADMIN_SESSION_EXPIRED_EVENT } from "@/lib/admin-session-client";

const SESSION_TOAST_ID = "admin-session-expired";
const REFRESH_EARLY_MS = 60_000;

export function AdminSessionGuard({ children }: { children: ReactNode }) {
  const { t } = useLocale();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const redirecting = useRef(false);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleRefreshRef = useRef<(expiresAt: string) => void>(() => {});

  const redirectToLogin = useCallback(() => {
    if (redirecting.current) return;
    redirecting.current = true;
    toast.error(t.admin.sessionExpired, {
      id: SESSION_TOAST_ID,
      description: t.admin.sessionExpiredHint,
      duration: 6000,
    });
    window.setTimeout(() => {
      router.replace("/admin/login?reason=session-expired");
      router.refresh();
    }, 900);
  }, [router, t]);

  const scheduleRefresh = useCallback(
    (expiresAt: string) => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      const delay = Math.max(
        1_000,
        new Date(expiresAt).getTime() - Date.now() - REFRESH_EARLY_MS,
      );
      refreshTimer.current = setTimeout(async () => {
        try {
          const session = await refreshAdminSession();
          scheduleRefreshRef.current(session.expires_at);
        } catch {
          redirectToLogin();
        }
      }, delay);
    },
    [redirectToLogin],
  );
  useEffect(() => {
    scheduleRefreshRef.current = scheduleRefresh;
  }, [scheduleRefresh]);

  useEffect(() => {
    let active = true;
    const verify = async () => {
      try {
        let session;
        try {
          session = await getAdminSession();
        } catch {
          session = await refreshAdminSession();
        }
        if (!active) return;
        scheduleRefresh(session.expires_at);
        setReady(true);
      } catch {
        if (active) redirectToLogin();
      }
    };
    void verify();

    const handleExpiry = () => redirectToLogin();
    window.addEventListener(ADMIN_SESSION_EXPIRED_EVENT, handleExpiry);
    return () => {
      active = false;
      window.removeEventListener(ADMIN_SESSION_EXPIRED_EVENT, handleExpiry);
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [redirectToLogin, scheduleRefresh]);

  if (!ready) {
    return (
      <div
        role="status"
        aria-label="Checking administrator session"
        className="grid min-h-screen place-items-center bg-ink font-mono text-xs uppercase tracking-widest text-muted"
      >
        Authenticating…
      </div>
    );
  }

  return children;
}
