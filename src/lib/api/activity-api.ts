import type {
  Activity as ApiActivity,
  ActivityAsset,
  ActivityAssetWrite,
  ActivityWrite,
} from "@/lib/api/generated/models";
import {
  createAdminActivity,
  deleteAdminActivity,
  listAdminActivities,
  updateAdminActivity,
} from "@/lib/api/generated/endpoints/admin-activities/admin-activities";
import {
  getPublicActivity,
  listPublicActivities,
} from "@/lib/api/generated/endpoints/activities/activities";
import {
  GetPublicActivityResponse,
  ListAdminActivitiesResponse,
  ListPublicActivitiesResponse,
} from "@/lib/api/generated/schemas";
import { resolveApiUrl } from "@/lib/api/fetcher";
import type {
  ActivityAttachment,
  ActivityCover,
  ActivityCoverTemplate,
  ActivityCrop,
  ActivityPost,
  MediaAsset,
} from "@/lib/activity-schema";

export const ADMIN_ACTIVITIES_QUERY_KEY = ["activities", "admin"] as const;
export const PUBLIC_ACTIVITIES_QUERY_KEY = ["activities", "public"] as const;

interface ActivityApiMetadata {
  id: string;
  version: number;
}

const metadataBySlug = new Map<string, ActivityApiMetadata>();

export function getActivityApiMetadata(slug: string) {
  return metadataBySlug.get(slug);
}

function rememberActivity(activity: ApiActivity) {
  if (activity.slug) {
    metadataBySlug.set(activity.slug, {
      id: activity.id,
      version: activity.version,
    });
  }
}

function apiAssetUrl(value: string | null | undefined) {
  return value ? resolveApiUrl(value) : undefined;
}

function coverFromAsset(asset: ActivityAsset): ActivityCover {
  const template = asset.metadata?.template;
  return {
    id: asset.asset_id,
    src: apiAssetUrl(asset.src),
    originalSrc: apiAssetUrl(asset.src),
    alt: asset.alt,
    template: isCoverTemplate(template) ? template : "none",
    crop: parseCrop(asset.crop),
    status: asset.status,
  };
}

function mediaFromAsset(asset: ActivityAsset): MediaAsset {
  const common = {
    id: asset.asset_id,
    src: apiAssetUrl(asset.src),
    originalSrc: apiAssetUrl(asset.src),
    alt: asset.alt,
    caption: asset.caption,
    status: asset.status,
    width: asset.width ?? undefined,
    height: asset.height ?? undefined,
  };
  if (asset.kind === "video") {
    return {
      ...common,
      type: "video",
      poster: apiAssetUrl(asset.poster_src),
      duration:
        asset.duration_ms === null || asset.duration_ms === undefined
          ? undefined
          : asset.duration_ms / 1000,
    };
  }
  return {
    ...common,
    type: "image",
    crop: parseCrop(asset.crop),
  };
}

function attachmentFromAsset(asset: ActivityAsset): ActivityAttachment {
  return {
    id: asset.asset_id,
    type: "document",
    filename: asset.filename,
    mimeType: asset.mime_type,
    size: asset.byte_size,
    originalSrc: apiAssetUrl(asset.download_src),
    downloadSrc: apiAssetUrl(asset.download_src),
    previewSrc: apiAssetUrl(asset.preview_src),
    thumbnailSrc: apiAssetUrl(asset.thumbnail_src),
    pageCount: asset.page_count ?? undefined,
    status: asset.status,
    label: asset.label,
  };
}

function activityPostFromApi(activity: ApiActivity): ActivityPost {
  rememberActivity(activity);
  const ordered = [...activity.assets].sort(
    (left, right) => left.position - right.position,
  );
  const coverAsset = ordered.find((asset) => asset.role === "cover");
  return {
    slug: activity.slug ?? "",
    title: activity.title,
    caption: activity.caption,
    body: activity.body,
    category: activity.category,
    date: activity.date,
    tags: activity.tags,
    cover: coverAsset ? coverFromAsset(coverAsset) : null,
    media: ordered
      .filter((asset) => asset.role === "gallery")
      .map(mediaFromAsset),
    attachments: ordered
      .filter((asset) => asset.role === "attachment")
      .map(attachmentFromAsset),
    status: activity.status,
    pinned: activity.pinned,
    progress: activity.progress ?? undefined,
    relatedProject: activity.related_project ?? undefined,
    likes: 0,
    comments: [],
  };
}

async function listAll(
  fetchPage: (
    offset: number,
  ) => Promise<{ items: ApiActivity[]; total: number }>,
) {
  const posts: ActivityPost[] = [];
  let offset = 0;
  while (true) {
    const page = await fetchPage(offset);
    posts.push(...page.items.map(activityPostFromApi));
    offset += page.items.length;
    if (page.items.length === 0 || offset >= page.total) return posts;
  }
}

export function getApiPublishedActivities() {
  return listAll(async (offset) => {
    const value = await listPublicActivities({ limit: 50, offset });
    return ListPublicActivitiesResponse.parse(value);
  });
}

export function getApiAdminActivities() {
  return listAll(async (offset) => {
    const value = await listAdminActivities({ limit: 50, offset });
    return ListAdminActivitiesResponse.parse(value);
  });
}

export async function getApiPublishedActivity(slug: string) {
  const value = await getPublicActivity(slug);
  return activityPostFromApi(GetPublicActivityResponse.parse(value));
}

export async function saveApiActivity(
  post: ActivityPost,
  currentSlug?: string,
) {
  const metadata = currentSlug
    ? metadataBySlug.get(currentSlug)
    : metadataBySlug.get(post.slug);
  const payload = activityWriteFromPost(post);
  const saved = metadata
    ? await updateAdminActivity(metadata.id, {
        ...payload,
        version: metadata.version,
      })
    : await createAdminActivity(payload);
  if (currentSlug && currentSlug !== saved.slug) {
    metadataBySlug.delete(currentSlug);
  }
  return activityPostFromApi(saved);
}

export async function deleteApiActivity(slug: string) {
  const metadata = metadataBySlug.get(slug);
  if (!metadata) throw new Error("Activity API metadata is unavailable.");
  await deleteAdminActivity(metadata.id);
  metadataBySlug.delete(slug);
}

function activityWriteFromPost(post: ActivityPost): ActivityWrite {
  return {
    slug: post.slug || null,
    title: post.title,
    caption: post.caption,
    body: post.body,
    category: post.category,
    date: post.date,
    tags: post.tags,
    status: post.status,
    pinned: Boolean(post.pinned),
    progress: post.progress ?? null,
    related_project: post.relatedProject ?? null,
    assets: activityAssetWrites(post),
  };
}

function activityAssetWrites(post: ActivityPost): ActivityAssetWrite[] {
  const assets: ActivityAssetWrite[] = [];
  if (post.cover?.id) {
    assets.push({
      asset_id: post.cover.id,
      role: "cover",
      position: 0,
      alt: post.cover.alt,
      caption: { en: "", id: "" },
      label: { en: "", id: "" },
      crop: post.cover.crop ?? null,
      metadata: { template: post.cover.template },
    });
  }
  post.media.forEach((media, position) => {
    if (!media.id) return;
    assets.push({
      asset_id: media.id,
      role: "gallery",
      position,
      alt: media.alt,
      caption: media.caption ?? { en: "", id: "" },
      label: { en: "", id: "" },
      crop: media.type === "image" ? media.crop ?? null : null,
      metadata:
        media.type === "video" && media.posterCrop
          ? { poster_crop: media.posterCrop }
          : {},
    });
  });
  post.attachments.forEach((attachment, position) => {
    if (!attachment.id) return;
    assets.push({
      asset_id: attachment.id,
      role: "attachment",
      position,
      alt: "",
      caption: { en: "", id: "" },
      label: attachment.label,
      crop: null,
      metadata: {},
    });
  });
  return assets;
}

function parseCrop(value: unknown): ActivityCrop | undefined {
  if (!value || typeof value !== "object") return undefined;
  return value as ActivityCrop;
}

function isCoverTemplate(value: unknown): value is ActivityCoverTemplate {
  return (
    value === "none" ||
    value === "editorial" ||
    value === "project" ||
    value === "achievement" ||
    value === "custom"
  );
}
