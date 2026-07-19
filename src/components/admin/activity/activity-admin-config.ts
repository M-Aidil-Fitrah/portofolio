import type {
  ActivityPost,
  ActivityProgress,
  ActivityStatus,
  MediaAsset,
} from "@/lib/activities";

export const MAX_MEDIA = 4;
export const MAX_FILE_SIZE = 3 * 1024 * 1024;
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

export type ContentLocale = "en" | "id";
export type AdminFeedback =
  | "saved"
  | "storage"
  | "validation"
  | "slug"
  | "media"
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
    media: [],
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

export function activityMediaFilesAreValid(
  files: File[],
  currentCount: number
) {
  return (
    currentCount + files.length <= MAX_MEDIA &&
    files.every(
      (file) =>
        file.size <= MAX_FILE_SIZE &&
        (file.type.startsWith("image/") || file.type.startsWith("video/"))
    )
  );
}

export async function activityMediaFromFiles(files: File[]) {
  return Promise.all(
    files.map(async (file): Promise<MediaAsset> => ({
      type: file.type.startsWith("video/") ? "video" : "image",
      src: await fileToDataUrl(file),
      alt: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "),
    }))
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
