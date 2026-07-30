import {
  activityDraftRecoverySchema,
  type ActivityDraftRecovery,
} from "@/lib/activity-schema";

const RECOVERY_KEY = "portfolio-activity-draft-recovery-v1";

export type { ActivityDraftRecovery } from "@/lib/activity-schema";

export function readActivityDraftRecovery(): ActivityDraftRecovery | null {
  try {
    const parsed = activityDraftRecoverySchema.safeParse(
      JSON.parse(window.localStorage.getItem(RECOVERY_KEY) ?? "null")
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function writeActivityDraftRecovery(
  recovery: Omit<ActivityDraftRecovery, "version" | "savedAt">
) {
  try {
    const value: ActivityDraftRecovery = {
      version: 2,
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
