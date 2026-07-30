import type {
  ActivityPost,
  ActivityProgress,
  ActivityStatus,
  MediaAsset,
} from "@/lib/activities";
import type { ActivityContentLocale } from "@/lib/activity-schema";

export const MAX_IMAGE_FILE_SIZE = 25 * 1024 * 1024;
export const MAX_VIDEO_FILE_SIZE = 250 * 1024 * 1024;
export const ACTIVITY_STATUSES: ActivityStatus[] = [
  "draft",
  "published",
  "hidden",
];
export const ACTIVITY_PROGRESS: ActivityProgress[] = [
  "learning",
  "shipped",
  "exploring",
];
export const ADMIN_INPUT_CLASS =
  "w-full border border-hairline bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-volt focus:outline-none";

export type ContentLocale = ActivityContentLocale;
export type AdminFeedback =
  | "saved"
  | "deleted"
  | "recovered"
  | "storage"
  | "validation"
  | "slug"
  | "media"
  | "poster"
  | null;
export type UpdateActivityDraft = (patch: Partial<ActivityPost>) => void;
export type UpdateLocalizedActivity = (
  field: "title" | "caption" | "body",
  language: ContentLocale,
  value: string
) => void;

export function createBlankActivity(): ActivityPost {
  return {
    slug: "",
    title: { en: "", id: "" },
    caption: { en: "", id: "" },
    body: { en: "", id: "" },
    category: "project",
    date: new Date().toISOString().slice(0, 10),
    tags: [],
    cover: null,
    media: [],
    attachments: [],
    status: "draft",
    pinned: false,
    likes: 0,
    comments: [],
  };
}

export function slugifyActivity(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

export function activityMediaFilesAreValid(files: File[]) {
  return files.every((file) => {
    const kind = activityMediaKind(file);
    if (kind === "image") {
      return file.size <= MAX_IMAGE_FILE_SIZE;
    }
    if (kind === "video") {
      return file.size <= MAX_VIDEO_FILE_SIZE;
    }
    return false;
  });
}

export function activityMediaKind(file: File): "image" | "video" | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (
    extension &&
    ["jpg", "jpeg", "png", "webp", "avif", "heic", "heif", "tif", "tiff", "bmp", "gif"].includes(
      extension,
    )
  ) {
    return "image";
  }
  if (
    extension &&
    ["mp4", "mov", "mkv", "webm", "avi", "m4v", "mpeg", "mpg", "3gp", "ogv", "mts", "m2ts"].includes(
      extension,
    )
  ) {
    return "video";
  }
  return null;
}

export async function activityMediaFromFiles(files: File[]) {
  return Promise.all(
    files.map(async (file): Promise<MediaAsset> => ({
      id: crypto.randomUUID(),
      type: activityMediaKind(file) === "video" ? "video" : "image",
      src: await activityFileToDataUrl(file),
      alt: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "),
      caption: { en: "", id: "" },
    }))
  );
}

export function activityPosterFileIsValid(file: File) {
  return file.size <= MAX_IMAGE_FILE_SIZE && activityMediaKind(file) === "image";
}

export function activityPosterFromFile(file: File) {
  return activityFileToDataUrl(file);
}

export function activityFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
