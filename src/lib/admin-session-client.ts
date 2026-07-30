export const ADMIN_SESSION_EXPIRED_EVENT = "portfolio-admin-session-expired";

export function announceAdminSessionExpiry() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ADMIN_SESSION_EXPIRED_EVENT));
}
