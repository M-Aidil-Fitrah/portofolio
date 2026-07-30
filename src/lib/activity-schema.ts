import { z } from "zod";

export const activityCategorySchema = z.enum([
  "project",
  "learning",
  "daily",
  "achievement",
]);
export const activityStatusSchema = z.enum(["published", "draft", "hidden"]);
export const activityProgressSchema = z.enum([
  "learning",
  "shipped",
  "exploring",
]);
export const activityAssetStatusSchema = z.enum([
  "queued",
  "uploading",
  "processing",
  "ready",
  "failed",
]);
export const activityContentLocaleSchema = z.enum(["en", "id"]);
export const activityCoverTemplateSchema = z.enum([
  "none",
  "editorial",
  "project",
  "achievement",
  "custom",
]);

export const localizedActivityTextSchema = z.object({
  en: z.string(),
  id: z.string(),
});

const cropAreaSchema = z.object({
  x: z.number().finite().min(0).max(100),
  y: z.number().finite().min(0).max(100),
  width: z.number().finite().positive().max(100),
  height: z.number().finite().positive().max(100),
});

export const activityCropSchema = z.object({
  position: z.object({
    x: z.number().finite(),
    y: z.number().finite(),
  }),
  area: cropAreaSchema,
  zoom: z.number().finite().positive(),
  rotation: z.number().finite().min(-360).max(360),
  aspectRatio: z.number().finite().positive(),
});

const activityVisualAssetSchema = z.object({
  id: z.string().min(1).optional(),
  src: z.string().min(1).optional(),
  originalSrc: z.string().min(1).optional(),
  alt: z.string(),
  caption: localizedActivityTextSchema.optional(),
  status: activityAssetStatusSchema.optional(),
  error: z.string().optional(),
});

export const activityImageSchema = activityVisualAssetSchema.extend({
  type: z.literal("image"),
  crop: activityCropSchema.optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

export const activityVideoSchema = activityVisualAssetSchema.extend({
  type: z.literal("video"),
  poster: z.string().min(1).optional(),
  posterOriginalSrc: z.string().min(1).optional(),
  posterCrop: activityCropSchema.optional(),
  duration: z.number().finite().nonnegative().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

export const activityMediaSchema = z.discriminatedUnion("type", [
  activityImageSchema,
  activityVideoSchema,
]);

export const activityCoverSchema = z.object({
  id: z.string().min(1).optional(),
  src: z.string().min(1).optional(),
  originalSrc: z.string().min(1).optional(),
  alt: z.string(),
  template: activityCoverTemplateSchema,
  customOverlaySrc: z.string().min(1).optional(),
  crop: activityCropSchema.optional(),
  status: activityAssetStatusSchema.optional(),
  error: z.string().optional(),
});

export const activityDocumentSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().int().nonnegative(),
  originalSrc: z.string().min(1).optional(),
  downloadSrc: z.string().min(1).optional(),
  previewSrc: z.string().min(1).optional(),
  thumbnailSrc: z.string().min(1).optional(),
  pageCount: z.number().int().positive().optional(),
  status: activityAssetStatusSchema,
  error: z.string().optional(),
});

export const activityAttachmentSchema = activityDocumentSchema.extend({
  id: z.string().min(1).optional(),
  type: z.literal("document"),
  label: localizedActivityTextSchema,
});

export const activityCommentSchema = z.object({
  id: z.string().min(1),
  author: z.string(),
  body: z.string(),
  date: z.string().min(1),
});

const activitySlugSchema = z
  .string()
  .max(72)
  .regex(/^(?:[a-z0-9]+(?:-[a-z0-9]+)*)?$/);

const currentActivitySchema = z.object({
  slug: activitySlugSchema,
  title: localizedActivityTextSchema,
  caption: localizedActivityTextSchema,
  body: localizedActivityTextSchema,
  category: activityCategorySchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tags: z.array(z.string()),
  cover: activityCoverSchema.nullable(),
  media: z.array(activityMediaSchema),
  attachments: z.array(activityAttachmentSchema),
  status: activityStatusSchema,
  pinned: z.boolean().optional(),
  progress: activityProgressSchema.optional(),
  relatedProject: z.string().optional(),
  likes: z.number().int().nonnegative(),
  comments: z.array(activityCommentSchema),
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function coverAltFromLegacyActivity(value: Record<string, unknown>) {
  if (!isRecord(value.title)) return "";
  if (typeof value.title.id === "string" && value.title.id) return value.title.id;
  return typeof value.title.en === "string" ? value.title.en : "";
}

function migrateLegacyActivity(value: unknown) {
  if (!isRecord(value)) return value;

  const legacyCover =
    typeof value.cover === "string"
      ? {
          src: value.cover,
          originalSrc: value.cover,
          alt: coverAltFromLegacyActivity(value),
          template: "none",
        }
      : value.cover;

  return {
    ...value,
    cover: legacyCover ?? null,
    attachments:
      value.attachments ?? (Array.isArray(value.documents) ? value.documents : []),
  };
}

/**
 * The preprocessor is the compatibility boundary for activity data persisted
 * before cover and document attachments were introduced.
 */
export const activitySchema = z.preprocess(
  migrateLegacyActivity,
  currentActivitySchema
);
export const activityListSchema = z.array(activitySchema);

const currentActivityDraftRecoverySchema = z.object({
  version: z.literal(2),
  selectedSlug: z.string().nullable(),
  draft: activitySchema,
  contentLocale: activityContentLocaleSchema,
  savedAt: z.string().min(1),
});

function migrateLegacyDraftRecovery(value: unknown) {
  if (
    !isRecord(value) ||
    (value.version !== 1 && value.version !== 2)
  ) {
    return value;
  }

  return {
    ...value,
    version: 2,
  };
}

export const activityDraftRecoverySchema = z.preprocess(
  migrateLegacyDraftRecovery,
  currentActivityDraftRecoverySchema
);

export function parseActivity(value: unknown) {
  return activitySchema.parse(value);
}

export function parseActivityList(value: unknown) {
  return activityListSchema.parse(value);
}

export type ActivityCategory = z.infer<typeof activityCategorySchema>;
export type ActivityStatus = z.infer<typeof activityStatusSchema>;
export type ActivityProgress = z.infer<typeof activityProgressSchema>;
export type ActivityAssetStatus = z.infer<typeof activityAssetStatusSchema>;
export type ActivityContentLocale = z.infer<
  typeof activityContentLocaleSchema
>;
export type ActivityCoverTemplate = z.infer<
  typeof activityCoverTemplateSchema
>;
export type ActivityCrop = z.infer<typeof activityCropSchema>;
export type ActivityImage = z.infer<typeof activityImageSchema>;
export type ActivityVideo = z.infer<typeof activityVideoSchema>;
export type MediaAsset = z.infer<typeof activityMediaSchema>;
export type ActivityCover = z.infer<typeof activityCoverSchema>;
export type ActivityDocument = z.infer<typeof activityDocumentSchema>;
export type ActivityAttachment = z.infer<typeof activityAttachmentSchema>;
export type ActivityComment = z.infer<typeof activityCommentSchema>;
export type ActivityPost = z.infer<typeof activitySchema>;
export type ActivityDraftRecovery = z.infer<
  typeof activityDraftRecoverySchema
>;
