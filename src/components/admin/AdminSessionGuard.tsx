"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useLocale } from "@/components/providers/LocaleProvider";
import { ADMIN_SESSION_EXPIRED_EVENT } from "@/lib/admin-session-client";

const SESSION_TOAST_ID = "admin-session-expired";

export function AdminSessionGuard() {
  const { t } = useLocale();
  const router = useRouter();
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleExpiry = () => {
      if (redirectTimer.current) return;

      toast.error(t.admin.sessionExpired, {
        id: SESSION_TOAST_ID,
        description: t.admin.sessionExpiredHint,
        duration: 6000,
      });
      redirectTimer.current = setTimeout(() => {
        router.replace("/admin/login?reason=session-expired");
        router.refresh();
      }, 900);
    };

    window.addEventListener(ADMIN_SESSION_EXPIRED_EVENT, handleExpiry);
    return () => {
      window.removeEventListener(ADMIN_SESSION_EXPIRED_EVENT, handleExpiry);
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, [router, t]);

  return null;
}
