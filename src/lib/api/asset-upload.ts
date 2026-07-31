import {
  completeAdminAssetUpload,
  deleteAdminAsset,
  getAdminAsset,
  presignAdminAssetUpload,
} from "@/lib/api/generated/endpoints/admin-assets/admin-assets";
import type {
  AssetStatus,
  MediaAsset,
  MediaKind,
} from "@/lib/api/generated/models";
import { resolveApiUrl } from "@/lib/api/fetcher";

const POLL_INTERVAL_MS = 1_000;
const PROCESSING_TIMEOUT_MS = 10 * 60 * 1_000;

export interface UploadedAsset {
  asset: MediaAsset;
  src: string;
  posterSrc?: string;
  previewSrc?: string;
  thumbnailSrc?: string;
  downloadSrc?: string;
}

export async function uploadActivityAsset(
  file: File,
  kind: MediaKind,
  onStatus?: (status: AssetStatus) => void,
) {
  const presigned = await presignAdminAssetUpload({
    kind,
    filename: file.name,
    mime_type:
      file.type ||
      (kind === "image"
        ? "image/unknown"
        : kind === "video"
          ? "video/unknown"
          : "application/octet-stream"),
    byte_size: file.size,
  });
  const assetId = presigned.asset.id;

  try {
    onStatus?.("uploading");
    const upload = await fetch(presigned.upload_url, {
      method: "PUT",
      headers: file.type ? { "Content-Type": file.type } : undefined,
      body: file,
    });
    if (!upload.ok) {
      throw new Error(`Object upload failed with status ${upload.status}.`);
    }

    onStatus?.("queued");
    let asset = await completeAdminAssetUpload(assetId);
    const deadline = Date.now() + PROCESSING_TIMEOUT_MS;
    while (asset.status === "queued" || asset.status === "processing") {
      onStatus?.(asset.status);
      if (Date.now() >= deadline) {
        throw new Error("Asset processing timed out.");
      }
      await wait(POLL_INTERVAL_MS);
      asset = await getAdminAsset(assetId);
    }
    if (asset.status !== "ready") {
      throw new Error(asset.error_message || "Asset processing failed.");
    }
    onStatus?.("ready");
    return uploadedAsset(asset);
  } catch (error) {
    await deleteAdminAsset(assetId).catch(() => undefined);
    throw error;
  }
}

function uploadedAsset(asset: MediaAsset): UploadedAsset {
  // A freshly uploaded asset is not linked to a published activity yet, so
  // only the authenticated streaming route will serve it.
  const base = `/api/v1/admin/assets/${asset.id}/content`;
  return {
    asset,
    src: resolveApiUrl(`${base}?variant=delivery`),
    posterSrc:
      asset.kind === "video"
        ? resolveApiUrl(`${base}?variant=poster`)
        : undefined,
    previewSrc:
      asset.kind === "document"
        ? resolveApiUrl(`${base}?variant=delivery`)
        : undefined,
    thumbnailSrc:
      asset.kind === "document"
        ? resolveApiUrl(`${base}?variant=thumbnail`)
        : undefined,
    downloadSrc:
      asset.kind === "document"
        ? resolveApiUrl(`${base}?variant=download`)
        : undefined,
  };
}

export async function deleteUploadedAsset(id: string) {
  await deleteAdminAsset(id);
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}
