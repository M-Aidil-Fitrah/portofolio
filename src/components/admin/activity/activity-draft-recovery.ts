import type { ActivityPost } from "@/lib/activities";
import type { ContentLocale } from "./activity-admin-config";

const RECOVERY_KEY = "portfolio-activity-draft-recovery-v1";

export interface ActivityDraftRecovery {
  version: 1;
  selectedSlug: string | null;
  draft: ActivityPost;
  contentLocale: ContentLocale;
  savedAt: string;
}

export function readActivityDraftRecovery(): ActivityDraftRecovery | null {
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(RECOVERY_KEY) ?? "null"
    ) as ActivityDraftRecovery | null;
    if (
      parsed?.version !== 1 ||
      !parsed.draft ||
      !Array.isArray(parsed.draft.media) ||
      (parsed.contentLocale !== "en" && parsed.contentLocale !== "id")
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeActivityDraftRecovery(
  recovery: Omit<ActivityDraftRecovery, "version" | "savedAt">
) {
  try {
    const value: ActivityDraftRecovery = {
      version: 1,
      savedAt: new Date().toISOString(),
      ...recovery,
    };
    window.localStorage.setItem(RECOVERY_KEY, JSON.stringify(value));
  } catch {
    // The normal save path reports quota errors; recovery is best effort.
  }
}

export function clearActivityDraftRecovery() {
  window.localStorage.removeItem(RECOVERY_KEY);
}
