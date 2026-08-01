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

export interface UploadProgress {
  status: AssetStatus;
  /** Whole percent of bytes transferred, only meaningful while uploading. */
  percent: number;
  loaded: number;
  total: number;
}

export interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  signal?: AbortSignal;
}

export async function uploadActivityAsset(
  file: File,
  kind: MediaKind,
  { onProgress, signal }: UploadOptions = {},
) {
  const report = (status: AssetStatus, loaded: number, percent: number) => {
    onProgress?.({ status, percent, loaded, total: file.size });
  };

  signal?.throwIfAborted();
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
    report("uploading", 0, 0);
    // XHR, not fetch: only XHR reports upload progress.
    await putObject(presigned.upload_url, file, signal, (loaded, total) => {
      const percent = total > 0 ? Math.floor((loaded / total) * 100) : 0;
      report("uploading", loaded, Math.min(percent, 100));
    });

    report("queued", file.size, 100);
    let asset = await completeAdminAssetUpload(assetId);
    const deadline = Date.now() + PROCESSING_TIMEOUT_MS;
    while (asset.status === "queued" || asset.status === "processing") {
      report(asset.status, file.size, 100);
      if (Date.now() >= deadline) {
        throw new Error("Asset processing timed out.");
      }
      await wait(POLL_INTERVAL_MS, signal);
      asset = await getAdminAsset(assetId);
    }
    if (asset.status !== "ready") {
      throw new Error(asset.error_message || "Asset processing failed.");
    }
    report("ready", file.size, 100);
    return uploadedAsset(asset);
  } catch (error) {
    await deleteAdminAsset(assetId).catch(() => undefined);
    throw error;
  }
}

function putObject(
  url: string,
  file: File,
  signal: AbortSignal | undefined,
  onProgress: (loaded: number, total: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? abortError());
      return;
    }

    const request = new XMLHttpRequest();
    const abort = () => request.abort();
    const settle = (finish: () => void) => {
      signal?.removeEventListener("abort", abort);
      finish();
    };

    signal?.addEventListener("abort", abort, { once: true });
    request.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable) return;
      onProgress(event.loaded, event.total);
    });
    request.addEventListener("load", () => {
      settle(() => {
        if (request.status >= 200 && request.status < 300) {
          resolve();
          return;
        }
        reject(
          new Error(`Object upload failed with status ${request.status}.`),
        );
      });
    });
    request.addEventListener("error", () => {
      settle(() => reject(new Error("Object upload failed.")));
    });
    request.addEventListener("timeout", () => {
      settle(() => reject(new Error("Object upload timed out.")));
    });
    request.addEventListener("abort", () => {
      settle(() => reject(signal?.reason ?? abortError()));
    });

    request.open("PUT", url);
    if (file.type) request.setRequestHeader("Content-Type", file.type);
    request.send(file);
  });
}

function abortError() {
  return new DOMException("Asset upload was aborted.", "AbortError");
}

function uploadedAsset(asset: MediaAsset): UploadedAsset {
  // Not linked to a published activity yet, so only the admin route serves it.
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

function wait(milliseconds: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? abortError());
      return;
    }
    const timer = window.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, milliseconds);
    const onAbort = () => {
      window.clearTimeout(timer);
      reject(signal?.reason ?? abortError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
