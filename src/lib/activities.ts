import type { ActivityCategory } from "@/lib/activity-schema";

export type {
  ActivityAssetStatus,
  ActivityAttachment,
  ActivityCategory,
  ActivityComment,
  ActivityCover,
  ActivityCoverTemplate,
  ActivityCrop,
  ActivityDocument,
  ActivityImage,
  ActivityPost,
  ActivityProgress,
  ActivityStatus,
  ActivityVideo,
  MediaAsset,
} from "@/lib/activity-schema";

export const ACTIVITY_CATEGORIES: ActivityCategory[] = [
  "project",
  "learning",
  "daily",
  "achievement",
];
